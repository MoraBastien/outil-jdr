"use client";
// Le cimetière de chaque campagne : les personnages tombés, et leur épitaphe.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import { getCemeteryAction, reviveAction, setEpitaphAction, type CemeteryResult, type CemeteryView } from "./actions";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function Cemetery({ player, initial }: { player: ToolPlayer; initial?: CemeteryView }) {
  // Données préchargées par la page serveur : l'outil s'affiche dès le HTML, sans aller-retour.
  const [view, setView] = useState<CemeteryView | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!initial)
      getCemeteryAction()
        .then(setView)
        .catch(() => setError("Impossible d'ouvrir le cimetière."));
  }, [initial]);

  const run = (p: Promise<CemeteryResult>) =>
    new Promise<boolean>((resolve) => {
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

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">Les grilles du cimetière grincent…</p>;

  const multi = view.groups.length > 1;

  return (
    <div className="stack-lg cem-root">
      <p className="muted">
        {view.isAdmin
          ? "Déclare un personnage mort depuis l'outil « Fiche de personnage » : il rejoint ici le cimetière de sa campagne. Clique sur une épitaphe pour la modifier."
          : `Ici reposent les héros tombés de ${multi ? "tes campagnes" : "ta campagne"}, ${player.name}. Que leur mémoire guide vos pas.`}
      </p>
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}

      {view.groups.map((g) => (
        <section key={g.id} className="stack" aria-label={`Cimetière de ${g.name}`}>
          {(multi || view.isAdmin) && <h2 className="subtitle">👥 {g.name}</h2>}
          {g.graves.length === 0 ? (
            <div className="cem-empty">
              <span aria-hidden="true">🌙</span>
              <p className="muted">Personne ne repose encore ici. Pourvu que ça dure.</p>
            </div>
          ) : (
            <ul className="cem-grid">
              {g.graves.map((gr, i) => (
                <li key={gr.id} className={`cem-stone${gr.mine ? " mine" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                  <span className="cem-cross" aria-hidden="true">
                    ✝
                  </span>
                  <strong className="cem-name">{gr.name}</strong>
                  <span className="cem-label">{gr.label}</span>
                  <span className="cem-date">† {fmt(gr.diedAt)}</span>
                  {editing === gr.id ? (
                    <form
                      className="cem-edit"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await run(setEpitaphAction(gr.id, draft))) setEditing(null);
                      }}
                    >
                      <textarea className="input textarea" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} autoFocus aria-label="Épitaphe" />
                      <div className="pl-actions">
                        <button className="btn btn-small" disabled={busy}>
                          Graver
                        </button>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(null)}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : view.isAdmin ? (
                    <button type="button" className="cem-epitaph editable" onClick={() => (setEditing(gr.id), setDraft(gr.epitaph))} title="Modifier l'épitaphe">
                      {gr.epitaph ? `« ${gr.epitaph} »` : "Écrire une épitaphe…"}
                    </button>
                  ) : (
                    gr.epitaph && <p className="cem-epitaph">« {gr.epitaph} »</p>
                  )}
                  {gr.mine && !view.isAdmin && <span className="chip">Ton personnage</span>}
                  {view.isAdmin && editing !== gr.id && (
                    <button
                      type="button"
                      className="link-btn cem-revive"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Ramener ${gr.name} à la vie ? Sa fiche redevient jouable et sa tombe disparaît.`)) void run(reviveAction(gr.id));
                      }}
                    >
                      Ramener à la vie
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
