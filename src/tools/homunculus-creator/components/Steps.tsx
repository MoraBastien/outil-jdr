import type { Dispatch, ReactNode } from "react";
import { ANOMALIES } from "../data/anomalies";
import { CLASSES } from "../data/classes";
import { COMPETENCES } from "../data/competences";
import { FELURES } from "../data/felures";
import { MATIERES } from "../data/matieres";
import { STATS, STAT_MAX } from "../data/stats";
import { allCompetences, asiPoints, asiUsed, competenceNom, finalStat, getClasse, getMatiere, mod, signed } from "../lib/rules";
import type { Action } from "../lib/state";
import type { DerivedSheet, HomunculusState } from "../types";

interface StepProps {
  state: HomunculusState;
  derived: DerivedSheet;
  dispatch: Dispatch<Action>;
}

export function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="hc-step">
      <h2>
        <span className="hc-num">{n}</span>
        {title}
      </h2>
      {hint && <p className="hc-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function EchoStep({ state, derived, dispatch, maxEcho, locked }: StepProps & { maxEcho: number; locked: boolean }) {
  const asi = derived.asi;
  return (
    <Step n={1} title="Écho" hint="L'Écho du Maître fixe le niveau de l'homunculus. Il ne monte jamais en cours de mission. Les matières se débloquent par palier : 1-2, puis 3-4.">
      <div className="hc-seg">
        {Array.from({ length: maxEcho }, (_, i) => i + 1).map((e) => (
          <button key={e} type="button" aria-pressed={state.echo === e} disabled={locked && state.echo !== e} onClick={() => dispatch({ type: "setEcho", echo: e, maxEcho })}>
            {e}
          </button>
        ))}
      </div>
      <p className="hc-hint" style={{ margin: 0 }}>
        Niveau {state.echo} · bonus de maîtrise {signed(derived.pb)} · {asi ? `${asi} points d'augmentation de caractéristiques` : "aucune augmentation de caractéristiques"}
      </p>
    </Step>
  );
}

export function MatiereStep({ state, dispatch }: Omit<StepProps, "derived">) {
  const paliers = Array.from(new Set(MATIERES.map((m) => m.palier)));
  const sel = getMatiere(state.matiereId);
  return (
    <Step n={2} title="Corps : la matière" hint="Remplace la race. Chaque matière apporte une capacité et une faiblesse. Les matières d'un palier supérieur à l'Écho sont verrouillées.">
      {paliers.map((pal) => {
        const list = MATIERES.filter((m) => m.palier === pal);
        const lock = list[0].echoMin > state.echo;
        return (
          <div className="hc-mgroup" key={pal}>
            <p className="hc-label">
              Palier {pal}
              {lock ? " · verrouillé" : ""}
            </p>
            <div className="hc-mtiles">
              {list.map((m) => (
                <button key={m.id} type="button" className="hc-mtile" aria-pressed={state.matiereId === m.id} disabled={lock} onClick={() => dispatch({ type: "setMatiere", id: m.id })}>
                  <span className="hc-tag">{m.type}</span>
                  <b>{m.nom}</b>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {sel ? (
        <div className="hc-mdetail">
          <h3>
            {sel.nom}
            <span>
              Palier {sel.palier} · {sel.type}
            </span>
          </h3>
          <div className="hc-mrow">
            <span className="hc-label">Capacité</span>
            <p>
              <strong>{sel.capacite}</strong> : {sel.effet}
            </p>
          </div>
          <div className="hc-mrow hc-weak">
            <span className="hc-label">Faiblesse</span>
            <p>{sel.faiblesse}</p>
          </div>
        </div>
      ) : (
        <div className="hc-mdetail hc-empty">Choisis une matière pour lire sa capacité et sa faiblesse.</div>
      )}
    </Step>
  );
}

export function ClasseStep({ state, dispatch }: Omit<StepProps, "derived">) {
  const c = getClasse(state.classeId);
  const comps = allCompetences(state);
  return (
    <Step n={3} title="Classe" hint="Une classe D&D 5e, au niveau de l'Écho. Choisis ses compétences et ses options : tout ce qu'elle donne est listé ci-dessous.">
      <div className="hc-chips">
        {CLASSES.map((cl) => (
          <button key={cl.id} type="button" className="hc-chip" aria-pressed={state.classeId === cl.id} onClick={() => dispatch({ type: "setClasse", id: cl.id })}>
            {cl.nom}
            <i>d{cl.dv}</i>
          </button>
        ))}
      </div>
      {!c ? (
        <div className="hc-mdetail hc-empty" style={{ marginTop: 14 }}>
          Choisis une classe pour voir ses compétences, ses traits et ses choix, selon l'Écho.
        </div>
      ) : (
        <div className="hc-mdetail" style={{ marginTop: 14 }}>
          <h3>
            {c.nom}
            <span>
              Écho {state.echo} · d{c.dv}
            </span>
          </h3>
          <div className="hc-mrow">
            <span className="hc-label">Base</span>
            <p>
              Dé de vie d{c.dv} · Sauvegardes : {c.sauvegardes} · Armures : {c.armures} · Armes : {c.armes}
            </p>
          </div>
          <div className="hc-mrow">
            <span className="hc-label">Compétences</span>
            <div>
              <p className="hc-note" style={{ border: 0, padding: 0, margin: 0 }}>
                Choisis {c.nbCompetences}
                {c.competences === "toutes" ? " compétences au choix. " : ` parmi ${c.competences.length}. `}
                Une compétence cochée dans l'Anomalie est aussi cochée ici (bord pointillé), et inversement. <b>{state.competencesClasse.length}/{c.nbCompetences}</b>
              </p>
              <div className="hc-skills">
                {(c.competences === "toutes" ? COMPETENCES.map((x) => x.id) : c.competences).map((id) => {
                  const own = state.competencesClasse.includes(id);
                  const alt = state.competencesAnomalie.includes(id);
                  const on = own || alt;
                  return (
                    <button key={id} type="button" className={alt ? "hc-alt" : undefined} title={alt ? "Cochée via l'Anomalie" : undefined} aria-pressed={on} disabled={!on && state.competencesClasse.length >= c.nbCompetences} onClick={() => dispatch({ type: "toggleCompetenceClasse", id })}>
                      {competenceNom(id)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {c.choix.map((ch) => {
            const lock = ch.niveau > state.echo;
            const cur = state.choix[ch.id] ?? [];
            const opts = ch.source === "competences" ? comps.map((id) => ({ id, nom: competenceNom(id), description: undefined as string | undefined })) : ch.options ?? [];
            return (
              <div className={"hc-mrow" + (lock ? " hc-lock" : "")} key={ch.id}>
                <span className="hc-label">{ch.titre}</span>
                <div>
                  {lock ? (
                    <p className="hc-empty">Se débloque à l'Écho {ch.niveau}.</p>
                  ) : (
                    <>
                      <p className="hc-note" style={{ border: 0, padding: 0, margin: "0 0 8px" }}>
                        Prends {ch.nombre}. <b>{cur.length}/{ch.nombre}</b>
                      </p>
                      {opts.length === 0 ? (
                        <p className="hc-empty">Choisis d'abord tes compétences.</p>
                      ) : (
                        <div className="hc-mtiles hc-wide">
                          {opts.map((o) => {
                            const on = cur.includes(o.id);
                            return (
                              <button key={o.id} type="button" className="hc-mtile" aria-pressed={on} disabled={!on && ch.nombre > 1 && cur.length >= ch.nombre} onClick={() => dispatch({ type: "toggleChoix", choixId: ch.id, optionId: o.id })}>
                                <b>{o.nom}</b>
                                {o.description && <small>{o.description}</small>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div className="hc-mrow">
            <span className="hc-label">Traits</span>
            <div className="hc-trl">
              {c.traits.map((t, i) => {
                const lk = t.niveau > state.echo;
                return (
                  <p key={i} className={lk ? "hc-lk" : undefined}>
                    <span className="hc-nv">Écho {t.niveau}</span>
                    <b>{t.nom}</b> : {t.description}
                    {lk ? " (pas encore débloqué)" : ""}
                  </p>
                );
              })}
              <p className="hc-empty">À l'Écho 4 : pas de don, mais +2 points de caractéristique à répartir (étape 4).</p>
            </div>
          </div>
          {c.magie && (
            <div className="hc-mrow">
              <span className="hc-label">Magie</span>
              <p>{c.magie[Math.min(state.echo, 4) - 1]}</p>
            </div>
          )}
        </div>
      )}
    </Step>
  );
}

export function StatsStep({ state, dispatch, onRoll, busy, error }: Omit<StepProps, "derived"> & { onRoll: () => void; busy: boolean; error: string | null }) {
  const asi = asiPoints(state.echo);
  const left = asi - asiUsed(state);
  return (
    <Step n={4} title="Caractéristiques" hint="Six jets de 4d5 (un d10 divisé par 2, arrondi au supérieur) en retirant le plus bas, à répartir sur les caractéristiques. Moyenne d'environ 10, maximum 15. Les relances restent comptées sur la fiche.">
      <div className="hc-actions">
        <button type="button" className="hc-btn" onClick={onRoll} disabled={busy}>
          {busy ? "Lancer…" : state.jets ? "Relancer les six jets" : "Lancer les dés"}
        </button>
        <button type="button" className="hc-btn hc-ghost" disabled={!state.pool || !state.classeId} onClick={() => dispatch({ type: "autoAssign" })}>
          Répartir selon la classe
        </button>
      </div>
      {error && <p className="hc-note" role="alert">{error}</p>}
      {state.jets > 1 && <p className="hc-note">Relances utilisées : {state.jets - 1}. Elles figurent sur la fiche.</p>}
      {state.pool ? (
        <>
          <div className="hc-pool">
            {state.pool.map((v, i) => (
              <span className="hc-die" key={i}>{v}</span>
            ))}
          </div>
          {asi > 0 && (
            <p className="hc-hint" style={{ margin: "0 0 6px" }}>
              Points d'augmentation : {left} restants sur {asi} · plafond {STAT_MAX}
            </p>
          )}
          {STATS.map((st, i) => {
            const f = finalStat(state, i);
            return (
              <div className="hc-srow" key={st.id}>
                <span className="hc-sl" title={st.nom}>{st.abbr}</span>
                <select
                  aria-label={st.nom}
                  value={state.assign[i] ?? ""}
                  onChange={(e) => dispatch({ type: "assign", stat: i, poolIndex: e.target.value === "" ? null : Number(e.target.value) })}
                >
                  <option value="">—</option>
                  {state.pool!.map((v, k) => (
                    <option key={k} value={k} disabled={state.assign.some((a, j) => j !== i && a === k)}>{v}</option>
                  ))}
                </select>
                <span className="hc-bon">
                  {asi > 0 && (
                    <>
                      <button type="button" aria-label="Retirer 1" disabled={state.bonus[i] <= 0} onClick={() => dispatch({ type: "bonus", stat: i, delta: -1 })}>−</button>
                      {state.bonus[i]}
                      <button type="button" aria-label="Ajouter 1" disabled={left <= 0 || f == null || f >= STAT_MAX} onClick={() => dispatch({ type: "bonus", stat: i, delta: 1 })}>+</button>
                    </>
                  )}
                </span>
                <span className="hc-fin">{f == null ? "—" : f}</span>
                <span className="hc-md">{f == null ? "" : signed(mod(f))}</span>
              </div>
            );
          })}
        </>
      ) : (
        <p className="hc-note">Aucun jet pour l'instant.</p>
      )}
    </Step>
  );
}

export function AnomalieStep({ state, dispatch }: Omit<StepProps, "derived">) {
  return (
    <Step n={5} title="Anomalie" hint="Remplace le background : un passif fixe, plus deux compétences au choix. Ce que la cuve a laissé de travers.">
      <div className="hc-opts">
        {ANOMALIES.map((a) => (
          <button key={a.id} type="button" className="hc-opt" aria-pressed={state.anomalieId === a.id} onClick={() => dispatch({ type: "setAnomalie", id: a.id })}>
            <span className="hc-tag">{a.famille}{a.provisoire ? " · provisoire" : ""}</span>
            <b>{a.nom}</b>
            <small>{a.passif}</small>
            <small className="hc-weak"><i>{a.cuve}</i></small>
          </button>
        ))}
      </div>
      <p className="hc-label" style={{ margin: "18px 0 0" }}>Deux compétences</p>
      <div className="hc-skills">
        {COMPETENCES.map((c) => {
          const own = state.competencesAnomalie.includes(c.id);
          const alt = state.competencesClasse.includes(c.id);
          const on = own || alt;
          return (
            <button key={c.id} type="button" className={alt ? "hc-alt" : undefined} title={alt ? "Cochée via la classe" : undefined} aria-pressed={on} disabled={!on && state.competencesAnomalie.length >= 2} onClick={() => dispatch({ type: "toggleCompetenceAnomalie", id: c.id })}>
              {c.nom}
            </button>
          );
        })}
      </div>
    </Step>
  );
}

export function FelureStep({ state, onRoll, busy, error }: Omit<StepProps, "derived" | "dispatch"> & { onRoll: () => void; busy: boolean; error: string | null }) {
  const idx = FELURES.findIndex((f) => f.id === state.felureId);
  const f = idx >= 0 ? FELURES[idx] : null;
  return (
    <Step n={6} title="Fêlure" hint="Un détail de personnalité tiré au d20. Fait pour le plaisir de jouer, pas pour punir.">
      <button type="button" className="hc-btn" onClick={onRoll} disabled={busy}>
        {f == null ? "Tirer la Fêlure (d20)" : "Relancer la Fêlure"}
      </button>
      {error && <p className="hc-note" role="alert">{error}</p>}
      {state.felJets > 1 && <p className="hc-note">Relances utilisées : {state.felJets - 1}. Elles figurent sur la fiche.</p>}
      {f && (
        <div className="hc-fel">
          <span className="hc-n">d20 = {idx + 1}</span>
          <br />
          <b>{f.nom}</b>
          <p style={{ margin: "4px 0 0" }}>{f.description}</p>
        </div>
      )}
      <details>
        <summary>Voir la table des {FELURES.length} Fêlures</summary>
        <ol>
          {FELURES.map((x) => (
            <li key={x.id}><b>{x.nom}</b> : {x.description}</li>
          ))}
        </ol>
      </details>
    </Step>
  );
}

export function IdentiteStep({ state, dispatch, readOnly }: Omit<StepProps, "derived"> & { readOnly: boolean }) {
  const set = (field: "nom" | "marque" | "mission") => (e: { target: { value: string } }) => dispatch({ type: "setField", field, value: e.target.value });
  return (
    <Step n={7} title="Identité" hint="Les ordres du Maître arrivent sans visage ni nom. Le nom de l'homunculus, lui, se garde.">
      <div className="hc-field">
        <label className="hc-label" htmlFor="hc-nom">Nom</label>
        <input id="hc-nom" type="text" autoComplete="off" maxLength={60} value={state.nom} onChange={set("nom")} readOnly={readOnly} />
      </div>
      <div className="hc-field">
        <label className="hc-label" htmlFor="hc-marque">Marque</label>
        <input id="hc-marque" type="text" autoComplete="off" maxLength={80} placeholder="Forme et emplacement de la marque" value={state.marque} onChange={set("marque")} readOnly={readOnly} />
      </div>
      <div className="hc-field">
        <label className="hc-label" htmlFor="hc-mission">Mission du chapitre</label>
        <textarea id="hc-mission" maxLength={400} placeholder="Fragment visé, lieu, consigne reçue" value={state.mission} onChange={set("mission")} readOnly={readOnly} />
      </div>
    </Step>
  );
}

