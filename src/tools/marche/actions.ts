"use server";
// Marché des escales : les échoppes de l'île où mouille le Navire. Le MJ les remplit, les joueurs y achètent
// avec les pièces de leur fiche ; l'objet s'ajoute à l'équipement. Le MJ peut annuler un achat (remboursement).

import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getGroups, getIslands, getPurchases, getShops, getUsers, randomUUID, updateDb, type Db, type ShopItem, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { forgetActivity, logActivity } from "@/lib/activity";
import type { CharacterState } from "@/tools/character/types";
import { MARCHE_TOOL_ID, formatCp, parsePrice, pay, refund, toCp } from "./meta";

export type ShopView = { id: string; islandId: string; islandName: string; name: string; kind: string; blurb: string; items: ShopItem[] };
export type PurchaseView = { id: string; who: string; character: string; shop: string; island: string; text: string; total: string; at: string; cancelled: boolean };
export type MarketGroup = {
  id: string;
  name: string;
  /** Île où mouille le Navire : ses échoppes sont ouvertes. */
  harbor: { id: string; name: string; color: string } | null;
  /** Joueur : échoppes de l'escale. MJ : toutes les échoppes du groupe. */
  shops: ShopView[];
  /** MJ : îles du groupe (pour rattacher une échoppe). */
  islands: { id: string; name: string }[];
  /** Joueur : son personnage en vie dans ce groupe. */
  character: { id: string; name: string; purseCp: number } | null;
  /** MJ : derniers achats (annulables). Joueur : ses derniers achats. */
  purchases: PurchaseView[];
};
export type MarketView = { isAdmin: boolean; groups: MarketGroup[] };
export type MarketResult = { ok: true; view: MarketView; message?: string } | { ok: false; error: string };
export type ShopInput = {
  id?: string | null;
  groupId: string;
  islandId: string;
  name: string;
  kind: string;
  blurb: string;
  items: { id?: string | null; name: string; desc: string; price: string; stock: string }[];
};

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, MARCHE_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<MarketView> {
  const [allGroups, islands, shops, purchases, chars, users] = await Promise.all([getGroups(), getIslands(), getShops(), getPurchases(), getCharacters(), getUsers()]);
  const isAdmin = user.role === "admin";
  const islandName = (id: string) => islands.find((i) => i.id === id)?.name ?? "?";
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? "Échoppe fermée";
  const toShop = (s: (typeof shops)[number]): ShopView => ({ id: s.id, islandId: s.islandId, islandName: islandName(s.islandId), name: s.name, kind: s.kind, blurb: s.blurb, items: s.items });

  return {
    isAdmin,
    groups: visibleGroups(user, allGroups).map((g) => {
      const harborIsland = islands.find((i) => i.id === g.harborIslandId && i.groupId === g.id);
      const mine = chars.find((c) => c.groupId === g.id && c.ownerId === user.id && !c.deadAt);
      const state = mine?.state as CharacterState | undefined;
      return {
        id: g.id,
        name: g.name,
        harbor: harborIsland ? { id: harborIsland.id, name: harborIsland.name, color: harborIsland.color } : null,
        shops: shops.filter((s) => s.groupId === g.id && (isAdmin || s.islandId === harborIsland?.id)).map(toShop),
        islands: isAdmin ? islands.filter((i) => i.groupId === g.id).map((i) => ({ id: i.id, name: i.name })) : [],
        character: !isAdmin && mine && state ? { id: mine.id, name: state.name, purseCp: toCp(state.coins) } : null,
        purchases: purchases
          .filter((p) => p.groupId === g.id && (isAdmin || p.userId === user.id))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, isAdmin ? 30 : 6)
          .map((p) => ({
            id: p.id,
            who: users.find((u) => u.id === p.userId)?.name ?? "?",
            character: (chars.find((c) => c.id === p.characterId)?.state as CharacterState | undefined)?.name ?? "?",
            shop: shopName(p.shopId),
            island: islandName(p.islandId),
            text: p.lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(", "),
            total: formatCp(p.totalCp),
            at: p.createdAt,
            cancelled: Boolean(p.cancelledAt),
          })),
      };
    }),
  };
}

export async function getMarketAction(): Promise<MarketView> {
  return view(await requireToolUser());
}

/** Achat immédiat : payé avec les pièces de la fiche, ajouté à son équipement. */
export async function buyAction(groupId: string, shopId: string, cart: { itemId: string; qty: number }[]): Promise<MarketResult> {
  const user = await requireToolUser();
  if (user.role === "admin") return { ok: false, error: "Le MJ n'achète pas : il tient les échoppes." };
  const wanted = (Array.isArray(cart) ? cart : []).map((l) => ({ itemId: String(l?.itemId ?? ""), qty: Math.floor(Number(l?.qty)) })).filter((l) => l.qty > 0);
  if (wanted.length === 0) return { ok: false, error: "Ton panier est vide." };
  if (wanted.some((l) => l.qty > 99)) return { ok: false, error: "99 exemplaires au plus par objet." };

  let message = "";
  const error = await updateDb((db) => {
    if (!(user.groupIds ?? []).includes(groupId)) return "Tu ne fais pas partie de ce groupe.";
    const group = (db.groups ?? []).find((g) => g.id === groupId);
    const shop = (db.shops ?? []).find((s) => s.id === shopId && s.groupId === groupId);
    if (!group || !shop) return "Échoppe introuvable.";
    if (group.harborIslandId !== shop.islandId) return "Cette échoppe est fermée : le Navire ne mouille plus sur son île.";
    const island = (db.islands ?? []).find((i) => i.id === shop.islandId);
    const character = (db.characters ?? []).find((c) => c.groupId === groupId && c.ownerId === user.id && !c.deadAt);
    if (!character) return "Il te faut un personnage en vie dans ce groupe pour acheter.";
    const state = character.state as CharacterState;

    const lines: { itemId: string; name: string; qty: number; priceCp: number }[] = [];
    for (const w of wanted) {
      const item = shop.items.find((i) => i.id === w.itemId);
      if (!item) return "Un objet n'est plus en vente. Recharge la page.";
      if (item.stock !== null && item.stock < w.qty) return `Plus assez de « ${item.name} » en stock (${item.stock}).`;
      lines.push({ itemId: item.id, name: item.name, qty: w.qty, priceCp: item.priceCp });
    }
    const total = lines.reduce((n, l) => n + l.priceCp * l.qty, 0);
    const purse = pay(state.coins, total);
    if (!purse) return `Ta bourse ne suffit pas : il manque ${formatCp(total - toCp(state.coins))}.`;

    for (const l of lines) {
      const item = shop.items.find((i) => i.id === l.itemId)!;
      if (item.stock !== null) item.stock -= l.qty;
    }
    const what = lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(", ");
    const equipmentLine = `• ${what} (${shop.name}, ${island?.name ?? "escale"})`;
    state.coins = purse;
    state.equipment = state.equipment.trim() ? `${state.equipment.trimEnd()}\n${equipmentLine}` : equipmentLine;
    const now = new Date().toISOString();
    character.updatedAt = now;
    const id = randomUUID();
    (db.purchases ??= []).push({ id, groupId, islandId: shop.islandId, shopId, userId: user.id, characterId: character.id, lines, totalCp: total, equipmentLine, createdAt: now });
    logActivity(db, { groupId, actorId: user.id, kind: "purchase", text: `${state.name} a acheté ${what} à ${shop.name}.`, href: "/outils/marche", key: `purchase:${id}` });
    message = `Achat effectué : ${what} pour ${formatCp(total)}. C'est dans l'équipement de ${state.name}.`;
    return null;
  });
  return error ? { ok: false, error } : { ok: true, view: await view(user), message };
}

async function adminChange(fn: (db: Db) => string | null): Promise<MarketResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb(fn);
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

/** MJ : annule un achat (rembourse, rend le stock, retire la ligne de l'équipement). */
export async function cancelPurchaseAction(id: string): Promise<MarketResult> {
  return adminChange((db) => {
    const p = (db.purchases ?? []).find((x) => x.id === id);
    if (!p) return "Achat introuvable.";
    if (p.cancelledAt) return "Achat déjà annulé.";
    const character = (db.characters ?? []).find((c) => c.id === p.characterId);
    if (character) {
      const state = character.state as CharacterState;
      state.coins = refund(state.coins, p.totalCp);
      state.equipment = state.equipment
        .split("\n")
        .filter((line) => line !== p.equipmentLine)
        .join("\n");
      character.updatedAt = new Date().toISOString();
    }
    const shop = (db.shops ?? []).find((s) => s.id === p.shopId);
    for (const l of p.lines) {
      const item = shop?.items.find((i) => i.id === l.itemId);
      if (item && item.stock !== null) item.stock += l.qty;
    }
    p.cancelledAt = new Date().toISOString();
    forgetActivity(db, p.groupId, `purchase:${p.id}`);
    return null;
  });
}

/** MJ : crée ou modifie une échoppe et sa marchandise. */
export async function saveShopAction(input: ShopInput): Promise<MarketResult> {
  const name = String(input?.name ?? "").trim().slice(0, 60);
  const kind = String(input?.kind ?? "").trim().slice(0, 60);
  const blurb = String(input?.blurb ?? "").trim().slice(0, 400);
  if (!name) return { ok: false, error: "Donne un nom à l'échoppe." };
  const raw = Array.isArray(input?.items) ? input.items.slice(0, 40) : [];
  const items: ShopItem[] = [];
  for (const it of raw) {
    const itemName = String(it?.name ?? "").trim().slice(0, 80);
    if (!itemName) continue;
    const priceCp = parsePrice(String(it?.price ?? ""));
    if (priceCp === null) return { ok: false, error: `Prix illisible pour « ${itemName} » (ex. 50, 0,5, 5 pa).` };
    const stockText = String(it?.stock ?? "").trim();
    const stock = stockText === "" ? null : Math.max(0, Math.min(999, Math.floor(Number(stockText))));
    if (stock !== null && Number.isNaN(stock)) return { ok: false, error: `Stock illisible pour « ${itemName} ».` };
    items.push({ id: it?.id ? String(it.id) : randomUUID(), name: itemName, desc: String(it?.desc ?? "").trim().slice(0, 200), priceCp, stock });
  }
  return adminChange((db) => {
    const island = (db.islands ?? []).find((i) => i.id === input.islandId && i.groupId === input.groupId);
    if (!island) return "Choisis l'île de l'échoppe (ajoute-la d'abord sur la carte).";
    const now = new Date().toISOString();
    const list = (db.shops ??= []);
    if (input.id) {
      const s = list.find((x) => x.id === input.id && x.groupId === input.groupId);
      if (!s) return "Échoppe introuvable.";
      Object.assign(s, { islandId: island.id, name, kind, blurb, items, updatedAt: now });
    } else {
      list.push({ id: randomUUID(), groupId: input.groupId, islandId: island.id, name, kind, blurb, items, createdAt: now, updatedAt: now });
      const group = (db.groups ?? []).find((g) => g.id === input.groupId);
      if (group?.harborIslandId === island.id) logActivity(db, { groupId: input.groupId, kind: "shop", text: `Nouvelle échoppe ouverte au port : ${name}.`, href: "/outils/marche" });
    }
    return null;
  });
}

export async function deleteShopAction(id: string): Promise<MarketResult> {
  return adminChange((db) => {
    db.shops = (db.shops ?? []).filter((s) => s.id !== id);
    return null;
  });
}
