"use client";
// « Mon entité » (joueurs de l'Atelier de Rigel) : remplace la fiche de personnage D&D.
// - La fiche de l'entité : nom et niveau d'Écho. TODO(entité) : fiche complète quand les règles seront finies.
// - L'homunculus actif de chaque groupe, transféré dans une fiche de personnage classique (Sheet).
// Chargée à la demande (voir CharacterHost) et sans import de entity.ts ni des infos de l'Atelier :
// rien ne se retrouve dans le JavaScript commun aux autres joueurs.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sheet from "@/tools/character/components/Sheet";
import { saveCharacterAction } from "@/tools/character/actions";
import type { EntitySheetData } from "./entity";
import {
  activateHomunculusAction,
  getEntityViewAction,
  refreshHomunculusAction,
  saveEntityNameAction,
  type EntityGroup,
  type EntityView,
  type EntityViewResult,
} from "./entityActions";
import EntityConstellation from "./astral/EntityConstellation";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function EntitySheet({ sheet }: { sheet: EntitySheetData }) {
  const router = useRouter();
  const [name, setName] = useState(sheet.name);
  const [saved, setSaved] = useState(sheet.name);
  const [state, setState] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, start] = useTransition();
  const dirty = name.trim() !== saved;

  const [view, setView] = useState<EntityView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    void getEntityViewAction().then((r) => (r.ok ? setView(r.view) : setError(r.error)));
  }, []);
  const apply = async (p: Promise<EntityViewResult>) => {
    setWorking(true);
    try {
      const r = await p;
      if (r.ok) {
        setView(r.view);
        setError(null);
        router.refresh();
      } else setError(r.error);
      return r.ok;
    } catch {
      setError("L'action a échoué. Réessaie.");
      return false;
    } finally {
      setWorking(false);
    }
  };

  const save = () =>
    start(async () => {
      const r = await saveEntityNameAction(name);
      if (r.ok) {
        setName(r.name);
        setSaved(r.name);
        setState({ kind: "ok", text: "Enregistré." });
        router.refresh();
      } else setState({ kind: "error", text: r.error });
    });

  return (
    <div className="cs-root stack-lg">
      <header className="stack-xs">
        <p className="eyebrow">Fiche de personnage</p>
        <h1 className="title">Mon entité</h1>
        <p className="muted">Tu ne joues pas un héros mais l&apos;entité qui façonne des homunculus et les envoie rejoindre le groupe.</p>
      </header>

      <form
        className="cs-banner"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save();
        }}
      >
        <EntityConstellation echo={sheet.echo} />
        <div className="cs-ident">
          <label className="label" htmlFor="entity-name">
            Nom
          </label>
          <input
            id="entity-name"
            className="input"
            value={name}
            maxLength={60}
            placeholder="Nom de ton entité"
            onChange={(e) => (setName(e.target.value), setState(null))}
            required
          />
          <p className="cs-sub">
            Niveau d&apos;Écho <b>{sheet.echo}</b>, fixé par ton MJ.
          </p>
        </div>
        <div className="cs-banner-actions">
          <button type="submit" className="btn btn-small" disabled={busy || !dirty || !name.trim()}>
            {busy ? "…" : "Enregistrer"}
          </button>
          <span className={`cs-save-state${state?.kind === "error" ? " error" : ""}`} role="status">
            {state?.text ?? ""}
          </span>
        </div>
      </form>

      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}

      {!view ? (
        <p className="muted">Chargement de tes homunculus…</p>
      ) : view.groups.length === 0 ? (
        <p className="muted">Tu n&apos;es dans aucun groupe : ton MJ t&apos;ajoutera à un groupe pour que ton homunculus le rejoigne.</p>
      ) : (
        view.groups.map((g) => (
          <GroupSection key={g.id} group={g} view={view} multi={view.groups.length > 1} working={working} apply={apply} atelierHref={sheet.atelierHref} />
        ))
      )}

      <section className="card card-dashed stack-xs">
        <strong>🚧 Fiche de l&apos;entité à venir</strong>
        <p className="muted small">
          Les règles de l&apos;entité sont encore en cours d&apos;écriture : pour l&apos;instant, sa fiche garde son nom et son niveau d&apos;Écho. Tes homunculus se
          créent et se gardent dans l&apos;
          <Link href={sheet.atelierHref} className="text-link">
            Atelier de Rigel
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function GroupSection({
  group: g,
  view,
  multi,
  working,
  apply,
  atelierHref,
}: {
  group: EntityGroup;
  view: EntityView;
  multi: boolean;
  working: boolean;
  apply: (p: Promise<EntityViewResult>) => Promise<boolean>;
  atelierHref: string;
}) {
  const [picking, setPicking] = useState(false);
  const r = g.record;
  const showPicker = !r || picking;

  return (
    <section className="stack ent-group">
      <div className="cs-row-between">
        <h2 className="subtitle">{multi ? `👥 ${g.name} · homunculus actif` : "Homunculus actif"}</h2>
        {r && (
          <div className="ent-actions">
            <button type="button" className="btn btn-ghost btn-small" disabled={working} onClick={() => void apply(refreshHomunculusAction(r.id))}>
              ↻ Mettre à jour depuis l&apos;Atelier
            </button>
            <button type="button" className="btn btn-ghost btn-small" disabled={working} onClick={() => setPicking((v) => !v)}>
              {picking ? "Annuler" : "Changer d'homunculus"}
            </button>
          </div>
        )}
      </div>

      {r && g.stale && (
        <p className="flash flash-error small">
          Ton Écho est passé à {view.echo} et cette fiche est au niveau {r.state.level}. Monte cet homunculus à l&apos;Écho {view.echo} dans l&apos;
          <Link href={atelierHref} className="text-link">
            Atelier
          </Link>
          , puis clique sur « Mettre à jour depuis l&apos;Atelier ».
        </p>
      )}

      {showPicker && (
        <div className="stack-xs">
          <p className="muted small">
            {r
              ? "Le nouvel homunculus remplace celui-ci dans le groupe (l'équipement et les notes de l'actuel ne sont pas repris)."
              : "Choisis l'homunculus qui rejoint le groupe : sa fiche de l'Atelier devient une fiche de personnage classique, que ton MJ voit comme les autres."}
          </p>
          {view.homunculi.length === 0 ? (
            <p className="muted">
              Pas encore d&apos;homunculus.{" "}
              <Link href={atelierHref} className="text-link">
                Crée-le dans l&apos;Atelier
              </Link>
              .
            </p>
          ) : (
            <ul className="pw-list">
              {view.homunculi.map((h) => {
                const here = h.activeIn === g.id;
                const blocked = h.dead ? "🪦 Mort" : h.activeIn && !here ? "Actif dans un autre groupe" : !h.complete ? "À terminer dans l'Atelier" : here ? "Actif ici" : null;
                return (
                  <li key={h.id} className="pw-poll ent-pick">
                    <span className="stack-xs">
                      <strong>{h.name}</strong>
                      <span className="muted small">
                        {h.label || "Matière et classe à choisir"} · Écho {h.echo}
                      </span>
                    </span>
                    {blocked ? (
                      <span className={`chip${h.dead ? " chip-danger" : here ? " chip-ok" : ""}`}>{blocked}</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={working}
                        onClick={async () => {
                          if (r && !confirm(`Remplacer ${r.state.name} par ${h.name} dans le groupe ?`)) return;
                          if (await apply(activateHomunculusAction(g.id, h.id))) setPicking(false);
                        }}
                      >
                        Rendre actif
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {r && !picking && <Sheet key={r.id} record={r} editable canLevelUp={false} onSave={async (patch) => (await saveCharacterAction(r.id, patch)).ok} />}

      {g.fallen.length > 0 && (
        <details className="pl-archive">
          <summary className="label">Homunculus tombés ({g.fallen.length})</summary>
          <ul className="pw-list">
            {g.fallen.map((f) => (
              <li key={`${f.name}-${f.diedAt}`} className="muted small">
                🪦 {f.name}, le {fmt(f.diedAt)}
                {f.epitaph && ` · « ${f.epitaph} »`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
