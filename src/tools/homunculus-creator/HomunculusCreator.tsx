"use client";

import "./styles.css";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CONSTELLATIONS } from "./data/constellations";
import { FELURES } from "./data/felures";
import { Constellation } from "./components/Constellation";
import { Registry } from "./components/Registry";
import { Sheet } from "./components/Sheet";
import { AnomalieStep, ClasseStep, EchoStep, FelureStep, IdentiteStep, MatiereStep, StatsStep } from "./components/Steps";
import { clientDice, randomInt } from "./lib/dice";
import { derive } from "./lib/rules";
import { createInitialState, reducer } from "./lib/state";
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

  return (
    <div className={["hc-root", ambient ? "hc-ambient" : "", readOnly ? "hc-readonly" : "", className ?? ""].filter(Boolean).join(" ")} data-theme={theme === "auto" ? undefined : theme}>
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
          <p className="hc-lead">Fabrique un homunculus comme un personnage D&amp;D : une matière à la place de la race, une classe, des stats tirées aux dés, une Anomalie à la place du background, et une Fêlure tirée au sort.</p>
        </header>
        <div className="hc-layout">
          <div className="hc-main">
            <EchoStep state={state} derived={derived} dispatch={act} maxEcho={maxEcho} locked={echoLocked || echo != null} />
            <MatiereStep state={state} dispatch={act} />
            <ClasseStep state={state} dispatch={act} />
            <StatsStep state={state} dispatch={act} onRoll={() => roll("stats")} busy={busy === "stats"} error={busy === null ? error : null} />
            <AnomalieStep state={state} dispatch={act} />
            <FelureStep state={state} onRoll={() => roll("felure")} busy={busy === "felure"} error={busy === null ? error : null} />
            <IdentiteStep state={state} dispatch={act} readOnly={readOnly} />
          </div>
          <aside className="hc-side">
            <Constellation constellationId={state.constellationId} steps={derived.steps} />
            <Sheet
              state={state}
              derived={derived}
              canSave={!!store}
              onSave={async () => {
                if (!store) return;
                await store.save(state);
                await refresh();
              }}
              onReset={() => dispatch({ type: "reset", id: newId(), constellationId: randomConstellation(state.constellationId), echo: echo ?? 1 })}
              onSubmit={submit}
              submitLabel={submitLabel}
              submitting={submitting}
              readOnly={readOnly}
            />
          </aside>
        </div>
        {store && (
          <Registry
            fiches={fiches}
            onLoad={(s) => dispatch({ type: "load", state: s, maxEcho })}
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
