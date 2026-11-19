"use client";
// Grimoire : le catalogue des sorts (SRD 5.2), consultable à tout moment, même quand Foundry est éteint.
// Par défaut, les sorts du personnage du joueur (sa classe, les niveaux qu'il peut lancer) ; il peut y choisir
// ses sorts mineurs et ses sorts préparés, qui s'affichent ensuite sur sa fiche.
// Lien direct : /outils/grimoire?sort=<id>&perso=<id du personnage>.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import { SPELLS, type Spell, type SpellClass } from "./data/spells";
import { SPELL_CLASSES, SPELL_CLASS_NAMES, levelName } from "./meta";
import { getGrimoireViewAction, toggleGrimoireSpellAction, type GrimoireCharacter, type GrimoireView } from "./actions";

const SUGGESTIONS = ["feu", "soigne", "téléporte", "réaction", "invisible"];
const LEVELS: [string, string][] = [["all", "Tous"], ["0", "Mineurs"], ["1", "Niveau 1"], ["2", "Niveau 2"]];

/** Recherche sans tenir compte des accents ni de la casse. */
const fold = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const haystack = new Map(SPELLS.map((s) => [s.id, fold([s.name, s.school, s.classes.map((c) => SPELL_CLASS_NAMES[c]).join(" "), s.desc, s.higher ?? ""].join(" "))]));

export default function Grimoire({ player }: { player: ToolPlayer }) {
  const [view, setView] = useState<GrimoireView | null>(null);
  const [charId, setCharId] = useState<string | null>(null);
  const [mine, setMine] = useState(!player.isAdmin);
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState("all");
  const [conc, setConc] = useState(false);
  const [rit, setRit] = useState(false);
  const [cls, setCls] = useState<SpellClass | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const detailRef = useRef<HTMLElement>(null);

  // Vue serveur, puis lien direct éventuel (?sort=…&perso=…).
  useEffect(() => {
    void getGrimoireViewAction().then((v) => {
      setView(v);
      const params = new URLSearchParams(window.location.search);
      const wanted = params.get("perso");
      const first = v.characters.find((c) => c.id === wanted) ?? v.characters[0];
      setCharId(first?.id ?? null);
      if (!first) setMine(false);
      const sort = params.get("sort");
      if (sort && SPELLS.some((s) => s.id === sort)) {
        setSel(sort);
        const spell = SPELLS.find((s) => s.id === sort)!;
        // Un sort hors de la liste du personnage s'ouvre dans « Tous les sorts ».
        if (first && (!spell.classes.includes(first.listClass) || spell.level > first.maxLevel)) setMine(false);
      }
    });
  }, []);

  const character: GrimoireCharacter | null = view?.characters.find((c) => c.id === charId) ?? null;
  const chosen = useMemo(() => new Set(character?.chosen ?? []), [character]);
  const counts = useMemo(() => {
    const list = (character?.chosen ?? []).map((id) => SPELLS.find((s) => s.id === id)).filter(Boolean) as Spell[];
    return { cantrips: list.filter((s) => s.level === 0).length, prepared: list.filter((s) => s.level > 0).length };
  }, [character]);

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    return SPELLS.filter((s) => {
      if (mine && character && (!s.classes.includes(character.listClass) || s.level > character.maxLevel)) return false;
      if (!mine && cls !== "all" && !s.classes.includes(cls)) return false;
      if (lvl !== "all" && String(s.level) !== lvl) return false;
      if (conc && !s.concentration) return false;
      if (rit && !s.ritual) return false;
      return !needle || haystack.get(s.id)!.includes(needle);
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "fr"));
  }, [q, mine, character, cls, lvl, conc, rit]);

  // Sélection par défaut : le premier sort de la liste.
  const current = SPELLS.find((s) => s.id === sel) ?? filtered[0] ?? null;

  const pick = (id: string) => {
    setSel(id);
    if (matchMedia("(max-width: 900px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const toggle = (spell: Spell) => {
    if (!character) return;
    start(async () => {
      const r = await toggleGrimoireSpellAction(character.id, spell.id);
      if (r.ok) {
        setView(r.view);
        setFlash(null);
      } else setFlash(r.error);
    });
  };

  // Ce que le personnage peut faire du sort affiché.
  const status = (() => {
    if (!current || !character) return null;
    const eligible = current.classes.includes(character.listClass) && current.level <= character.maxLevel;
    if (!eligible) return { eligible: false, isChosen: false, label: "" };
    const isChosen = chosen.has(current.id);
    const label = current.level === 0 ? (isChosen ? "Retirer de mes sorts mineurs" : "Apprendre ce sort mineur") : isChosen ? "Retirer de mes sorts préparés" : "Préparer ce sort";
    return { eligible, isChosen, label };
  })();

  return (
    <div className="gm-root stack-lg">
      <header className="stack-xs">
        <p className="eyebrow">Sorts · accessibles en permanence</p>
        <h1 className="title">Grimoire</h1>
        <p className="muted">
          Tous les sorts de niveau 0 à 2 de D&amp;D 2024, même quand Foundry est éteint. Pour les règles du combat et les états, ouvre l&apos;
          <a className="text-link" href="/outils/aide-memoire">
            aide-mémoire
          </a>
          .
        </p>
      </header>

      <div role="search" className="gm-search-box">
        <label htmlFor="gm-q" className="gm-search-label">
          Rechercher un sort
        </label>
        <div className="gm-search-wrap">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="gm-q"
            type="search"
            className="input gm-search"
            placeholder="Nom, école, classe ou effet : « feu », « soigne », « téléporte »…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
          {q && (
            <button type="button" className="btn btn-ghost btn-small gm-clear" onClick={() => setQ("")}>
              Effacer
            </button>
          )}
        </div>
        <div className="gm-suggest">
          <span className="muted small">Essaie :</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip-btn" onClick={() => setQ(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="gm-filters">
        {view && view.characters.length > 0 && (
          <div className="gm-row-chips" role="group" aria-label="Quels sorts">
            {view.characters.map((c) => (
              <button key={c.id} type="button" className="chip-btn" aria-pressed={mine && charId === c.id} onClick={() => (setMine(true), setCharId(c.id))}>
                Pour {c.name} · {c.label}
              </button>
            ))}
            <button type="button" className="chip-btn" aria-pressed={!mine} onClick={() => setMine(false)}>
              Tous les sorts
            </button>
          </div>
        )}
        <div className="gm-row-chips" role="group" aria-label="Filtres">
          {LEVELS.map(([v, label]) => (
            <button key={v} type="button" className="chip-btn" aria-pressed={lvl === v} onClick={() => setLvl(v)}>
              {label}
            </button>
          ))}
          <span className="gm-sep" aria-hidden="true" />
          <button type="button" className="chip-btn" aria-pressed={conc} onClick={() => setConc((x) => !x)}>
            Concentration
          </button>
          <button type="button" className="chip-btn" aria-pressed={rit} onClick={() => setRit((x) => !x)}>
            Rituel
          </button>
          {!mine && (
            <select className="input gm-class" value={cls} onChange={(e) => setCls(e.target.value as SpellClass | "all")} aria-label="Classe">
              <option value="all">Toutes les classes</option>
              {SPELL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {SPELL_CLASS_NAMES[c]}
                </option>
              ))}
            </select>
          )}
        </div>
        {view && !view.isAdmin && view.characters.length === 0 && (
          <p className="muted small">
            {view.nonCasters.length
              ? `${view.nonCasters.join(", ")} ne lance pas de sorts : le grimoire reste à ta disposition pour le plaisir de lire.`
              : "Pas encore de personnage lanceur de sorts : le grimoire reste consultable."}
          </p>
        )}
      </div>

      {flash && (
        <p className="flash flash-error" role="alert">
          {flash}
        </p>
      )}

      <div className="gm-layout">
        <div className="gm-list-col">
          <div className="gm-list-head">
            <span>
              {filtered.length} sort{filtered.length > 1 ? "s" : ""}
            </span>
            {mine && character && (
              <span className="gm-counts">
                Mineurs {counts.cantrips}/{character.cantripsMax} · Préparés {counts.prepared}/{character.preparedMax}
              </span>
            )}
          </div>
          {!view && mine ? (
            <p className="muted">Chargement de tes sorts…</p>
          ) : filtered.length === 0 ? (
            <p className="gm-empty">Aucun sort ne correspond. Essaie un autre mot, retire un filtre ou passe sur « Tous les sorts ».</p>
          ) : (
            <ul className="gm-list">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button type="button" className={`gm-item${current?.id === s.id ? " on" : ""}`} aria-pressed={current?.id === s.id} onClick={() => pick(s.id)}>
                    <span className="gm-lvl" aria-label={levelName(s.level)}>
                      {s.level === 0 ? "M" : s.level}
                    </span>
                    <span className="gm-item-text">
                      <strong>{s.name}</strong>
                      <span className="muted small">
                        {levelName(s.level)} · {s.school}
                        {!mine ? ` · ${s.classes.map((c) => SPELL_CLASS_NAMES[c]).join(", ")}` : ""}
                      </span>
                    </span>
                    {s.concentration && (
                      <span className="gm-tag" title="Concentration">
                        C
                      </span>
                    )}
                    {s.ritual && (
                      <span className="gm-tag" title="Rituel">
                        R
                      </span>
                    )}
                    {mine && chosen.has(s.id) && <span className="gm-chosen">✓ {s.level === 0 ? "connu" : "préparé"}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {current && (view || !mine) && (
          <article ref={detailRef} className="gm-detail" aria-label={`Détail : ${current.name}`}>
            <div className="stack-xs">
              <span className="eyebrow">
                {levelName(current.level)} · {current.school}
                {current.concentration ? " · concentration" : ""}
                {current.ritual ? " · rituel" : ""}
              </span>
              <h2 className="gm-detail-title">{current.name}</h2>
              <span className="muted small">Classes : {current.classes.map((c) => SPELL_CLASS_NAMES[c]).join(", ")}</span>
            </div>
            <dl className="gm-facts">
              <div>
                <dt>Incantation</dt>
                <dd>{current.time}</dd>
              </div>
              <div>
                <dt>Portée</dt>
                <dd>{current.range}</dd>
              </div>
              <div>
                <dt>Composantes</dt>
                <dd>{current.components}</dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{current.duration}</dd>
              </div>
            </dl>
            <p className="gm-desc">{current.desc}</p>
            {current.higher && (
              <div className="gm-higher">
                <strong>{current.level === 0 ? "En progressant" : "Aux niveaux supérieurs"}</strong>
                <p>{current.higher}</p>
              </div>
            )}
            {status && (
              <div className="gm-actions">
                {status.eligible ? (
                  <>
                    <button type="button" className={`btn${status.isChosen ? " btn-ghost" : ""}`} disabled={busy} onClick={() => toggle(current)}>
                      {busy ? "…" : status.label}
                    </button>
                    <span className="muted small">Pour {character!.name} · s&apos;affiche sur sa fiche.</span>
                  </>
                ) : (
                  <span className="muted small">
                    Hors des sorts de {character!.name} ({character!.label}) : lecture seule.
                  </span>
                )}
              </div>
            )}
          </article>
        )}
      </div>

      <p className="gm-license">
        Ce grimoire contient des résumés en français de contenu du System Reference Document 5.2 de Wizards of the Coast LLC, publié sous licence Creative
        Commons Attribution 4.0 (CC-BY-4.0).
      </p>
    </div>
  );
}
