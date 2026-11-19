"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updatePlayer } from "@/app/admin/actions";

type Field = { key: number; label: string; value: string };

export type EditorPlayer = {
  id: string;
  name: string;
  code: string;
  echo: number;
  /** Type de joueur : « entity » donne l'Atelier, la fiche de l'entité et le thème « Astre déchu ». */
  kind: "player" | "entity";
  /** Nom de l'entité (joueurs de l'Atelier), modifiable par le joueur et par le MJ. */
  entityName: string;
  tools: string[];
  groupIds: string[];
  fields: { label: string; value: string }[];
  notes: string;
};

export type EditorTool = { id: string; name: string; icon: string; description: string; byGroup?: boolean; always?: boolean; byKind?: boolean };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/I/L

function randomCode(length = 6): string {
  const a = new Uint32Array(length);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

export default function PlayerEditor({
  player,
  tools,
  groups,
  maxEcho,
}: {
  player: EditorPlayer;
  tools: EditorTool[];
  groups: { id: string; name: string }[];
  maxEcho: number;
}) {
  const [code, setCode] = useState(player.code);
  const [selected, setSelected] = useState<string[]>(player.tools);
  const [memberOf, setMemberOf] = useState<string[]>(player.groupIds);
  const [echo, setEcho] = useState(player.echo);
  const [nextKey, setNextKey] = useState(player.fields.length + 1);
  const [fields, setFields] = useState<Field[]>(() =>
    player.fields.length > 0
      ? player.fields.map((f, i) => ({ key: i, ...f }))
      : [{ key: 0, label: "", value: "" }],
  );
  const [dirty, setDirty] = useState(false);

  const addField = () => {
    setFields((f) => [...f, { key: nextKey, label: "", value: "" }]);
    setNextKey((k) => k + 1);
    setDirty(true);
  };
  const updateField = (key: number, patch: Partial<Field>) => {
    setFields((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const removeField = (key: number) => {
    setFields((f) => f.filter((x) => x.key !== key));
    setDirty(true);
  };
  const moveField = (index: number, dir: -1 | 1) => {
    setFields((f) => {
      const j = index + dir;
      if (j < 0 || j >= f.length) return f;
      const copy = [...f];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
    setDirty(true);
  };

  const [kind, setKind] = useState(player.kind);
  const hasHomunculus = kind === "entity";

  return (
    <form action={updatePlayer} className="stack-lg" onChange={() => setDirty(true)}>
      <input type="hidden" name="id" value={player.id} />

      <section className="card stack">
        <h2 className="subtitle">Identité</h2>
        <div className="grid-2">
          <label className="field">
            <span className="label">Nom</span>
            <input name="name" className="input" defaultValue={player.name} required />
          </label>
          <div className="field">
            <label className="label" htmlFor="code">
              Code d&apos;accès
            </label>
            <div className="input-with-btn">
              <input
                id="code"
                name="code"
                className="input input-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setCode(randomCode());
                  setDirty(true);
                }}
              >
                Générer
              </button>
            </div>
            <span className="muted small">Le joueur se connecte avec ce code. Le changer le déconnecte de fait.</span>
          </div>
          <div className="field">
            <span className="label">Type de joueur</span>
            <div className="segmented" role="radiogroup" aria-label="Type de joueur">
              {(
                [
                  ["player", "Joueur"],
                  ["entity", "✨ Entité"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className={kind === k ? "on" : ""}>
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                  {label}
                </label>
              ))}
            </div>
            <span className="muted small">
              {kind === "entity"
                ? "Incarne une entité : Atelier de Rigel, fiche de l'entité avec son homunculus actif, et son propre thème."
                : "Joueur classique, avec sa fiche de personnage D&D."}
            </span>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-head">
          <h2 className="subtitle">Groupes de jeu</h2>
          <span className="muted small">Donnent accès au planning et à une fiche de personnage par groupe.</span>
        </div>
        {groups.length === 0 ? (
          <p className="muted small">Aucun groupe pour l&apos;instant : crée-en un sur la page d&apos;administration.</p>
        ) : (
          <div className="checks">
            {groups.map((g) => (
              <label key={g.id} className={`group-check${memberOf.includes(g.id) ? " on" : ""}`}>
                <input
                  type="checkbox"
                  name="groups"
                  value={g.id}
                  checked={memberOf.includes(g.id)}
                  onChange={(e) => setMemberOf((m) => (e.target.checked ? [...m, g.id] : m.filter((x) => x !== g.id)))}
                />
                👥 {g.name}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 className="subtitle">Outils autorisés</h2>
        <div className="tool-toggles">
          {tools.map((t) => {
            if (t.always) {
              return (
                <div key={t.id} className="tool-toggle auto on">
                  <span className="tool-icon">{t.icon}</span>
                  <span className="stack-xs">
                    <strong>{t.name}</strong>
                    <span className="muted small">Toujours disponible pour tous les joueurs.</span>
                  </span>
                </div>
              );
            }
            if (t.byKind) {
              return (
                <div key={t.id} className={`tool-toggle auto${hasHomunculus ? " on" : ""}`}>
                  <span className="tool-icon">{t.icon}</span>
                  <span className="stack-xs">
                    <strong>{t.name}</strong>
                    <span className="muted small">{hasHomunculus ? "Automatique : le joueur est une Entité." : "Réservé aux joueurs de type Entité."}</span>
                  </span>
                </div>
              );
            }
            if (t.byGroup) {
              // Avec l'Atelier de Rigel, la fiche de personnage devient la fiche de l'entité (sans condition de groupe).
              const entity = t.id === "personnage" && hasHomunculus;
              const on = entity || memberOf.length > 0;
              return (
                <div key={t.id} className={`tool-toggle auto${on ? " on" : ""}`}>
                  <span className="tool-icon">{t.icon}</span>
                  <span className="stack-xs">
                    <strong>{t.name}</strong>
                    <span className="muted small">{entity
                        ? "Fiche de l'entité et de son homunculus actif, car le joueur est une Entité."
                        : on
                          ? "Automatique : le joueur est dans un groupe."
                          : "Bloqué : le joueur n'est dans aucun groupe."}</span>
                  </span>
                </div>
              );
            }
            const on = selected.includes(t.id);
            return (
              <label key={t.id} className={`tool-toggle${on ? " on" : ""}`}>
                <input
                  type="checkbox"
                  name="tools"
                  value={t.id}
                  checked={on}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id)))
                  }
                />
                <span className="tool-icon">{t.icon}</span>
                <span className="stack-xs">
                  <strong>{t.name}</strong>
                  <span className="muted small">{t.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className={`echo-box${hasHomunculus ? "" : " disabled"}`}>
          <div className="stack-xs">
            <span className="label">Entité et niveau d&apos;Écho</span>
            <span className="muted small">
              {hasHomunculus
                ? "Le joueur incarne une entité. Son Écho est imposé dans l'Atelier de Rigel et monte d'un cran quand l'objectif du one-shot est réussi."
                : "Utilisé seulement pour les joueurs de type Entité."}
            </span>
          </div>
          {hasHomunculus && (
            <label className="field echo-entity">
              <span className="label">Nom de l&apos;entité</span>
              <input className="input" name="entityName" defaultValue={player.entityName} maxLength={60} placeholder="Le joueur peut aussi le choisir" />
            </label>
          )}
          <div className="segmented" role="radiogroup" aria-label="Écho">
            {Array.from({ length: maxEcho }, (_, i) => i + 1).map((n) => (
              <label key={n} className={echo === n ? "on" : ""}>
                <input type="radio" name="echo" value={n} checked={echo === n} onChange={() => setEcho(n)} />
                {n}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-head">
          <h2 className="subtitle">Fiche du joueur</h2>
          <span className="muted small">Visible par le joueur sur son accueil</span>
        </div>

        <div className="field-rows">
          {fields.map((f, i) => (
            <div key={f.key} className="field-row">
              <input
                name="fieldLabel"
                className="input"
                placeholder="Libellé (ex. Classe)"
                value={f.label}
                onChange={(e) => updateField(f.key, { label: e.target.value })}
                aria-label={`Libellé ${i + 1}`}
              />
              <input
                name="fieldValue"
                className="input"
                placeholder="Valeur (ex. Rôdeur)"
                value={f.value}
                onChange={(e) => updateField(f.key, { value: e.target.value })}
                aria-label={`Valeur ${i + 1}`}
              />
              <div className="row-actions">
                <button type="button" className="icon-btn" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label="Monter">
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => moveField(i, 1)}
                  disabled={i === fields.length - 1}
                  aria-label="Descendre"
                >
                  ↓
                </button>
                <button type="button" className="icon-btn danger-text" onClick={() => removeField(f.key)} aria-label="Supprimer la ligne">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <button type="button" className="btn btn-ghost btn-small" onClick={addField}>
            + Ajouter une ligne
          </button>
        </div>

        <label className="field">
          <span className="label">Notes visibles par le joueur</span>
          <textarea name="notes" className="input textarea" rows={4} defaultValue={player.notes} />
        </label>
      </section>

      <div className={`save-bar${dirty ? " dirty" : ""}`}>
        <span className="muted small save-status">{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}</span>
        <SaveButton />
      </div>
    </form>
  );
}
