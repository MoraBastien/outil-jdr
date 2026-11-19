"use client";

import "./styles.css";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { CONSTELLATIONS } from "./data/constellations";
import { FELURES } from "./data/felures";
import { Forge } from "./components/Forge";
import { FORGE_DEFAULT, MATIERE_VISUALS } from "./data/forge";
import { Registry } from "./components/Registry";
import { sheetToText } from "./lib/sheet";
import { AnomalieStep, ClasseStep, EchoStep, FelureStep, IdentiteStep, MatiereStep, StatsStep, type StepStatus } from "./components/Steps";
import { clientDice, randomInt } from "./lib/dice";
import { derive } from "./lib/rules";
import { createInitialState, normalize, reducer } from "./lib/state";
import { createLocalStorageAdapter } from "./lib/storage";
import { TOOL_META } from "./meta";
import type { HomunculusCreatorProps, HomunculusState, HomunculusStorage } from "./types";

const newId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `hc-${Date.now().toString(36)}-${randomInt(1e9).toString(36)}`;
  }
};
const randomConstellation = (not?: string) => {
  const pool = CONSTELLATIONS.filter((c) => c.id !== not);
  return pool[randomInt(pool.length)].id;
};

export function HomunculusCreator({
  initialState,
  echo,
  echoLocked = false,
  maxEcho = 4,
  dice = clientDice,
  storage,
  onChange,
  onSubmit,
  submitLabel = "Envoyer la fiche",
  saveLabel = "Enregistrer",
  readOnly = false,
  theme = "auto",
  ambient = false,
  showBeta = true,
  className,
}: HomunculusCreatorProps) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState({ ...initialState, ...(echo ? { echo } : {}) }, maxEcho));
  const derived = useMemo(() => derive(state), [state]);

  // Stockage : registre local par défaut, `null` pour le désactiver.
  const [localAdapter, setLocalAdapter] = useState<HomunculusStorage | null>(null);
  useEffect(() => {
    if (storage === undefined) setLocalAdapter(createLocalStorageAdapter());
  }, [storage]);
  const store: HomunculusStorage | null = storage === undefined ? localAdapter : storage;
  const [fiches, setFiches] = useState<HomunculusState[]>([]);
  const refresh = useCallback(async () => {
    if (store) setFiches(await store.list());
  }, [store]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Après le montage : id de fiche et constellation aléatoire (évite les écarts d'hydratation).
  useEffect(() => {
    dispatch({ type: "hydrate", id: initialState?.id || newId(), constellationId: initialState?.constellationId || randomConstellation() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écho piloté par le site hôte.
  useEffect(() => {
    if (echo != null) dispatch({ type: "setEcho", echo, maxEcho });
  }, [echo, maxEcho]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (state.id) onChangeRef.current?.(state, derived);
  }, [state, derived]);

  // Tirages : toujours via le fournisseur de dés (remplaçable par un appel serveur).
  const [busy, setBusy] = useState<null | "stats" | "felure">(null);
  const [error, setError] = useState<string | null>(null);
  const roll = async (kind: "stats" | "felure") => {
    if (busy || readOnly) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "stats") {
        const pool = await dice.rollStats();
        dispatch({ type: "setPool", pool });
      } else {
        const n = await dice.rollFelure(FELURES.length);
        const f = FELURES[Math.min(Math.max(1, n), FELURES.length) - 1];
        dispatch({ type: "setFelure", id: f.id });
      }
    } catch {
      setError("Le tirage a échoué. Réessaie.");
    } finally {
      setBusy(null);
    }
  };

  // Sauvegarde : bouton visible sous la cuve, avec rappel des modifications non sauvegardées.
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const currentJson = JSON.stringify(state);
  const dirty = Boolean(state.id) && savedJson !== currentJson && (savedJson !== null || derived.steps.some(Boolean) || state.jets > 0);
  const save = async () => {
    if (!store || readOnly || saving === "saving") return;
    setSaving("saving");
    try {
      await store.save(state);
      setSavedJson(JSON.stringify(state));
      await refresh();
      setSaving("saved");
      setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 2200);
    } catch {
      setSaving("idle");
    }
  };

  /** Barre de sauvegarde : sous la cuve (ordinateur) ou collée en bas de l'écran (téléphone). */
  const saveBar = (where: string) =>
    store && !readOnly ? (
      <div className={`hc-savebar ${where}` + (dirty ? " hc-dirty" : "")}>
        <button type="button" className="hc-btn hc-save" onClick={() => void save()} disabled={saving === "saving"}>
          {saving === "saving" ? "Sauvegarde…" : saving === "saved" ? "✓ Sauvegardé" : saveLabel}
        </button>
        <span className="hc-save-state" role="status">
          {saving === "saved" ? "" : dirty ? "Modifications non sauvegardées" : savedJson ? "Tout est sauvegardé" : ""}
        </span>
      </div>
    ) : null;

  const [submitting, setSubmitting] = useState(false);
  const submit = onSubmit
    ? async () => {
        setSubmitting(true);
        try {
          await onSubmit(state, derived);
        } finally {
          setSubmitting(false);
        }
      }
    : undefined;

  const act = readOnly ? () => undefined : dispatch;

  // « Copier la fiche » : texte brut dans le presse-papiers (sinon affiché pour une copie à la main).
  const [copied, setCopied] = useState<null | "ok" | string>(null);
  const copyText = async () => {
    const text = sheetToText(state, derived);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
      setTimeout(() => setCopied((c) => (c === "ok" ? null : c)), 2000);
    } catch {
      setCopied(text);
    }
  };

  // Statut des étapes : l'Écho est toujours posé ; la première étape non terminée est « en cours ».
  const firstTodo = derived.steps.findIndex((x) => !x);
  const status = (i: number): StepStatus => (derived.steps[i] ? "done" : i === firstTodo ? "current" : "todo");

  // Le thème de l'Atelier suit la matière choisie.
  const look = (state.matiereId && MATIERE_VISUALS[state.matiereId]) || FORGE_DEFAULT;
  const themeVars = { "--hc-accent-1": look.accent1, "--hc-accent-2": look.accent2, "--hc-forge-glow": look.glow, "--hc-veil": look.veil } as CSSProperties;

  // Éveil : un éclat sur tout l'Atelier quand la fiche devient complète (pas au chargement d'une fiche finie).
  const [awakening, setAwakening] = useState(false);
  const wasComplete = useRef<boolean | null>(null);
  /** Chargement d'une fiche (registre, nouvelle fiche) : pas d'éveil. */
  const quiet = useRef(false);
  useEffect(() => {
    if (!state.id) return;
    if (quiet.current) {
      quiet.current = false;
      wasComplete.current = derived.complete;
      return;
    }
    if (wasComplete.current === false && derived.complete) {
      setAwakening(true);
      const t = setTimeout(() => setAwakening(false), 2600);
      wasComplete.current = true;
      return () => clearTimeout(t);
    }
    wasComplete.current = derived.complete;
  }, [derived.complete, state.id]);

  return (
    <div
      className={["hc-root", ambient ? "hc-ambient" : "", readOnly ? "hc-readonly" : "", awakening ? "hc-awakening" : "", className ?? ""].filter(Boolean).join(" ")}
      data-theme={theme === "auto" ? undefined : theme}
      data-matter={state.matiereId ?? undefined}
      style={themeVars}
    >
      {ambient && (
        <div className="hc-blobs" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="hc-wrap">
        <header className="hc-top">
          <p className="hc-coord">
            β Orionis · α 05h 14m · δ −08° 12′
            {showBeta && <span className="hc-beta" title={`Version ${TOOL_META.version}`}>Bêta {TOOL_META.version}</span>}
          </p>
          <h2 className="hc-title">{TOOL_META.name}</h2>
          <p className="hc-lead">
            Forge un être venu des étoiles. Chaque choix nourrit la cuve : une matière pour le corps, une classe pour le sceau, des dés pour la force, une
            Anomalie et une Fêlure pour ce que la cuve laisse de travers.
          </p>
        </header>
        <div className="hc-layout">
          <div className="hc-main" style={{ "--hc-progress": derived.steps.filter(Boolean).length / 6 } as CSSProperties}>
            <EchoStep state={state} derived={derived} dispatch={act} maxEcho={maxEcho} locked={echoLocked || echo != null} status="done" />
            <MatiereStep state={state} dispatch={act} status={status(0)} />
            <ClasseStep state={state} dispatch={act} status={status(1)} />
            <StatsStep state={state} dispatch={act} onRoll={() => roll("stats")} busy={busy === "stats"} error={busy === null ? error : null} status={status(2)} />
            <AnomalieStep state={state} dispatch={act} status={status(3)} />
            <FelureStep state={state} onRoll={() => roll("felure")} busy={busy === "felure"} error={busy === null ? error : null} status={status(4)} />
            <IdentiteStep state={state} dispatch={act} readOnly={readOnly} status={status(5)} />
          </div>
          <aside className="hc-side">
            <Forge state={state} derived={derived} awakening={awakening} />
            {saveBar("hc-savebar-side")}
            {/* La cuve suffit à montrer l'être : plus de « fiche de cuve ». Ses actions restent ici. */}
            <div className="hc-tools">
              {!readOnly && (
                <button
                  type="button"
                  className="hc-btn hc-ghost hc-small"
                  onClick={() => {
                    if (dirty && !window.confirm("Commencer un nouvel homunculus ? Les modifications non sauvegardées seront perdues.")) return;
                    quiet.current = true;
                    setSavedJson(null);
                    dispatch({ type: "reset", id: newId(), constellationId: randomConstellation(state.constellationId), echo: echo ?? 1 });
                  }}
                >
                  ✦ Nouveau
                </button>
              )}
              <button type="button" className="hc-btn hc-ghost hc-small" onClick={() => void copyText()}>
                {copied === "ok" ? "✓ Copiée" : "Copier la fiche"}
              </button>
              {submit && (
                <button type="button" className="hc-btn hc-small" onClick={() => void submit()} disabled={!derived.complete || submitting || readOnly}>
                  {submitting ? "Envoi…" : submitLabel}
                </button>
              )}
            </div>
            {copied && copied !== "ok" && (
              <textarea className="hc-copybox" readOnly value={copied} onFocus={(e) => e.currentTarget.select()} aria-label="Texte de la fiche" />
            )}
          </aside>
        </div>
        {saveBar("hc-savebar-float")}
        {store && (
          <Registry
            fiches={fiches}
            onLoad={(s) => {
              quiet.current = true;
              // Fiche déjà sauvegardée : même normalisation que le réducteur, dans le même rendu (pas de clignotement).
              setSavedJson(JSON.stringify(normalize(s, maxEcho)));
              dispatch({ type: "load", state: s, maxEcho });
            }}
            onRemove={async (s) => {
              await store.remove(s.id);
              await refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
