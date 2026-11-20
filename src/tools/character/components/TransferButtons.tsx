"use client";
// Boutons d'export d'une fiche (format de l'outil, ou acteur Foundry VTT) et lecture d'un fichier à importer.

import { useRef, useState, type ReactNode } from "react";
import { fromFoundryActor, isFoundryActor, toFoundryActor } from "../foundryActor";
import { RuleError } from "../rules";
import { exportFile, fileSlug, fromExportFile, isExportFile, type ImportResult } from "../transfer";
import type { CharacterState } from "../types";

/** Taille maximale d'un fichier importé (un export Foundry avec beaucoup d'objets fait quelques centaines de Ko). */
const MAX_FILE = 5 * 1024 * 1024;

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButtons({ state }: { state: CharacterState }) {
  const [open, setOpen] = useState(false);
  const slug = fileSlug(state.name);
  return (
    <div className="cs-export">
      <button type="button" className="btn btn-ghost btn-small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⇩ Exporter
      </button>
      {open && (
        <div className="cs-export-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="btn btn-ghost btn-small"
            onClick={() => (download(`${slug}.fiche.json`, exportFile(state)), setOpen(false))}
          >
            Fichier de l&apos;outil
            <span className="muted small">Sauvegarde, ou pour l&apos;importer dans un autre coffre</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="btn btn-ghost btn-small"
            onClick={() => (download(`fvtt-Actor-${slug}.json`, toFoundryActor(state)), setOpen(false))}
          >
            Pour Foundry VTT
            <span className="muted small">Dans Foundry : clic droit sur un personnage → « Import Data »</span>
          </button>
        </div>
      )}
    </div>
  );
}

export type ReadImport = ImportResult & { source: "outil" | "foundry" };

/**
 * Lit un fichier choisi : export de l'outil, ou personnage Foundry (réservé au MJ : `allowFoundry`).
 * Lève une RuleError lisible.
 */
export async function readImportFile(file: File, { allowFoundry }: { allowFoundry: boolean }): Promise<ReadImport> {
  if (file.size > MAX_FILE) throw new RuleError("Ce fichier est trop gros pour être une fiche de personnage.");
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new RuleError("Ce fichier n'est pas un fichier JSON valide.");
  }
  if (isExportFile(raw)) return { ...fromExportFile(raw), source: "outil" };
  if (isFoundryActor(raw)) {
    if (!allowFoundry) throw new RuleError("Seul ton MJ peut importer un personnage depuis Foundry. Envoie-lui le fichier.");
    return { ...fromFoundryActor(raw), source: "foundry" };
  }
  throw new RuleError(
    allowFoundry
      ? "Fichier non reconnu : choisis un export de l'outil (.fiche.json) ou un personnage exporté depuis Foundry."
      : "Fichier non reconnu : choisis une fiche exportée depuis l'outil (.fiche.json).",
  );
}

/** Champ fichier caché + bouton qui l'ouvre. `render` dessine le bouton. */
function FilePicker({
  allowFoundry,
  onImport,
  onError,
  render,
}: {
  allowFoundry: boolean;
  onImport: (r: ReadImport) => void;
  onError: (msg: string) => void;
  render: (open: () => void) => ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      {render(() => input.current?.click())}
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onImport(await readImportFile(file, { allowFoundry }));
          } catch (err) {
            onError(err instanceof RuleError ? err.message : "Impossible de lire ce fichier.");
          }
        }}
      />
    </>
  );
}

/** Carte « Importer une fiche » du coffre (fichiers de l'outil ; Foundry aussi pour le MJ). */
export function ImportCard({ busy, allowFoundry, onImport, onError }: { busy: boolean; allowFoundry: boolean; onImport: (r: ReadImport) => void; onError: (msg: string) => void }) {
  return (
    <FilePicker
      allowFoundry={allowFoundry}
      onImport={onImport}
      onError={onError}
      render={(open) => (
        <button type="button" className="vault-card vault-new" disabled={busy} onClick={open}>
          <span className="vault-plus" aria-hidden="true">
            ⇧
          </span>
          <strong>Importer une fiche</strong>
          <span className="muted small">{allowFoundry ? "Export de l'outil ou personnage Foundry (.json)" : "Fiche exportée depuis l'outil (.fiche.json)"}</span>
        </button>
      )}
    />
  );
}

/** MJ : importer la fiche d'un joueur depuis Foundry (ou un fichier de l'outil), directement en campagne. */
export function MjImportButton({ busy, name, onImport, onError }: { busy: boolean; name: string; onImport: (r: ReadImport) => void; onError: (msg: string) => void }) {
  return (
    <FilePicker
      allowFoundry
      onImport={onImport}
      onError={onError}
      render={(open) => (
        <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={open} title={`Fichier « Export Data » d'un personnage Foundry, ou fiche exportée de l'outil, pour ${name}`}>
          ⇧ Importer (Foundry)
        </button>
      )}
    />
  );
}

/** Ce qu'il faut vérifier après un import. */
export function ImportNotes({ source, warnings, onClose }: { source: "outil" | "foundry"; warnings: string[]; onClose: () => void }) {
  return (
    <div className="cs-import-notes" role="status">
      <div className="stack-xs">
        <strong>✓ Fiche importée {source === "foundry" ? "depuis Foundry" : "depuis un fichier de l'outil"}</strong>
        {warnings.length > 0 ? (
          <>
            <span className="muted small">À vérifier :</span>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </>
        ) : (
          <span className="muted small">Tout a été repris.</span>
        )}
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Fermer">
        ×
      </button>
    </div>
  );
}
