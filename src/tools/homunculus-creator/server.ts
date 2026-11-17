/**
 * Entrée « serveur » : données et logique pures, sans composant React ni CSS.
 * À utiliser dans les route handlers, server actions et scripts (jets de dés, validation des fiches).
 */
export { TOOL_META } from "./meta";
export * from "./types";
export { MATIERES } from "./data/matieres";
export { CLASSES } from "./data/classes";
export { ANOMALIES } from "./data/anomalies";
export { FELURES } from "./data/felures";
export { COMPETENCES } from "./data/competences";
export { STATS, STAT_MAX } from "./data/stats";
export { derive, hitPoints, saveDC, proficiency, asiPoints, classeComplete, mod } from "./lib/rules";
export { createInitialState, normalize } from "./lib/state";
export { roll4d5, randomInt } from "./lib/dice";
export { sheetToText } from "./lib/sheet";
