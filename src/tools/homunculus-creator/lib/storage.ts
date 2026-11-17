import type { HomunculusState, HomunculusStorage } from "../types";

/** Registre local (navigateur uniquement). À remplacer par une API quand les comptes existent. */
export function createLocalStorageAdapter(key = "homunculus-creator:fiches"): HomunculusStorage {
  const read = (): HomunculusState[] => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const write = (list: HomunculusState[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* stockage indisponible : on ignore */
    }
  };
  return {
    async list() {
      return read();
    },
    async save(state) {
      write([state, ...read().filter((s) => s.id !== state.id)]);
    },
    async remove(id) {
      write(read().filter((s) => s.id !== id));
    },
  };
}
