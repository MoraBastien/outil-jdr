"use client";
// L'Équipage : les marins du navire du groupe. Le MJ les nomme, les décrit et garde ses notes (jamais montrées aux joueurs).

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import {
  deleteCrewMemberAction,
  getCrewAction,
  saveCrewMemberAction,
  seedCrewAction,
  setShipNameAction,
  type CrewGroup,
  type CrewMemberView,
  type CrewResult,
  type CrewView,
} from "./actions";
import { DEFAULT_SHIP_NAME } from "./meta";

type Run = (p: Promise<CrewResult>) => Promise<boolean>;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default function CrewTool({ player, initial }: { player: ToolPlayer; initial?: CrewView }) {
  // Données préchargées par la page serveur : l'outil s'affiche dès le HTML, sans aller-retour.
  const [view, setView] = useState<CrewView | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    if (!initial)
      getCrewAction()
        .then(setView)
        .catch(() => setError("Impossible de réunir l'équipage."));
  }, [initial]);

  const run: Run = (p) =>
    new Promise((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setView(r.view);
            setError(null);
          } else setError(r.error);
          resolve(r.ok);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(false);
        }
      });
    });

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">On siffle l&apos;équipage sur le pont…</p>;
  if (view.groups.length === 0) return <p className="muted">{view.isAdmin ? "Crée d'abord un groupe de jeu dans l'administration." : "Tu ne fais partie d'aucun groupe."}</p>;
  const current = view.groups.find((g) => g.id === tab) ?? view.groups[0];

  return (
    <div className="stack-lg">
      <p className="muted">
        {view.isAdmin
          ? "Nomme et décris les marins de chaque navire. Tes notes et les marins cachés n'apparaissent jamais chez les joueurs."
          : `Les marins avec qui tu partages le pont, ${player.name}.`}
      </p>
      {view.groups.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Groupes">
          {view.groups.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current.id} className={`cs-group-tab${g.id === current.id ? " on" : ""}`} onClick={() => setTab(g.id)}>
              <span className="cs-group-tab-name">👥 {g.name}</span>
              <span className="muted small">{g.crew.length} marins</span>
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}
      <GroupCrew key={current.id} group={current} isAdmin={view.isAdmin} busy={busy} run={run} />
    </div>
  );
}

function GroupCrew({ group, isAdmin, busy, run }: { group: CrewGroup; isAdmin: boolean; busy: boolean; run: Run }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const ship = group.shipName ?? DEFAULT_SHIP_NAME;

  return (
    <section className="stack" aria-label={`Équipage de ${ship}`}>
      <ShipHeader group={group} isAdmin={isAdmin} busy={busy} run={run} />

      {group.crew.length === 0 && editing !== "new" && (
        <div className="card stack crew-empty">
          <p className="muted">{isAdmin ? "Personne à bord pour l'instant." : "Le MJ n'a pas encore présenté l'équipage."}</p>
          {isAdmin && (
            <div className="chips">
              <button type="button" className="btn btn-small" disabled={busy} onClick={() => run(seedCrewAction(group.id))}>
                Embarquer l&apos;équipage proposé (8 marins)
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing("new")}>
                Partir de zéro
              </button>
            </div>
          )}
        </div>
      )}

      {(group.crew.length > 0 || editing === "new") && (
        <ul className="crew-grid">
          {group.crew.map((m, i) =>
            editing === m.id ? (
              <li key={m.id}>
                <CrewEditor group={group} member={m} busy={busy} run={run} onClose={() => setEditing(null)} />
              </li>
            ) : (
              <li key={m.id} className={`crew-card${m.hidden ? " crew-hidden" : ""}`} style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
                <CrewCard member={m} isAdmin={isAdmin} busy={busy} onEdit={() => setEditing(m.id)} run={run} />
              </li>
            ),
          )}
          {editing === "new" && (
            <li>
              <CrewEditor group={group} busy={busy} run={run} onClose={() => setEditing(null)} />
            </li>
          )}
        </ul>
      )}

      {isAdmin && group.crew.length > 0 && editing !== "new" && (
        <div>
          <button type="button" className="btn btn-small" onClick={() => setEditing("new")}>
            ＋ Ajouter un marin
          </button>
        </div>
      )}
    </section>
  );
}

function ShipHeader({ group, isAdmin, busy, run }: { group: CrewGroup; isAdmin: boolean; busy: boolean; run: Run }) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(group.shipName ?? "");
  const ship = group.shipName ?? DEFAULT_SHIP_NAME;

  if (renaming)
    return (
      <form
        className="crew-ship-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(setShipNameAction(group.id, value))) setRenaming(false);
        }}
      >
        <label className="field">
          <span className="label">Nom du navire (vide : « {DEFAULT_SHIP_NAME} »)</span>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} placeholder="La Diligente" autoFocus />
        </label>
        <div className="chips">
          <button className="btn btn-small" disabled={busy}>
            Baptiser
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setRenaming(false)}>
            Annuler
          </button>
        </div>
      </form>
    );

  return (
    <header className="crew-ship">
      <span className="crew-ship-mark" aria-hidden="true">
        ⚓
      </span>
      <div className="stack-xs">
        <span className="label">Navire de la compagnie</span>
        <h2 className="crew-ship-name">{group.shipName ? group.shipName : <span className="muted">Navire sans nom</span>}</h2>
        <span className="muted small">
          {group.crew.length} marin{group.crew.length > 1 ? "s" : ""} à bord
        </span>
      </div>
      {isAdmin && (
        <button type="button" className="btn btn-ghost btn-small crew-ship-edit" onClick={() => (setValue(group.shipName ?? ""), setRenaming(true))} aria-label={`Renommer ${ship}`}>
          {group.shipName ? "Renommer" : "Baptiser"}
        </button>
      )}
    </header>
  );
}

function CrewCard({ member: m, isAdmin, busy, onEdit, run }: { member: CrewMemberView; isAdmin: boolean; busy: boolean; onEdit: () => void; run: Run }) {
  return (
    <>
      <div className="crew-head">
        <span className="crew-avatar" aria-hidden="true">
          {initials(m.name)}
        </span>
        <div className="stack-xs">
          {m.role && <span className="crew-role">{m.role}</span>}
          <strong className="crew-name">{m.name}</strong>
          {m.nickname && <span className="crew-nick">dit « {m.nickname} »</span>}
        </div>
      </div>
      {m.trait && <p className="crew-trait">{m.trait}</p>}
      {isAdmin && (
        <>
          {m.hidden && <span className="chip">Caché aux joueurs</span>}
          {m.notes && (
            <p className="crew-notes">
              <span className="label">Note MJ</span>
              {m.notes}
            </p>
          )}
          <div className="chips crew-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={onEdit}>
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small danger-text"
              disabled={busy}
              onClick={() => {
                if (confirm(`Débarquer ${m.name} pour de bon ?`)) void run(deleteCrewMemberAction(m.id));
              }}
            >
              Débarquer
            </button>
          </div>
        </>
      )}
    </>
  );
}

function CrewEditor({ group, member, busy, run, onClose }: { group: CrewGroup; member?: CrewMemberView; busy: boolean; run: Run; onClose: () => void }) {
  const [f, setF] = useState({
    name: member?.name ?? "",
    nickname: member?.nickname ?? "",
    role: member?.role ?? "",
    trait: member?.trait ?? "",
    notes: member?.notes ?? "",
    hidden: member?.hidden ?? false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <form
      className="card stack crew-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(saveCrewMemberAction({ id: member?.id ?? null, groupId: group.id, ...f }))) onClose();
      }}
    >
      <h3 className="subtitle">{member ? `Modifier ${member.name}` : "Nouveau marin"}</h3>
      <label className="field">
        <span className="label">Nom</span>
        <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} required autoFocus />
      </label>
      <label className="field">
        <span className="label">Surnom</span>
        <input className="input" value={f.nickname} onChange={(e) => set("nickname", e.target.value)} maxLength={60} placeholder="Coque-Fendue" />
      </label>
      <label className="field">
        <span className="label">Rôle à bord</span>
        <input className="input" value={f.role} onChange={(e) => set("role", e.target.value)} maxLength={80} placeholder="Charpentier" />
      </label>
      <label className="field">
        <span className="label">Ce qu&apos;on remarque chez lui ou elle</span>
        <textarea className="input textarea" rows={3} value={f.trait} onChange={(e) => set("trait", e.target.value)} maxLength={400} />
      </label>
      <label className="field">
        <span className="label">Note MJ (jamais montrée aux joueurs)</span>
        <textarea className="input textarea" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1200} />
      </label>
      <label className="crew-check">
        <input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} /> Cacher ce marin aux joueurs
      </label>
      <div className="chips">
        <button className="btn btn-small" disabled={busy}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
