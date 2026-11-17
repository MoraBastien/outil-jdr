export { HomunculusCreator } from "./HomunculusCreator";
export { TOOL_META } from "./meta";
export type { ToolMeta } from "./meta";
export * from "./types";

// Données (lecture seule côté site hôte : listes, pages de référence, validation côté serveur...)
export { MATIERES } from "./data/matieres";
export { CLASSES } from "./data/classes";
export { ANOMALIES } from "./data/anomalies";
export { FELURES } from "./data/felures";
export { COMPETENCES } from "./data/competences";
export { STATS, STAT_MAX } from "./data/stats";
export { CONSTELLATIONS } from "./data/constellations";

// Logique pure : réutilisable côté serveur (validation des fiches, calcul des PV/DD, jets de dés)
export { derive, hitPoints, saveDC, proficiency, asiPoints, classeComplete, mod } from "./lib/rules";
export { createInitialState, normalize } from "./lib/state";
export { roll4d5, clientDice, randomInt } from "./lib/dice";
export { createLocalStorageAdapter } from "./lib/storage";
export { sheetToText } from "./lib/sheet";
