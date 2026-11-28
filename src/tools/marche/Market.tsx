"use client";
// Marché des escales : les joueurs achètent dans les échoppes de l'île où mouille le Navire ;
// le MJ tient les échoppes de chaque île et peut annuler un achat.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { ToolPlayer } from "../registry";
import {
  buyAction,
  cancelPurchaseAction,
  deleteShopAction,
  getMarketAction,
  saveShopAction,
  type MarketGroup,
  type MarketResult,
  type MarketView,
  type ShopInput,
  type ShopView,
} from "./actions";
import { formatCp, priceInput } from "./meta";

type Run = (p: Promise<MarketResult>) => Promise<boolean>;
const when = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

export default function Market({ player, initial }: { player: ToolPlayer; initial?: MarketView }) {
  // Données préchargées par la page serveur : l'outil s'affiche dès le HTML, sans aller-retour.
  const [view, setView] = useState<MarketView | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    if (!initial)
      getMarketAction()
        .then(setView)
        .catch(() => setError("Impossible d'ouvrir le marché."));
  }, [initial]);

  const run: Run = (p) =>
    new Promise((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setView(r.view);
            setError(null);
            setNotice(r.message ?? null);
          } else {
            setError(r.error);
            setNotice(null);
          }
          resolve(r.ok);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(false);
        }
      });
    });

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">On ouvre les échoppes…</p>;
  if (view.groups.length === 0) return <p className="muted">{view.isAdmin ? "Crée d'abord un groupe de jeu dans l'administration." : "Tu ne fais partie d'aucun groupe."}</p>;
  const current = view.groups.find((g) => g.id === tab) ?? view.groups[0];

  return (
    <div className="stack-lg">
      <p className="muted">
        {view.isAdmin
          ? "Remplis les échoppes de chaque île. Elles ouvrent quand le Navire mouille sur leur île (outil Carte). Les achats sont immédiats ; tu peux en annuler un, le joueur est alors remboursé."
          : `Entre deux séances, fais tes emplettes au port, ${player.name}. Tu paies avec les pièces de ta fiche, l'objet rejoint ton équipement.`}
      </p>
      {view.groups.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Groupes">
          {view.groups.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current.id} className={`cs-group-tab${g.id === current.id ? " on" : ""}`} onClick={() => setTab(g.id)}>
              <span className="cs-group-tab-name">👥 {g.name}</span>
              <span className="muted small">{g.harbor ? `à ${g.harbor.name}` : "en mer"}</span>
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="flash flash-ok" role="status">
          {notice}
        </p>
      )}
      {view.isAdmin ? <AdminMarket key={current.id} group={current} busy={busy} run={run} /> : <PlayerMarket key={current.id} group={current} busy={busy} run={run} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Joueur */

function PlayerMarket({ group, busy, run }: { group: MarketGroup; busy: boolean; run: Run }) {
  const [shopId, setShopId] = useState<string | null>(group.shops[0]?.id ?? null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const shop = group.shops.find((s) => s.id === shopId) ?? group.shops[0];

  if (!group.harbor)
    return (
      <div className="card stack">
        <h2 className="subtitle">Le Navire est en pleine mer</h2>
        <p className="muted">Aucune échoppe n&apos;est ouverte. Le marché rouvrira à la prochaine escale.</p>
        <Link href="/outils/carte" className="btn btn-ghost btn-small" style={{ alignSelf: "flex-start" }}>
          Voir la carte
        </Link>
      </div>
    );

  const lines = shop ? shop.items.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ item: i, qty: cart[i.id] })) : [];
  const total = lines.reduce((n, l) => n + l.item.priceCp * l.qty, 0);
  const purse = group.character?.purseCp ?? 0;
  const short = total > purse;
  const setQty = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));

  return (
    <div className="stack-lg">
      <header className="mk-head" style={{ ["--isle-c" as string]: group.harbor.color }}>
        <div className="stack-xs">
          <h2 className="subtitle">Le port · {group.harbor.name}</h2>
          <span className="muted">Les échoppes ferment au départ du Navire.</span>
        </div>
        {group.character ? (
          <span className="mk-purse">
            <span className="muted small">Bourse de {group.character.name}</span>
            <strong className="num gold">{formatCp(purse)}</strong>
          </span>
        ) : (
          <span className="muted">Il te faut un personnage en vie dans ce groupe pour acheter.</span>
        )}
      </header>

      {group.shops.length === 0 ? (
        <p className="muted">Aucune échoppe sur cette île pour l&apos;instant.</p>
      ) : (
        <>
          <div className="mk-tabs" role="tablist" aria-label="Échoppes">
            {group.shops.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === shop?.id}
                className={`mk-tab${s.id === shop?.id ? " on" : ""}`}
                onClick={() => (setShopId(s.id), setCart({}))}
              >
                <strong>{s.name}</strong>
                <span className="muted small">{s.kind || `${s.items.length} objets`}</span>
              </button>
            ))}
          </div>

          {shop && (
            <div className="mk-layout">
              <section className="card stack" aria-labelledby="mk-shop">
                <div className="stack-xs">
                  <h3 id="mk-shop" className="subtitle">
                    {shop.name}
                  </h3>
                  {shop.blurb && <p className="muted">{shop.blurb}</p>}
                </div>
                {shop.items.length === 0 ? (
                  <p className="muted">Les étals sont vides.</p>
                ) : (
                  <ul className="mk-items">
                    {shop.items.map((it) => {
                      const qty = cart[it.id] ?? 0;
                      const out = it.stock === 0;
                      return (
                        <li key={it.id} className="mk-item">
                          <div className="stack-xs mk-item-text">
                            <strong>{it.name}</strong>
                            {it.desc && <span className="muted small">{it.desc}</span>}
                            {it.stock !== null && <span className="muted small">{out ? "Épuisé" : `${it.stock} en stock`}</span>}
                          </div>
                          <strong className="num gold mk-price">{formatCp(it.priceCp)}</strong>
                          {qty > 0 ? (
                            <span className="mk-stepper">
                              <button type="button" className="icon-btn" onClick={() => setQty(it.id, qty - 1)} aria-label={`Retirer un ${it.name}`}>
                                −
                              </button>
                              <span className="num">{qty}</span>
                              <button type="button" className="icon-btn" onClick={() => setQty(it.id, qty + 1)} disabled={it.stock !== null && qty >= it.stock} aria-label={`Ajouter un ${it.name}`}>
                                +
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => setQty(it.id, 1)} disabled={out || !group.character}>
                              Ajouter
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <aside className="card stack mk-cart" aria-labelledby="mk-cart">
                <h3 id="mk-cart" className="subtitle">
                  Mon panier
                </h3>
                {lines.length === 0 ? (
                  <p className="muted">Ajoute ce qu&apos;il te faut pour la prochaine traversée.</p>
                ) : (
                  <ul className="mk-lines">
                    {lines.map((l) => (
                      <li key={l.item.id}>
                        <span>
                          {l.item.name} <span className="muted num">×{l.qty}</span>
                        </span>
                        <span className="num gold">{formatCp(l.item.priceCp * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mk-total">
                  <span>Total</span>
                  <strong className="num gold">{formatCp(total)}</strong>
                </div>
                {short && <p className="danger-text small">Il manque {formatCp(total - purse)} dans ta bourse.</p>}
                <button
                  type="button"
                  className="btn"
                  disabled={busy || lines.length === 0 || short || !group.character}
                  onClick={async () => {
                    if (await run(buyAction(group.id, shop.id, lines.map((l) => ({ itemId: l.item.id, qty: l.qty }))))) setCart({});
                  }}
                >
                  Acheter
                </button>
                <p className="muted small">Les pièces sont retirées de ta fiche et l&apos;objet s&apos;ajoute à ton équipement.</p>
              </aside>
            </div>
          )}
        </>
      )}

      {group.purchases.length > 0 && (
        <section className="stack">
          <h2 className="pl-section-title">Mes derniers achats</h2>
          <ul className="mk-history">
            {group.purchases.map((p) => (
              <li key={p.id} className={p.cancelled ? "cancelled" : undefined}>
                <span>
                  {p.text} <span className="muted small">· {p.shop}, {p.island}</span>
                </span>
                <span className="muted small">{p.cancelled ? "Annulé par le MJ" : `${p.total} · ${when(p.at)}`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- MJ */

function AdminMarket({ group, busy, run }: { group: MarketGroup; busy: boolean; run: Run }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (group.islands.length === 0)
    return (
      <div className="card stack">
        <p className="muted">Ajoute d&apos;abord des îles sur la carte : chaque échoppe appartient à une île.</p>
        <Link href="/outils/carte" className="btn btn-small" style={{ alignSelf: "flex-start" }}>
          Ouvrir la carte
        </Link>
      </div>
    );
  const edited = group.shops.find((s) => s.id === editing);
  const byIsland = group.islands.map((i) => ({ island: i, shops: group.shops.filter((s) => s.islandId === i.id) }));

  return (
    <div className="stack-lg">
      <p className="muted">{group.harbor ? `Le Navire mouille à ${group.harbor.name} : ses échoppes sont ouvertes aux joueurs.` : "Le Navire est en mer : aucune échoppe n'est ouverte."}</p>
      {editing === null ? (
        <div>
          <button type="button" className="btn" onClick={() => setEditing("new")}>
            ＋ Nouvelle échoppe
          </button>
        </div>
      ) : (
        <ShopEditor group={group} shop={edited} busy={busy} run={run} onClose={() => setEditing(null)} />
      )}

      {byIsland.map(({ island, shops }) => (
        <section key={island.id} className="stack">
          <h2 className="pl-section-title">
            {island.name}
            {group.harbor?.id === island.id && <span className="chip chip-accent" style={{ marginLeft: 8 }}>⚓ ouvert</span>}
          </h2>
          {shops.length === 0 ? (
            <p className="muted small">Aucune échoppe.</p>
          ) : (
            <div className="mk-admin-grid">
              {shops.map((s) => (
                <div key={s.id} className="card stack">
                  <div className="stack-xs">
                    <strong>{s.name}</strong>
                    <span className="muted small">{s.kind}</span>
                  </div>
                  <ul className="mk-lines">
                    {s.items.map((it) => (
                      <li key={it.id}>
                        <span>{it.name}</span>
                        <span className="num">
                          {formatCp(it.priceCp)}
                          {it.stock !== null && <span className="muted"> · {it.stock}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="chips">
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(s.id)}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small danger-text"
                      disabled={busy}
                      onClick={() => confirm(`Fermer définitivement ${s.name} ?`) && run(deleteShopAction(s.id))}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <section className="stack">
        <h2 className="pl-section-title">Derniers achats</h2>
        {group.purchases.length === 0 ? (
          <p className="muted small">Aucun achat pour l&apos;instant.</p>
        ) : (
          <ul className="mk-history">
            {group.purchases.map((p) => (
              <li key={p.id} className={p.cancelled ? "cancelled" : undefined}>
                <span>
                  <strong>{p.character}</strong> ({p.who}) : {p.text} <span className="muted small">· {p.shop}, {p.island} · {p.total}</span>
                </span>
                {p.cancelled ? (
                  <span className="muted small">Annulé</span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => confirm("Annuler cet achat et rembourser le joueur ?") && run(cancelPurchaseAction(p.id))}>
                    Annuler
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type ItemRow = ShopInput["items"][number] & { key: string };
const newRow = (): ItemRow => ({ key: Math.random().toString(36).slice(2), id: null, name: "", desc: "", price: "", stock: "" });

function ShopEditor({ group, shop, busy, run, onClose }: { group: MarketGroup; shop?: ShopView; busy: boolean; run: Run; onClose: () => void }) {
  const [islandId, setIslandId] = useState(shop?.islandId ?? group.harbor?.id ?? group.islands[0]?.id ?? "");
  const [name, setName] = useState(shop?.name ?? "");
  const [kind, setKind] = useState(shop?.kind ?? "");
  const [blurb, setBlurb] = useState(shop?.blurb ?? "");
  const [rows, setRows] = useState<ItemRow[]>(
    shop?.items.length
      ? shop.items.map((i) => ({ key: i.id, id: i.id, name: i.name, desc: i.desc, price: priceInput(i.priceCp), stock: i.stock === null ? "" : String(i.stock) }))
      : [newRow()],
  );
  const patch = (key: string, p: Partial<ItemRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));

  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(saveShopAction({ id: shop?.id ?? null, groupId: group.id, islandId, name, kind, blurb, items: rows }))) onClose();
      }}
    >
      <h2 className="subtitle">{shop ? `Modifier ${shop.name}` : "Nouvelle échoppe"}</h2>
      <div className="mk-form-grid">
        <label className="field">
          <span className="label">Île</span>
          <select className="input" value={islandId} onChange={(e) => setIslandId(e.target.value)}>
            {group.islands.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Nom</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="L'Apothicaire des Marées" required />
        </label>
        <label className="field">
          <span className="label">Spécialité</span>
          <input className="input" value={kind} onChange={(e) => setKind(e.target.value)} maxLength={60} placeholder="Potions et remèdes" />
        </label>
      </div>
      <label className="field">
        <span className="label">Ambiance (une phrase)</span>
        <input className="input" value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={400} placeholder="Une vieille sirène tient boutique dans une coquille géante." />
      </label>
      <fieldset className="field">
        <legend className="label">Marchandise · prix en po (ou « 5 pa », « 3 pc ») · stock vide = illimité</legend>
        <div className="stack">
          {rows.map((r) => (
            <div key={r.key} className="mk-row">
              <input className="input" aria-label="Objet" value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Potion de soins" maxLength={80} />
              <input className="input" aria-label="Description" value={r.desc} onChange={(e) => patch(r.key, { desc: e.target.value })} placeholder="Rend 2d4 + 2 PV" maxLength={200} />
              <input className="input input-mono" aria-label="Prix" value={r.price} onChange={(e) => patch(r.key, { price: e.target.value })} placeholder="50" />
              <input className="input input-mono" aria-label="Stock" value={r.stock} onChange={(e) => patch(r.key, { stock: e.target.value })} placeholder="∞" inputMode="numeric" />
              <button type="button" className="icon-btn danger-text" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Retirer l'objet">
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-small" style={{ alignSelf: "flex-start" }} onClick={() => setRows((x) => [...x, newRow()])}>
            ＋ Ajouter un objet
          </button>
        </div>
      </fieldset>
      <div className="chips">
        <button className="btn" disabled={busy}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
