/** Identité de l'outil, à utiliser par le site hôte (registre d'outils, menu, badge). */
export const TOOL_META = {
  id: "homunculus-creator",
  name: "Atelier de Rigel",
  description: "Création d'homunculus pour les one-shots liés à Rigel Sterne, l'Astronome (D&D 5e).",
  version: "0.2.0-beta",
  status: "beta",
  schemaVersion: 1,
} as const;

export type ToolMeta = typeof TOOL_META;
