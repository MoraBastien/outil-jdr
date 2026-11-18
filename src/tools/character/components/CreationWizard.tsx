"use client";
// Assistant de création d'un personnage de niveau 1, étape par étape, avec explications.

import { useMemo, useState } from "react";
import { ABILITIES, POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, abilityName, abilityShort, skillName } from "../data/abilities";
import { CLASSES, getClass } from "../data/classes";
import { ORIGIN_FEATS, getFeat } from "../data/feats";
import { BACKGROUNDS, SPECIES, getBackground, getSpecies } from "../data/origins";
import {
  BG_SKILLED_KEY,
  CLASS_SKILLS_KEY,
  ORIGIN_FEAT_KEY,
  SPECIES_SKILLED_KEY,
  SPECIES_SKILL_KEY,
  buildCharacter,
  creationClassChoices,
  derive,
  emptyState,
  fmtMod,
  mod,
  pointBuyCost,
  validateBackgroundBonus,
  validateScores,
  type CreationInput,
} from "../rules";
import type { Ability, CharacterState, Choice, Scores, SkillId } from "../types";
import { ChoicePicker, isComplete } from "./ChoicePicker";
import Hint from "./Hint";

const STEPS = ["Classe", "Espèce", "Historique", "Caractéristiques", "Compétences", "Identité", "Récapitulatif"];

/** Ordre conseillé des caractéristiques par classe (pour la répartition automatique). */
const PRIORITY: Record<string, Ability[]> = {
  barbarian: ["str", "con", "dex", "wis", "cha", "int"],
  bard: ["cha", "dex", "con", "wis", "int", "str"],
  cleric: ["wis", "con", "str", "cha", "dex", "int"],
  druid: ["wis", "con", "dex", "int", "cha", "str"],
  fighter: ["str", "con", "dex", "wis", "cha", "int"],
  monk: ["dex", "wis", "con", "str", "int", "cha"],
  paladin: ["str", "cha", "con", "wis", "dex", "int"],
  ranger: ["dex", "wis", "con", "str", "int", "cha"],
  rogue: ["dex", "con", "int", "wis", "cha", "str"],
  sorcerer: ["cha", "con", "dex", "wis", "int", "str"],
  warlock: ["cha", "con", "dex", "wis", "int", "str"],
  wizard: ["int", "con", "dex", "wis", "cha", "str"],
};

const blankScores = (): Scores => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

export default function CreationWizard({
  forName,
  busy,
  onCreate,
  onCancel,
}: {
  /** Nom du joueur, quand le MJ crée la fiche pour lui. */
  forName?: string;
  busy: boolean;
  onCreate: (input: CreationInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<CreationInput>({
    name: "",
    classId: "",
    speciesId: "",
    backgroundId: "",
    speciesOptions: {},
    scoreMethod: "standard",
    baseScores: blankScores(),
    backgroundBonus: {},
    answers: {},
  });
  const [identity, setIdentity] = useState({ alignment: "", personality: "" });
  const set = (p: Partial<CreationInput>) => setInput((i) => ({ ...i, ...p }));
  const answer = (key: string, v: string[]) => setInput((i) => ({ ...i, answers: { ...i.answers, [key]: v } }));

  const cls = getClass(input.classId);
  const species = getSpecies(input.speciesId);
  const bg = getBackground(input.backgroundId);
  const bgFeat = bg ? getFeat(bg.feat) : undefined;
  const humanFeat = input.answers[ORIGIN_FEAT_KEY]?.[0] ? getFeat(input.answers[ORIGIN_FEAT_KEY][0]) : undefined;

  /** Brouillon de fiche pour les sélecteurs (sans les réponses du choix `exclude`, pour qu'elles restent cliquables). */
  const draft = (exclude?: string): CharacterState => {
    const s = emptyState();
    s.classId = input.classId;
    s.speciesId = input.speciesId;
    s.backgroundId = input.backgroundId;
    s.baseScores = input.baseScores;
    s.backgroundBonus = input.backgroundBonus;
    const skillKeys = [CLASS_SKILLS_KEY, SPECIES_SKILL_KEY, BG_SKILLED_KEY, SPECIES_SKILLED_KEY];
    s.skills = [...(bg?.skills ?? []), ...skillKeys.filter((k) => k !== exclude).flatMap((k) => (input.answers[k] ?? []) as SkillId[])];
    for (const [k, v] of Object.entries(input.answers)) if (k !== exclude && !skillKeys.includes(k)) s.classChoices[k] = v;
    return s;
  };

  // Choix de l'étape « Compétences ».
  const skillChoices: Choice[] = useMemo(() => {
    if (!cls || !species || !bg) return [];
    const list: Choice[] = [];
    const [classSkills, ...classOthers] = creationClassChoices(cls);
    list.push(classSkills);
    if (species.skillChoice) list.push({ kind: "skills", key: SPECIES_SKILL_KEY, ...species.skillChoice });
    if (bgFeat?.skills) list.push({ kind: "skills", key: BG_SKILLED_KEY, label: "Don Doué (historique) : 3 compétences", count: 3, from: "any" });
    if (humanFeat?.skills) list.push({ kind: "skills", key: SPECIES_SKILLED_KEY, label: "Don Doué (humain) : 3 compétences", count: 3, from: "any" });
    list.push(...classOthers);
    return list;
  }, [cls, species, bg, bgFeat, humanFeat]);

  const scoresError = Object.values(input.baseScores).some((v) => !v) ? "Attribue toutes les valeurs." : validateScores(input.scoreMethod, input.baseScores);
  const bonusError = bg ? validateBackgroundBonus(bg.abilities, input.backgroundBonus) : "Choisis un historique.";

  const canNext = [
    Boolean(cls),
    Boolean(species) && (species!.options ?? []).every((o) => input.speciesOptions[o.key]) && (!species!.originFeat || Boolean(humanFeat)),
    Boolean(bg),
    !scoresError && !bonusError,
    skillChoices.every((c) => isComplete(c, input.answers[c.key])),
    input.name.trim().length > 0,
    true,
  ][step];

  // Aperçu final (et erreurs éventuelles du moteur de règles).
  const preview = useMemo(() => {
    if (step < 6) return null;
    try {
      return { state: buildCharacter(input) as CharacterState, error: null };
    } catch (e) {
      return { state: null, error: (e as Error).message };
    }
  }, [step, input]);

  return (
    <div className="cs-wizard">
      <header className="cs-wizard-head">
        <div>
          <p className="eyebrow">{forName ? `Nouveau personnage pour ${forName}` : "Nouveau personnage"}</p>
          <h2 className="title">{STEPS[step]}</h2>
        </div>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>
            Annuler
          </button>
        )}
      </header>

      <ol className="cs-steps" aria-label="Étapes">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "current" : i < step ? "done" : ""}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)}>
              <span className="cs-step-n">{i < step ? "✓" : i + 1}</span>
              <span className="cs-step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="cs-wizard-body" key={step}>
        {/* 1. Classe */}
        {step === 0 && (
          <div className="stack">
            <p className="muted">
              Ta classe est ton métier d&apos;aventurier : elle décide de ta façon de combattre, de tes pouvoirs et de ce que tu apprendras en montant de
              niveau. <Hint>Tu ne peux pas en changer ensuite. Si tu hésites, le guerrier, le barbare et le roublard sont les plus simples.</Hint>
            </p>
            <div className="cs-cards">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cs-card${input.classId === c.id ? " on" : ""}`}
                  aria-pressed={input.classId === c.id}
                  onClick={() => set({ classId: c.id, answers: {}, baseScores: blankScores() })}
                >
                  <strong className="cs-card-title">{c.name}</strong>
                  <span className="muted small">{c.pitch}</span>
                  <span className="cs-card-meta">
                    <span className="chip">d{c.hitDie}</span>
                    <span className="chip chip-accent">{c.primary.map(abilityShort).join(" / ")}</span>
                    {c.caster && <span className="chip">magie</span>}
                  </span>
                </button>
              ))}
            </div>
            {cls && (
              <div className="cs-detail">
                <h3 className="subtitle">{cls.name}</h3>
                <dl className="cs-detail-grid">
                  <div>
                    <dt>
                      Dé de vie <Hint>Plus il est gros, plus tu as de points de vie.</Hint>
                    </dt>
                    <dd>d{cls.hitDie}</dd>
                  </div>
                  <div>
                    <dt>Caractéristique principale</dt>
                    <dd>{cls.primary.map(abilityName).join(" et ")}</dd>
                  </div>
                  <div>
                    <dt>
                      Sauvegardes <Hint>Les jets pour résister à un danger (poison, sort, chute…) où tu ajoutes ton bonus de maîtrise.</Hint>
                    </dt>
                    <dd>{cls.saves.map(abilityName).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Armures</dt>
                    <dd>{cls.armor.length ? cls.armor.map((a) => ({ light: "légères", medium: "intermédiaires", heavy: "lourdes", shield: "boucliers" })[a]).join(", ") : "aucune"}</dd>
                  </div>
                  <div>
                    <dt>Armes</dt>
                    <dd>{cls.weapons}</dd>
                  </div>
                </dl>
                <h4 className="cs-h4">Au niveau 1</h4>
                <ul className="cs-features compact">
                  {cls.levels[1].map((f) => (
                    <li key={f.name}>
                      <strong>{f.name}</strong> <span className="muted">{f.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 2. Espèce */}
        {step === 1 && (
          <div className="stack">
            <p className="muted">Ton espèce te donne des traits innés : vision dans le noir, résistances, petits pouvoirs. Elle ne change pas tes caractéristiques.</p>
            <div className="cs-cards">
              {SPECIES.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className={`cs-card${input.speciesId === sp.id ? " on" : ""}`}
                  aria-pressed={input.speciesId === sp.id}
                  onClick={() =>
                    set({
                      speciesId: sp.id,
                      speciesOptions: {},
                      answers: Object.fromEntries(Object.entries(input.answers).filter(([k]) => ![SPECIES_SKILL_KEY, ORIGIN_FEAT_KEY, SPECIES_SKILLED_KEY].includes(k))),
                    })
                  }
                >
                  <strong className="cs-card-title">{sp.name}</strong>
                  <span className="muted small">{sp.pitch}</span>
                  <span className="cs-card-meta">
                    <span className="chip">{String(sp.speed).replace(".", ",")} m</span>
                    {sp.darkvision > 0 && <span className="chip">vision {sp.darkvision} m</span>}
                  </span>
                </button>
              ))}
            </div>
            {species && (
              <div className="cs-detail">
                <h3 className="subtitle">{species.name}</h3>
                <ul className="cs-features compact">
                  {species.traits.map((t) => (
                    <li key={t.name}>
                      <strong>{t.name}</strong> <span className="muted">{t.desc}</span>
                    </li>
                  ))}
                </ul>
                {species.options?.map((opt) => (
                  <fieldset key={opt.key} className="cs-choice">
                    <legend className="cs-choice-head">
                      <strong>{opt.label}</strong>
                    </legend>
                    <div className="cs-options">
                      {opt.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className={`cs-option${input.speciesOptions[opt.key] === o.id ? " on" : ""}`}
                          aria-pressed={input.speciesOptions[opt.key] === o.id}
                          onClick={() => set({ speciesOptions: { ...input.speciesOptions, [opt.key]: o.id } })}
                        >
                          <strong>{o.name}</strong>
                          <span className="muted small">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {species.originFeat && (
                  <fieldset className="cs-choice">
                    <legend className="cs-choice-head">
                      <strong>Don d&apos;origine (Polyvalent)</strong>
                    </legend>
                    <div className="cs-options">
                      {ORIGIN_FEATS.filter((f) => f.id !== bg?.feat).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`cs-option${humanFeat?.id === f.id ? " on" : ""}`}
                          aria-pressed={humanFeat?.id === f.id}
                          onClick={() => answer(ORIGIN_FEAT_KEY, [f.id])}
                        >
                          <strong>{f.name}</strong>
                          <span className="muted small">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Historique */}
        {step === 2 && (
          <div className="stack">
            <p className="muted">
              Ton historique, c&apos;est ta vie avant l&apos;aventure. Il te donne +3 en caractéristiques, deux compétences, un outil et un don.
            </p>
            <div className="cs-cards">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`cs-card${input.backgroundId === b.id ? " on" : ""}`}
                  aria-pressed={input.backgroundId === b.id}
                  onClick={() =>
                    set({
                      backgroundId: b.id,
                      backgroundBonus: {},
                      answers: Object.fromEntries(Object.entries(input.answers).filter(([k]) => ![BG_SKILLED_KEY, CLASS_SKILLS_KEY].includes(k))),
                    })
                  }
                >
                  <strong className="cs-card-title">{b.name}</strong>
                  <span className="small">{b.skills.map(skillName).join(", ")}</span>
                  <span className="cs-card-meta">
                    <span className="chip chip-accent">{b.abilities.map(abilityShort).join(" ")}</span>
                    <span className="chip">{getFeat(b.feat)?.name}</span>
                  </span>
                </button>
              ))}
            </div>
            {bg && (
              <div className="cs-detail">
                <h3 className="subtitle">{bg.name}</h3>
                <dl className="cs-detail-grid">
                  <div>
                    <dt>Caractéristiques</dt>
                    <dd>{bg.abilities.map(abilityName).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Compétences</dt>
                    <dd>{bg.skills.map(skillName).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Outil</dt>
                    <dd>{bg.tool}</dd>
                  </div>
                  <div>
                    <dt>Don : {bgFeat?.name}</dt>
                    <dd className="muted">{bgFeat?.desc}</dd>
                  </div>
                </dl>
                <p className="muted small">Équipement : {bg.equipment}</p>
              </div>
            )}
          </div>
        )}

        {/* 4. Caractéristiques */}
        {step === 3 && cls && bg && <ScoresStep input={input} set={set} cls={cls.id} error={scoresError ?? bonusError} />}

        {/* 5. Compétences et capacités */}
        {step === 4 && (
          <div className="stack">
            <p className="muted">
              Les compétences maîtrisées ajoutent ton bonus de maîtrise (+2) à tes tests. Ton historique t&apos;en donne déjà :{" "}
              <b>{bg?.skills.map(skillName).join(", ")}</b>.
            </p>
            {skillChoices.map((c) => (
              <ChoicePicker key={c.key} state={draft(c.key)} choice={c} value={input.answers[c.key] ?? []} onChange={(v) => answer(c.key, v)} />
            ))}
          </div>
        )}

        {/* 6. Identité */}
        {step === 5 && (
          <div className="stack">
            <label className="field">
              <span className="label">Nom du personnage</span>
              <input className="input cs-name-input" value={input.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoFocus placeholder="Ex. Lyra Ventvif" />
            </label>
            <label className="field">
              <span className="label">
                Alignement (facultatif) <Hint>Ta boussole morale : bon / neutre / mauvais, loyal / neutre / chaotique.</Hint>
              </span>
              <input className="input" value={identity.alignment} onChange={(e) => setIdentity({ ...identity, alignment: e.target.value })} placeholder="Ex. Chaotique bon" />
            </label>
            <label className="field">
              <span className="label">Personnalité (facultatif)</span>
              <textarea className="input textarea" rows={3} value={identity.personality} onChange={(e) => setIdentity({ ...identity, personality: e.target.value })} placeholder="Un trait, un idéal, un lien, un défaut…" />
            </label>
            <p className="muted small">Tu pourras tout compléter plus tard dans l&apos;onglet « Personnage ».</p>
          </div>
        )}

        {/* 7. Récapitulatif */}
        {step === 6 && preview && (
          <div className="stack">
            {preview.error ? (
              <p className="flash flash-error">{preview.error}</p>
            ) : (
              <Recap state={preview.state!} />
            )}
          </div>
        )}
      </div>

      <footer className="cs-wizard-foot">
        <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← Précédent
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy || !preview || Boolean(preview.error)}
            onClick={() => onCreate({ ...input, identity })}
          >
            {busy ? "Création…" : "✦ Créer le personnage"}
          </button>
        )}
      </footer>
    </div>
  );
}

function ScoresStep({ input, set, cls, error }: { input: CreationInput; set: (p: Partial<CreationInput>) => void; cls: string; error: string | null }) {
  const bg = getBackground(input.backgroundId)!;
  const c = getClass(cls)!;
  const used = Object.values(input.baseScores);
  const bonusMode = Object.values(input.backgroundBonus).filter(Boolean).length === 3 ? "spread" : "focus";
  const final = (a: Ability) => (input.baseScores[a] || 0) + (input.backgroundBonus[a] ?? 0);

  const auto = () => {
    const order = PRIORITY[cls];
    const base = blankScores();
    order.forEach((a, i) => (base[a] = STANDARD_ARRAY[i]));
    // Bonus : +2 sur la meilleure caractéristique de l'historique, +1 sur la suivante.
    const [first, second] = order.filter((a) => bg.abilities.includes(a));
    set({ scoreMethod: "standard", baseScores: base, backgroundBonus: { [first]: 2, [second]: 1 } });
  };

  return (
    <div className="stack-lg">
      <p className="muted">
        Six caractéristiques décrivent ton personnage. Ta classe a surtout besoin de <b>{c.primary.map(abilityName).join(" et ")}</b> : mets-y tes meilleures
        valeurs. <Hint>Le modificateur (+2, −1…) est ce que tu ajoutes à tes dés. Il vaut (valeur − 10) ÷ 2 arrondi en dessous.</Hint>
      </p>

      <div className="cs-row-between">
        <div className="segmented-tabs" role="tablist">
          {(["standard", "pointbuy"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={input.scoreMethod === m}
              className={input.scoreMethod === m ? "on" : ""}
              onClick={() => set({ scoreMethod: m, baseScores: m === "pointbuy" ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } : blankScores() })}
            >
              {m === "standard" ? "Tableau standard" : "Achat de points"}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={auto}>
          ✨ Répartition conseillée
        </button>
      </div>

      {input.scoreMethod === "pointbuy" && (
        <p className="small">
          Points dépensés : <b>{pointBuyCost(input.baseScores)}</b> / {POINT_BUY_BUDGET}{" "}
          <Hint>Chaque valeur commence à 8. Monter coûte de plus en plus cher : 13 coûte 5 points, 14 en coûte 7, 15 en coûte 9.</Hint>
        </p>
      )}

      <div className="cs-score-grid">
        {ABILITIES.map((a) => {
          const isPrimary = c.primary.includes(a.id);
          const value = input.baseScores[a.id];
          return (
            <div key={a.id} className={`cs-score${isPrimary ? " primary" : ""}`}>
              <span className="label">
                {a.name} {isPrimary && <span className="chip chip-accent">principale</span>}
              </span>
              {input.scoreMethod === "standard" ? (
                <select
                  className="input"
                  value={value || ""}
                  onChange={(e) => set({ baseScores: { ...input.baseScores, [a.id]: Number(e.target.value) } })}
                  aria-label={a.name}
                >
                  <option value="">—</option>
                  {STANDARD_ARRAY.filter((v) => v === value || !used.includes(v)).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="stepper-box">
                  <button type="button" disabled={value <= 8} onClick={() => set({ baseScores: { ...input.baseScores, [a.id]: value - 1 } })} aria-label={`${a.name} −1`}>
                    −
                  </button>
                  <output>{value}</output>
                  <button
                    type="button"
                    disabled={value >= 15 || pointBuyCost(input.baseScores) + POINT_BUY_COST[value + 1] - POINT_BUY_COST[value] > POINT_BUY_BUDGET}
                    onClick={() => set({ baseScores: { ...input.baseScores, [a.id]: value + 1 } })}
                    aria-label={`${a.name} +1`}
                  >
                    +
                  </button>
                </div>
              )}
              {bg.abilities.includes(a.id) && (
                <div className="cs-bonus">
                  {(bonusMode === "focus" ? [1, 2] : [1]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`cs-pill${input.backgroundBonus[a.id] === n ? " on" : ""}`}
                      onClick={() => {
                        const next = { ...input.backgroundBonus };
                        if (next[a.id] === n) delete next[a.id];
                        else {
                          if (bonusMode === "focus") for (const k of Object.keys(next) as Ability[]) if (next[k] === n) delete next[k];
                          next[a.id] = n;
                        }
                        set({ backgroundBonus: next });
                      }}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              )}
              <span className="cs-score-final">
                {value ? (
                  <>
                    <b>{final(a.id)}</b> <span className="muted">({fmtMod(mod(final(a.id)))})</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="cs-row-between">
        <p className="small">
          <b>Bonus d&apos;historique ({bg.name})</b> : {bg.abilities.map(abilityShort).join(", ")}{" "}
          <Hint>+2 à l&apos;une et +1 à une autre, ou +1 aux trois. Le résultat ne peut pas dépasser 20.</Hint>
        </p>
        <div className="segmented-tabs small">
          <button type="button" className={bonusMode === "focus" ? "on" : ""} onClick={() => set({ backgroundBonus: {} })}>
            +2 / +1
          </button>
          <button
            type="button"
            className={bonusMode === "spread" ? "on" : ""}
            onClick={() => set({ backgroundBonus: Object.fromEntries(bg.abilities.map((a) => [a, 1])) })}
          >
            +1 / +1 / +1
          </button>
        </div>
      </div>
      {error && <p className="muted small">⚠ {error}</p>}
    </div>
  );
}

function Recap({ state }: { state: CharacterState }) {
  const d = derive(state);
  const cls = getClass(state.classId)!;
  return (
    <div className="stack">
      <div className="cs-recap-hero">
        <div className="cs-portrait big">{state.name.charAt(0).toUpperCase()}</div>
        <div>
          <h3 className="title">{state.name}</h3>
          <p className="muted">
            {getSpecies(state.speciesId)?.name} · {cls.name} niveau 1 · {getBackground(state.backgroundId)?.name}
          </p>
        </div>
      </div>
      <div className="cs-spell-stats">
        <div className="cs-stat">
          <span className="label">Points de vie</span>
          <strong>{d.hpMax}</strong>
        </div>
        <div className="cs-stat">
          <span className="label">Classe d&apos;armure</span>
          <strong>{d.ac.value}</strong>
        </div>
        <div className="cs-stat">
          <span className="label">Initiative</span>
          <strong>{fmtMod(d.initiative)}</strong>
        </div>
        {ABILITIES.map((a) => (
          <div key={a.id} className="cs-stat">
            <span className="label">{a.short}</span>
            <strong>
              {d.scores[a.id]} <span className="muted small">({fmtMod(d.mods[a.id])})</span>
            </strong>
          </div>
        ))}
      </div>
      <p>
        <b>Compétences :</b> {state.skills.map(skillName).join(", ")}
        {state.expertise.length > 0 && <> · <b>Expertise :</b> {state.expertise.map(skillName).join(", ")}</>}
      </p>
      <p>
        <b>Dons :</b> {state.feats.map((f) => getFeat(f.id)?.name).join(", ")}
      </p>
      <p className="muted small">
        L&apos;équipement de départ de ta classe et de ton historique est ajouté à ta fiche. Tu pourras ajuster ton armure et tes armes ensuite.
      </p>
    </div>
  );
}
