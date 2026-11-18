"use client";
// Fiche de personnage D&D 5.5 : bandeau, valeurs de combat, puis onglets (inspirés de la fiche officielle 2024).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ABILITIES, abilityShort } from "../data/abilities";
import { getClass, getSubclass } from "../data/classes";
import { ARMORS, MASTERY_HELP, WEAPONS } from "../data/equipment";
import { getFeat } from "../data/feats";
import { getBackground, getSpecies } from "../data/origins";
import { armorTraining, derive, fmtMod, weaponFromCatalog } from "../rules";
import type { CharacterRecord, CharacterState, Weapon } from "../types";
import Hint from "./Hint";

type Patch = Partial<CharacterState>;
type TabId = "stats" | "combat" | "features" | "spells" | "gear" | "story" | "history";

const MASTERY_COUNT: Record<string, number[]> = {
  barbarian: [2, 2, 2, 3],
  fighter: [3, 3, 3, 4],
  paladin: [2, 2, 2, 2],
  ranger: [2, 2, 2, 2],
  rogue: [2, 2, 2, 2],
};
const TRAINING_LABEL = { light: "Légères", medium: "Intermédiaires", heavy: "Lourdes", shield: "Boucliers" } as const;
const fmtMeters = (m: number) => `${String(m).replace(".", ",")} m`;

/* ---------- Champs qui enregistrent à la sortie ---------- */

function TextField({ value, onCommit, multiline, disabled, placeholder, rows = 4, label }: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  label: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const props = {
    className: `input${multiline ? " textarea" : ""}`,
    value: v,
    disabled,
    placeholder,
    "aria-label": label,
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: () => v !== value && onCommit(v),
  };
  return multiline ? <textarea rows={rows} {...props} /> : <input {...props} />;
}

function Section({ title, hint, children, actions }: { title: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="cs-section">
      <header className="cs-section-head">
        <h3>
          {title} {hint && <Hint label={`À quoi sert : ${title}`}>{hint}</Hint>}
        </h3>
        {actions}
      </header>
      {children}
    </section>
  );
}

/* ---------- Fiche ---------- */

export default function Sheet({
  record,
  editable,
  onSave,
  onLevelUp,
  canLevelUp,
}: {
  record: CharacterRecord;
  editable: boolean;
  onSave: (patch: Patch) => Promise<boolean>;
  onLevelUp?: () => void;
  canLevelUp: boolean;
}) {
  const [s, setS] = useState<CharacterState>(record.state);
  useEffect(() => setS(record.state), [record.state]);
  const d = useMemo(() => derive(s), [s]);
  const cls = getClass(s.classId)!;
  const sub = getSubclass(s.classId, s.subclassId);
  const species = getSpecies(s.speciesId);
  const bg = getBackground(s.backgroundId);
  const [tab, setTab] = useState<TabId>("stats");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  // Enregistrement : immédiat pour un champ, regroupé (600 ms) pour l'état en jeu (PV, emplacements…).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Patch>({});
  const flush = async () => {
    const p = pending.current;
    pending.current = {};
    if (Object.keys(p).length === 0) return;
    setSaving("saving");
    const ok = await onSave(p);
    setSaving(ok ? "saved" : "idle");
  };
  const patch = (p: Patch, debounce = false) => {
    if (!editable) return;
    setS((cur) => ({ ...cur, ...p }));
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, debounce ? 600 : 0);
  };
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const play = (p: Partial<CharacterState["play"]>) => patch({ play: { ...s.play, ...p } }, true);

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats", label: "Caractéristiques" },
    { id: "combat", label: "Combat" },
    { id: "features", label: "Capacités" },
    ...(d.spell ? [{ id: "spells" as const, label: "Sorts" }] : []),
    { id: "gear", label: "Équipement" },
    { id: "story", label: "Personnage" },
    { id: "history", label: "Évolution" },
  ];

  const hpRatio = d.hpMax ? s.play.hp / d.hpMax : 0;

  return (
    <div className="cs-sheet">
      {/* Bandeau */}
      <header className="cs-banner">
        <div className="cs-portrait" aria-hidden="true">
          {s.name.trim().charAt(0).toUpperCase() || "?"}
          <span className="cs-level">{s.level}</span>
        </div>
        <div className="cs-ident">
          {editable ? (
            <TextField value={s.name} onCommit={(v) => patch({ name: v })} label="Nom du personnage" />
          ) : (
            <h2 className="cs-name">{s.name}</h2>
          )}
          <p className="cs-sub">
            {species?.name}
            {s.speciesOptions.lineage && ` (${species?.options?.find((o) => o.key === "lineage")?.options.find((o) => o.id === s.speciesOptions.lineage)?.name})`} ·{" "}
            <b>{cls.name}</b>
            {sub && ` · ${sub.name}`} · niveau {s.level} · {bg?.name}
          </p>
        </div>
        <div className="cs-banner-actions">
          {canLevelUp && onLevelUp && (
            <button type="button" className="btn levelup-btn" onClick={onLevelUp}>
              ✦ Monter de niveau
            </button>
          )}
          {editable && <span className={`cs-save-state ${saving}`}>{saving === "saving" ? "Enregistrement…" : saving === "saved" ? "Enregistré" : ""}</span>}
        </div>
      </header>

      {/* Valeurs de combat */}
      <div className="cs-vitals">
        <div className="cs-tile cs-ac">
          <span className="label">
            Classe d&apos;armure <Hint>Le nombre qu&apos;un ennemi doit atteindre pour te toucher. Ici : {d.ac.formula}.</Hint>
          </span>
          <strong className="cs-big">{d.ac.value}</strong>
          {s.shield && <span className="muted small">avec bouclier</span>}
        </div>

        <div className="cs-tile cs-hp">
          <span className="label">
            Points de vie{" "}
            <Hint>
              Tes PV max : {d.hpFormula}. À 0 PV tu tombes inconscient et fais des jets contre la mort. Les PV temporaires partent en premier et ne se
              cumulent pas.
            </Hint>
          </span>
          <div className="cs-hp-row">
            <button type="button" className="icon-btn" disabled={!editable || s.play.hp <= 0} onClick={() => play({ hp: s.play.hp - 1 })} aria-label="Perdre 1 PV">
              −
            </button>
            <strong className="cs-big">
              {s.play.hp}
              <span className="cs-max">/{d.hpMax}</span>
            </strong>
            <button type="button" className="icon-btn" disabled={!editable || s.play.hp >= d.hpMax} onClick={() => play({ hp: s.play.hp + 1 })} aria-label="Récupérer 1 PV">
              +
            </button>
          </div>
          <div className="cs-hpbar" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(1, hpRatio)) * 100}%` }} className={hpRatio <= 0.25 ? "low" : hpRatio <= 0.5 ? "mid" : ""} />
          </div>
          <label className="cs-temp small">
            Temporaires
            <input
              type="number"
              className="input cs-num"
              min={0}
              value={s.play.tempHp}
              disabled={!editable}
              onChange={(e) => play({ tempHp: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          {editable && <HpQuick hp={s.play.hp} max={d.hpMax} temp={s.play.tempHp} onChange={(hp, tempHp) => play({ hp, tempHp })} />}
        </div>

        <div className="cs-tile">
          <span className="label">
            Dés de vie <Hint>Pendant un repos court, dépense des dés de vie pour récupérer des PV (dé + CON chacun). Ils reviennent après un repos long.</Hint>
          </span>
          <strong className="cs-big">
            {s.level - s.play.hitDiceSpent}
            <span className="cs-max">/{s.level}</span>
          </strong>
          <span className="muted small">d{d.hitDie}</span>
          <div className="cs-dots">
            {Array.from({ length: s.level }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`cs-dot${i < s.play.hitDiceSpent ? " used" : ""}`}
                disabled={!editable}
                aria-label={`Dé de vie ${i + 1}${i < s.play.hitDiceSpent ? " (dépensé)" : ""}`}
                onClick={() => play({ hitDiceSpent: i < s.play.hitDiceSpent ? i : i + 1 })}
              />
            ))}
          </div>
        </div>

        <div className="cs-tile">
          <span className="label">
            Jets contre la mort <Hint>À 0 PV, lance un d20 à chaque tour : 10 ou plus = succès. 3 succès : tu te stabilises. 3 échecs : tu meurs. Un 20 te relève avec 1 PV.</Hint>
          </span>
          <div className="cs-death">
            <span className="small">Succès</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`cs-dot ok${s.play.deathSuccess >= n ? " used" : ""}`}
                disabled={!editable}
                aria-label={`Succès ${n}`}
                onClick={() => play({ deathSuccess: s.play.deathSuccess >= n ? n - 1 : n })}
              />
            ))}
          </div>
          <div className="cs-death">
            <span className="small">Échecs</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`cs-dot ko${s.play.deathFail >= n ? " used" : ""}`}
                disabled={!editable}
                aria-label={`Échec ${n}`}
                onClick={() => play({ deathFail: s.play.deathFail >= n ? n - 1 : n })}
              />
            ))}
          </div>
        </div>

        <div className="cs-stats-row">
          <Stat label="Initiative" value={fmtMod(d.initiative)} hint={`Ton bonus au d20 pour savoir qui agit en premier : DEX${s.feats.some((f) => f.id === "alert") ? " + maîtrise (Vigilant)" : ""}.`} />
          <Stat label="Vitesse" value={fmtMeters(d.speed)} hint="La distance que tu parcours pendant ton tour (une case = 1,5 m)." />
          <Stat label="Maîtrise" value={fmtMod(d.prof)} hint="Ajouté à tout ce que tu maîtrises : attaques avec tes armes, sorts, compétences et sauvegardes cochées. +2 du niveau 1 au 4." />
          <Stat label="Perception passive" value={String(d.passivePerception)} hint="10 + ta Perception. Le MJ s'en sert pour savoir ce que tu remarques sans chercher." />
          <Stat label="Taille" value={d.size} />
          {d.darkvision > 0 && <Stat label="Vision dans le noir" value={fmtMeters(d.darkvision)} hint="Tu vois dans le noir comme en faible lumière, en nuances de gris." />}
          <button
            type="button"
            className={`cs-inspiration${s.play.inspiration ? " on" : ""}`}
            disabled={!editable}
            aria-pressed={s.play.inspiration}
            onClick={() => play({ inspiration: !s.play.inspiration })}
            title="Inspiration héroïque : dépense-la pour relancer un dé. Ton MJ te la donne pour un beau moment de jeu."
          >
            <span aria-hidden="true">✦</span> Inspiration héroïque
          </button>
        </div>
      </div>

      {/* Onglets */}
      <nav className="cs-tabs" role="tablist" aria-label="Sections de la fiche">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`cs-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="cs-panel" key={tab} role="tabpanel">
        {tab === "stats" && (
          <div className="cs-abilities">
            {ABILITIES.map((a) => {
              const save = d.saves[a.id];
              return (
                <div key={a.id} className="cs-ability">
                  <div className="cs-ability-head">
                    <span className="cs-ab-name">
                      {a.name}{" "}
                      <Hint>
                        {a.desc} Modificateur = (valeur − 10) ÷ 2, arrondi en dessous : {d.scores[a.id]} donne {fmtMod(d.mods[a.id])}.
                      </Hint>
                    </span>
                    <span className="cs-ab-mod">{fmtMod(d.mods[a.id])}</span>
                    <span className="cs-ab-score">{d.scores[a.id]}</span>
                  </div>
                  <ul className="cs-skill-list">
                    <li className={save.proficient ? "prof" : ""}>
                      <span className="cs-mark" aria-label={save.proficient ? "maîtrisé" : "non maîtrisé"} />
                      <span>Sauvegarde</span>
                      <b>{fmtMod(save.value)}</b>
                    </li>
                    {d.skills
                      .filter((sk) => sk.ability === a.id)
                      .map((sk) => (
                        <li key={sk.id} className={sk.level}>
                          <span className="cs-mark" aria-label={sk.level === "expert" ? "expertise" : sk.level === "prof" ? "maîtrisé" : sk.level === "half" ? "touche-à-tout" : "non maîtrisé"} />
                          <span>{sk.name}</span>
                          <b>{fmtMod(sk.value)}</b>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
            <p className="cs-legend muted small">
              <span className="cs-mark prof" /> maîtrisé (+{d.prof}) <span className="cs-mark expert" /> expertise (+{d.prof * 2})
              {s.classId === "bard" && s.level >= 2 && (
                <>
                  {" "}
                  <span className="cs-mark half" /> touche-à-tout (+{Math.floor(d.prof / 2)})
                </>
              )}
              <Hint>Pour un test, lance un d20 et ajoute le bonus de la compétence. Le MJ te dit quelle compétence utiliser.</Hint>
            </p>
          </div>
        )}

        {tab === "combat" && (
          <div className="stack-lg">
            <Section
              title="Armes et attaques"
              hint="Pour attaquer : d20 + bonus d'attaque. Si tu atteins la CA de la cible, lance les dégâts. Un 20 naturel est un critique : les dés de dégâts sont doublés."
            >
              <WeaponTable state={s} weapons={d.weapons} editable={editable} onChange={(weapons) => patch({ weapons })} />
            </Section>
            <Section title="Armure" hint={`CA actuelle : ${d.ac.formula}.`}>
              <div className="cs-armor">
                <select className="input" value={s.armorId} disabled={!editable} onChange={(e) => patch({ armorId: e.target.value })} aria-label="Armure">
                  {ARMORS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.type !== "none" ? ` (${TRAINING_LABEL[a.type]}, CA ${a.base}${a.dexMax === 0 ? "" : " + DEX"}${a.dexMax ? ` max ${a.dexMax}` : ""})` : ""}
                    </option>
                  ))}
                </select>
                <label className="check">
                  <input type="checkbox" checked={s.shield} disabled={!editable} onChange={(e) => patch({ shield: e.target.checked })} /> Bouclier (+2)
                </label>
              </div>
              {d.ac.warnings.map((w) => (
                <p key={w} className="flash flash-error small">
                  {w}
                </p>
              ))}
            </Section>
            {d.resources.length > 0 && (
              <Section title="Ressources de classe">
                <div className="cs-resources">
                  {d.resources.map((r) => (
                    <div key={r.name} className="cs-resource">
                      <span className="label">
                        {r.name} <Hint>{r.help}</Hint>
                      </span>
                      <strong>{r.value}</strong>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "features" && (
          <div className="stack-lg">
            <Section title={`Capacités de ${cls.name.toLowerCase()}`} hint="Ce que ta classe te permet de faire. Clique sur « ? » pour un conseil.">
              <ol className="cs-features">
                {d.features.map((f) => (
                  <li key={`${f.level}-${f.name}`}>
                    <span className="cs-feat-level">Niv. {f.level}</span>
                    <div className="stack-xs">
                      <strong>
                        {f.name} {f.source !== cls.name && <span className="chip chip-accent">{f.source}</span>}{" "}
                        {f.tip && <Hint label={`Conseil : ${f.name}`}>{f.tip}</Hint>}
                      </strong>
                      <span className="muted">{f.desc}</span>
                      {f.picked && <span className="small cs-picked">Ton choix : {f.picked}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
            <Section title={`Traits d'espèce · ${species?.name}`}>
              <ul className="cs-features">
                {species?.traits.map((t) => (
                  <li key={t.name}>
                    <div className="stack-xs">
                      <strong>{t.name}</strong>
                      <span className="muted">{t.desc}</span>
                    </div>
                  </li>
                ))}
                {Object.entries(s.speciesOptions).map(([k, v]) => {
                  const opt = species?.options?.find((o) => o.key === k);
                  const o = opt?.options.find((x) => x.id === v);
                  return o ? (
                    <li key={k}>
                      <div className="stack-xs">
                        <strong>
                          {opt!.label} : {o.name}
                        </strong>
                        <span className="muted">{o.desc}</span>
                      </div>
                    </li>
                  ) : null;
                })}
              </ul>
            </Section>
            <Section title="Dons" hint="Des talents particuliers. Ton historique t'en donne un au niveau 1.">
              <ul className="cs-features">
                {s.feats.map((f) => {
                  const feat = getFeat(f.id);
                  return (
                    <li key={f.id}>
                      <div className="stack-xs">
                        <strong>
                          {feat?.name ?? f.id} <span className="chip">{f.source}</span>
                          {f.ability && <span className="chip chip-ok">{abilityShort(f.ability)} +1</span>}
                        </strong>
                        <span className="muted">{feat?.desc}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        )}

        {tab === "spells" && d.spell && (
          <div className="stack-lg">
            <div className="cs-spell-stats">
              <Stat label="Caractéristique" value={abilityShort(d.spell.ability)} hint="La caractéristique de ta magie." />
              <Stat label="DD des sorts" value={String(d.spell.dc)} hint={`Ce que les cibles doivent atteindre à leur sauvegarde : 8 + maîtrise + ${abilityShort(d.spell.ability)}.`} />
              <Stat label="Attaque de sort" value={fmtMod(d.spell.attack)} hint={`Pour les sorts qui demandent un jet d'attaque : d20 + maîtrise + ${abilityShort(d.spell.ability)}.`} />
              <Stat label="Sorts mineurs" value={String(d.spell.cantrips)} hint="Des sorts que tu lances à volonté, sans emplacement." />
              <Stat label="Sorts préparés" value={String(d.spell.prepared)} hint="Le nombre de sorts de niveau 1+ que tu peux avoir prêts. Lancer l'un d'eux dépense un emplacement." />
            </div>
            <Section
              title={d.spell.pactLevel ? `Emplacements de pacte (niveau ${d.spell.pactLevel})` : "Emplacements de sorts"}
              hint={d.spell.pactLevel ? "Tes emplacements reviennent après un repos court ou long." : "Chaque sort de niveau 1 ou plus dépense un emplacement. Ils reviennent après un repos long."}
            >
              <div className="cs-slots">
                {d.spell.slots.map((n, i) => (
                  <div key={i} className="cs-slot-row">
                    <span className="label">Niveau {d.spell!.pactLevel ?? i + 1}</span>
                    {Array.from({ length: n }, (_, j) => {
                      const used = (s.play.slotsUsed[i] ?? 0) > j;
                      return (
                        <button
                          key={j}
                          type="button"
                          className={`cs-dot slot${used ? " used" : ""}`}
                          disabled={!editable}
                          aria-label={`Emplacement ${j + 1}${used ? " (utilisé)" : ""}`}
                          onClick={() => {
                            const next = [...s.play.slotsUsed];
                            next[i] = used ? j : j + 1;
                            play({ slotsUsed: next });
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
                {editable && (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => play({ slotsUsed: s.play.slotsUsed.map(() => 0) })}>
                    Repos : tout récupérer
                  </button>
                )}
              </div>
            </Section>
            <div className="grid-2">
              <Section title={`Sorts mineurs (${d.spell.cantrips})`}>
                <TextField multiline rows={6} value={s.cantrips} onCommit={(v) => patch({ cantrips: v })} disabled={!editable} label="Sorts mineurs" placeholder="Un sort par ligne" />
              </Section>
              <Section title={`Sorts préparés (${d.spell.prepared})`}>
                <TextField multiline rows={6} value={s.spells} onCommit={(v) => patch({ spells: v })} disabled={!editable} label="Sorts préparés" placeholder="Un sort par ligne" />
              </Section>
            </div>
          </div>
        )}

        {tab === "gear" && (
          <div className="stack-lg">
            <Section title="Formations et maîtrises" hint="Ce que ton personnage sait utiliser correctement.">
              <dl className="cs-training">
                <div>
                  <dt>Armures</dt>
                  <dd>{[...armorTraining(s)].map((t) => TRAINING_LABEL[t]).join(", ") || "Aucune"}</dd>
                </div>
                <div>
                  <dt>Armes</dt>
                  <dd>{cls.weapons}</dd>
                </div>
                <div>
                  <dt>Outils</dt>
                  <dd>
                    <TextField value={s.tools} onCommit={(v) => patch({ tools: v })} disabled={!editable} label="Outils" />
                  </dd>
                </div>
                <div>
                  <dt>Langues</dt>
                  <dd>
                    <TextField value={s.languages} onCommit={(v) => patch({ languages: v })} disabled={!editable} label="Langues" />
                  </dd>
                </div>
                {MASTERY_COUNT[s.classId] && (
                  <div>
                    <dt>
                      Armes maîtrisées ({MASTERY_COUNT[s.classId][s.level - 1]}){" "}
                      <Hint>
                        Tu utilises la propriété de maîtrise de ces armes. {Object.entries(MASTERY_HELP).map(([k, v]) => `${k} : ${v}`).join(" ")}
                      </Hint>
                    </dt>
                    <dd>
                      <TextField value={s.masteries} onCommit={(v) => patch({ masteries: v })} disabled={!editable} label="Armes maîtrisées" placeholder="Ex. Épée courte, arc court" />
                    </dd>
                  </div>
                )}
              </dl>
            </Section>
            <Section title="Équipement">
              <TextField multiline rows={6} value={s.equipment} onCommit={(v) => patch({ equipment: v })} disabled={!editable} label="Équipement" />
            </Section>
            <Section title="Bourse" hint="1 po = 10 pa = 100 pc. 1 pp = 10 po. 1 pe = 5 pa.">
              <div className="cs-coins">
                {(["pp", "po", "pe", "pa", "pc"] as const).map((k) => (
                  <label key={k} className="cs-coin">
                    <span className={`cs-coin-badge ${k}`}>{k}</span>
                    <input
                      type="number"
                      min={0}
                      className="input cs-num"
                      value={s.coins[k]}
                      disabled={!editable}
                      onChange={(e) => patch({ coins: { ...s.coins, [k]: Math.max(0, Number(e.target.value) || 0) } }, true)}
                    />
                  </label>
                ))}
              </div>
            </Section>
          </div>
        )}

        {tab === "story" && (
          <div className="grid-2">
            <Section title="Alignement">
              <TextField value={s.identity.alignment} onCommit={(v) => patch({ identity: { ...s.identity, alignment: v } })} disabled={!editable} label="Alignement" placeholder="Ex. Neutre bon" />
            </Section>
            <Section title="Apparence">
              <TextField multiline value={s.identity.appearance} onCommit={(v) => patch({ identity: { ...s.identity, appearance: v } })} disabled={!editable} label="Apparence" />
            </Section>
            <Section title="Personnalité">
              <TextField multiline value={s.identity.personality} onCommit={(v) => patch({ identity: { ...s.identity, personality: v } })} disabled={!editable} label="Personnalité" placeholder="Traits, idéaux, liens, défauts…" />
            </Section>
            <Section title="Histoire">
              <TextField multiline value={s.identity.backstory} onCommit={(v) => patch({ identity: { ...s.identity, backstory: v } })} disabled={!editable} label="Histoire" />
            </Section>
            <Section title="Notes">
              <TextField multiline rows={6} value={s.notes} onCommit={(v) => patch({ notes: v })} disabled={!editable} label="Notes" />
            </Section>
          </div>
        )}

        {tab === "history" && (
          <ol className="cs-timeline">
            {[...s.history].reverse().map((h) => (
              <li key={`${h.level}-${h.at}`}>
                <span className="cs-tl-level">Niv. {h.level}</span>
                <div className="stack-xs">
                  <span className="muted small">{new Date(h.at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</span>
                  <ul>
                    {h.summary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="cs-stat">
      <span className="label">
        {label} {hint && <Hint label={`À quoi sert : ${label}`}>{hint}</Hint>}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

/** Dégâts / soins rapides : les dégâts entament d'abord les PV temporaires. */
function HpQuick({ hp, max, temp, onChange }: { hp: number; max: number; temp: number; onChange: (hp: number, temp: number) => void }) {
  const [n, setN] = useState("");
  const amount = Math.max(0, Math.floor(Number(n) || 0));
  return (
    <div className="cs-hp-quick">
      <input className="input cs-num" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} placeholder="0" aria-label="Montant" />
      <button
        type="button"
        className="btn btn-ghost btn-small cs-dmg"
        disabled={!amount}
        onClick={() => {
          const fromTemp = Math.min(temp, amount);
          onChange(Math.max(0, hp - (amount - fromTemp)), temp - fromTemp);
          setN("");
        }}
      >
        Dégâts
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-small cs-heal"
        disabled={!amount}
        onClick={() => {
          onChange(Math.min(max, hp + amount), temp);
          setN("");
        }}
      >
        Soins
      </button>
    </div>
  );
}

function WeaponTable({
  state,
  weapons,
  editable,
  onChange,
}: {
  state: CharacterState;
  weapons: (Weapon & { attack: number; damageText: string })[];
  editable: boolean;
  onChange: (w: Weapon[]) => void;
}) {
  const strip = (list: typeof weapons): Weapon[] => list.map(({ attack: _a, damageText: _d, ...w }) => w);
  const [pick, setPick] = useState("");
  return (
    <div className="stack">
      <div className="cs-weapons" role="table" aria-label="Armes">
        <div className="cs-weapon head" role="row">
          <span role="columnheader">Arme</span>
          <span role="columnheader">Attaque</span>
          <span role="columnheader">Dégâts</span>
          <span role="columnheader">Notes</span>
          <span />
        </div>
        {weapons.map((w) => (
          <div key={w.key} className="cs-weapon" role="row">
            <strong role="cell">
              {w.name}
              {!w.proficient && (
                <span className="chip chip-warn" title="Non maîtrisée : pas de bonus de maîtrise">
                  non maîtrisée
                </span>
              )}
            </strong>
            <span role="cell" className="cs-atk">
              {fmtMod(w.attack)}
            </span>
            <span role="cell">{w.damageText}</span>
            <span role="cell" className="muted small">
              {w.notes}
            </span>
            {editable ? (
              <button type="button" className="icon-btn danger-text" aria-label={`Retirer ${w.name}`} onClick={() => onChange(strip(weapons.filter((x) => x.key !== w.key)))}>
                ×
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        {weapons.length === 0 && <p className="muted small">Aucune arme.</p>}
      </div>
      {editable && (
        <div className="inline-form">
          <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Ajouter une arme">
            <option value="">Ajouter une arme…</option>
            <optgroup label="Armes courantes">
              {WEAPONS.filter((w) => w.category === "simple").map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.damage})
                </option>
              ))}
            </optgroup>
            <optgroup label="Armes de guerre">
              {WEAPONS.filter((w) => w.category === "martial").map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.damage})
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            className="btn btn-small"
            disabled={!pick}
            onClick={() => {
              const w = weaponFromCatalog(state, pick, `w${Date.now()}`);
              if (w) onChange([...strip(weapons), w]);
              setPick("");
            }}
          >
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}
