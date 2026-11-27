"use server";
// Carte de l'archipel : le MJ dessine les régions sur la carte de l'archipel, place les îles (sur l'archipel ou dans
// la carte d'une région), indique où mouille le Navire et la prochaine escale.
// La route se trace toute seule à partir des séances de la chronique rattachées à une île.

import { requireUser, canUseTool } from "@/lib/auth";
import { getChronicle, getGroups, getIslands, getRegions, getShops, randomUUID, updateDb, type Db, type Island, type Region, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { logActivity } from "@/lib/activity";
import { CARTE_TOOL_ID, centerOf, cleanMapImage, cleanPoints, isIsleColor, isIslandStatus, isRegionColor, REGION_COLORS, SEA_COLOR, type IslandStatusId } from "./meta";
import { routeOf } from "./route";

export type IslandView = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  status: IslandStatusId;
  description: string;
  /** Région de l'île (position en % de la carte de la région) ; null : sur la carte de l'archipel. */
  regionId: string | null;
  /** Séances vécues sur cette île (numéro dans la chronique). */
  visits: { number: number; title: string; date: string }[];
  shops: number;
};
export type RegionView = {
  id: string;
  name: string;
  color: string;
  status: IslandStatusId;
  description: string;
  /** Contour plat en % de la carte de l'archipel. */
  points: number[];
  center: { x: number; y: number };
  mapImage: string | null;
};
export type MapGroup = {
  id: string;
  name: string;
  islands: IslandView[];
  regions: RegionView[];
  /** Îles de la route, dans l'ordre des séances (sans répétition consécutive). */
  route: string[];
  harborId: string | null;
  nextId: string | null;
  /** Image de fond de la carte (absent : carte dessinée par le site). */
  mapImage: string | null;
};
export type MapView = { isAdmin: boolean; groups: MapGroup[] };
export type MapResult = { ok: true; view: MapView } | { ok: false; error: string };
export type IslandInput = { id?: string | null; groupId: string; regionId?: string | null; name: string; color: string; x: number; y: number; status: string; description: string };
export type RegionInput = { id?: string | null; groupId: string; name: string; color: string; status: string; description: string; points: number[]; mapImage: string | null };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, CARTE_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

const clamp = (n: unknown) => Math.min(96, Math.max(4, Math.round(Number(n) * 10) / 10 || 50));

async function view(user: User): Promise<MapView> {
  const [allGroups, islands, regions, sessions, shops] = await Promise.all([getGroups(), getIslands(), getRegions(), getChronicle(), getShops()]);
  const isAdmin = user.role === "admin";
  const groups: MapGroup[] = [];
  for (const g of visibleGroups(user, allGroups)) {
    const regs = regions.filter((r) => r.groupId === g.id && (isAdmin || r.status !== "hidden"));
    const regIds = new Set(regs.map((r) => r.id));
    // Une île d'une région cachée reste cachée aux joueurs.
    const visible = islands.filter((i) => i.groupId === g.id && (isAdmin || (i.status !== "hidden" && (!i.regionId || regIds.has(i.regionId)))));
    const ids = new Set(visible.map((i) => i.id));
    const ordered = sessions
      .filter((s) => s.groupId === g.id && (isAdmin || !s.draft))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    groups.push({
      id: g.id,
      name: g.name,
      islands: visible.map((i) => ({
        id: i.id,
        name: i.name,
        color: i.color,
        x: i.x,
        y: i.y,
        status: i.status,
        description: i.description,
        regionId: i.regionId && regIds.has(i.regionId) ? i.regionId : null,
        visits: ordered.flatMap((s, n) => (s.islandId === i.id ? [{ number: n + 1, title: s.title, date: s.date }] : [])),
        shops: shops.filter((s) => s.islandId === i.id).length,
      })),
      regions: regs.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        status: r.status,
        description: r.description,
        points: r.points,
        center: centerOf(r.points),
        mapImage: r.mapImage ?? null,
      })),
      route: routeOf(g.id, sessions, isAdmin, (id) => ids.has(id)),
      harborId: g.harborIslandId && ids.has(g.harborIslandId) ? g.harborIslandId : null,
      nextId: g.nextIslandId && ids.has(g.nextIslandId) ? g.nextIslandId : null,
      mapImage: g.mapImage ?? null,
    });
  }
  return { isAdmin, groups };
}

async function adminChange(fn: (db: Db) => string | null): Promise<MapResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb(fn);
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

export async function getMapAction(): Promise<MapView> {
  return view(await requireToolUser());
}

/** Crée (sans `id`) ou modifie une île. */
export async function saveIslandAction(input: IslandInput): Promise<MapResult> {
  const name = String(input?.name ?? "").trim().slice(0, 60);
  const description = String(input?.description ?? "").trim().slice(0, 1200);
  const color = isIsleColor(input?.color) ? input.color : SEA_COLOR;
  const status = isIslandStatus(input?.status) ? input.status : "seen";
  if (!name) return { ok: false, error: "Donne un nom à l'île." };
  const regionId = input?.regionId ? String(input.regionId) : null;
  return adminChange((db) => {
    if (!(db.groups ?? []).some((g) => g.id === input.groupId)) return "Groupe introuvable.";
    if (regionId && !(db.regions ?? []).some((r) => r.id === regionId && r.groupId === input.groupId)) return "Région introuvable.";
    const now = new Date().toISOString();
    const list = (db.islands ??= []);
    if (input.id) {
      const i = list.find((x) => x.id === input.id && x.groupId === input.groupId);
      if (!i) return "Île introuvable.";
      Object.assign(i, { name, description, color, status, regionId, x: clamp(input.x), y: clamp(input.y), updatedAt: now });
    } else {
      const island: Island = { id: randomUUID(), groupId: input.groupId, regionId, name, description, color, status, x: clamp(input.x), y: clamp(input.y), createdAt: now, updatedAt: now };
      list.push(island);
    }
    return null;
  });
}

/** Déplace une île (clic sur la carte). */
export async function moveIslandAction(id: string, x: number, y: number): Promise<MapResult> {
  return adminChange((db) => {
    const i = (db.islands ?? []).find((x) => x.id === id);
    if (!i) return "Île introuvable.";
    Object.assign(i, { x: clamp(x), y: clamp(y), updatedAt: new Date().toISOString() });
    return null;
  });
}

/** Supprime une île, ses échoppes, et la détache des séances. */
export async function deleteIslandAction(id: string): Promise<MapResult> {
  return adminChange((db) => {
    const island = (db.islands ?? []).find((i) => i.id === id);
    if (!island) return "Île introuvable.";
    db.islands = (db.islands ?? []).filter((i) => i.id !== id);
    db.shops = (db.shops ?? []).filter((s) => s.islandId !== id);
    for (const s of db.chronicle ?? []) if (s.islandId === id) s.islandId = null;
    for (const g of db.groups ?? []) {
      if (g.harborIslandId === id) g.harborIslandId = null;
      if (g.nextIslandId === id) g.nextIslandId = null;
    }
    return null;
  });
}

/** Le Navire jette l'ancre sur une île (ou reprend la mer avec `null`) : ses échoppes ouvrent, le site prend sa couleur. */
export async function setHarborAction(groupId: string, islandId: string | null): Promise<MapResult> {
  return adminChange((db) => {
    const g = (db.groups ?? []).find((x) => x.id === groupId);
    if (!g) return "Groupe introuvable.";
    if (islandId === null) {
      g.harborIslandId = null;
      logActivity(db, { groupId, kind: "harbor", text: "Le Navire a levé l'ancre et vogue en pleine mer.", href: "/outils/carte", key: "harbor" });
      return null;
    }
    const island = (db.islands ?? []).find((i) => i.id === islandId && i.groupId === groupId);
    if (!island) return "Île introuvable.";
    g.harborIslandId = island.id;
    if (g.nextIslandId === island.id) g.nextIslandId = null;
    island.status = "visited";
    logActivity(db, { groupId, kind: "harbor", text: `Le Navire a jeté l'ancre à ${island.name}.`, href: "/outils/carte", key: "harbor" });
    return null;
  });
}

/** Annonce la prochaine escale (`null` : aucune). */
export async function setNextAction(groupId: string, islandId: string | null): Promise<MapResult> {
  return adminChange((db) => {
    const g = (db.groups ?? []).find((x) => x.id === groupId);
    if (!g) return "Groupe introuvable.";
    if (islandId === null) {
      g.nextIslandId = null;
      return null;
    }
    const island = (db.islands ?? []).find((i) => i.id === islandId && i.groupId === groupId);
    if (!island) return "Île introuvable.";
    g.nextIslandId = island.id;
    if (island.status === "hidden") island.status = "seen";
    logActivity(db, { groupId, kind: "harbor", text: `Prochaine escale annoncée : ${island.name}.`, href: "/outils/carte", key: "next" });
    return null;
  });
}

/** Change l'image de fond de la carte d'un groupe (`null` : revenir à la carte dessinée par le site). */
export async function setMapImageAction(groupId: string, image: string | null): Promise<MapResult> {
  const clean = image === null ? null : cleanMapImage(image);
  if (image !== null && !clean) return { ok: false, error: "Image invalide : un chemin du site (/cartes/ma-carte.jpg) ou une adresse https." };
  return adminChange((db) => {
    const g = (db.groups ?? []).find((x) => x.id === groupId);
    if (!g) return "Groupe introuvable.";
    g.mapImage = clean;
    return null;
  });
}

/** Crée (sans `id`) ou modifie une région : son contour sur la carte de l'archipel et l'image de sa propre carte. */
export async function saveRegionAction(input: RegionInput): Promise<MapResult> {
  const name = String(input?.name ?? "").trim().slice(0, 60);
  const description = String(input?.description ?? "").trim().slice(0, 2000);
  const color = isRegionColor(input?.color) ? input.color : REGION_COLORS[0].id;
  const status = isIslandStatus(input?.status) ? input.status : "seen";
  const points = cleanPoints(input?.points);
  const rawImage = typeof input?.mapImage === "string" ? input.mapImage.trim() : "";
  const mapImage = rawImage ? cleanMapImage(rawImage) : null;
  if (!name) return { ok: false, error: "Donne un nom à la région." };
  if (!points) return { ok: false, error: "Le contour de la région doit avoir au moins 3 points." };
  if (rawImage && !mapImage) return { ok: false, error: "Image invalide : un chemin du site (/cartes/regions/ma-region.jpg) ou une adresse https." };
  return adminChange((db) => {
    if (!(db.groups ?? []).some((g) => g.id === input.groupId)) return "Groupe introuvable.";
    const now = new Date().toISOString();
    const list = (db.regions ??= []);
    if (input.id) {
      const r = list.find((x) => x.id === input.id && x.groupId === input.groupId);
      if (!r) return "Région introuvable.";
      Object.assign(r, { name, description, color, status, points, mapImage, updatedAt: now });
    } else {
      const region: Region = { id: randomUUID(), groupId: input.groupId, name, description, color, status, points, mapImage, createdAt: now, updatedAt: now };
      list.push(region);
    }
    return null;
  });
}

/** Supprime une région. Ses îles reviennent sur la carte de l'archipel, au centre de l'ancienne région. */
export async function deleteRegionAction(id: string): Promise<MapResult> {
  return adminChange((db) => {
    const region = (db.regions ?? []).find((r) => r.id === id);
    if (!region) return "Région introuvable.";
    const c = centerOf(region.points);
    for (const i of db.islands ?? [])
      if (i.regionId === id) Object.assign(i, { regionId: null, x: clamp(c.x), y: clamp(c.y), updatedAt: new Date().toISOString() });
    db.regions = (db.regions ?? []).filter((r) => r.id !== id);
    return null;
  });
}
