"use client";

import Link from "next/link";
import { useState } from "react";

export type PlayerRow = {
  id: string;
  name: string;
  code: string;
  echo: number | null;
  tools: { id: string; name: string; icon: string }[];
  groups: string[];
  sheets: number;
  sheetsComplete: number;
};

const simplify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="code-pill"
      title="Copier le code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* presse-papiers indisponible */
        }
      }}
    >
      {copied ? "Copié !" : code}
    </button>
  );
}

export default function PlayerList({ players }: { players: PlayerRow[] }) {
  const [query, setQuery] = useState("");
  const q = simplify(query.trim());
  const shown = q
    ? players.filter((p) => simplify(p.name).includes(q) || simplify(p.code).includes(q) || p.groups.some((g) => simplify(g).includes(q)))
    : players;

  if (players.length === 0) {
    return <p className="muted">Aucun joueur pour l&apos;instant. Crée le premier ci-dessus.</p>;
  }

  return (
    <div className="stack">
      {players.length > 4 && (
        <input
          type="search"
          className="input input-search"
          placeholder="Rechercher un joueur ou un code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un joueur"
        />
      )}

      <ul className="player-list">
        {shown.map((p) => (
          <li key={p.id} className="card player-row">
            <div className="player-ident">
              <span className="avatar avatar-lg" aria-hidden="true">
                {p.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="player-main">
                <Link href={`/admin/joueurs/${p.id}`} className="player-name">
                  {p.name}
                </Link>
                <CopyCode code={p.code} />
              </div>
            </div>

            <div className="chips">
              {p.groups.length === 0 ? (
                <span className="chip chip-warn" title="Sans groupe : pas de planning ni de fiche de personnage">
                  Sans groupe
                </span>
              ) : (
                p.groups.map((g) => (
                  <span key={g} className="chip chip-ok">
                    👥 {g}
                  </span>
                ))
              )}
              {p.tools.length === 0 ? null : (
                p.tools.map((t) => (
                  <span key={t.id} className="chip" title={t.name}>
                    {t.icon} {t.name}
                  </span>
                ))
              )}
              {p.echo != null && <span className="chip chip-accent">✨ Entité · Écho {p.echo}</span>}
            </div>

            <div className="player-meta muted small">
              {p.sheets > 0 ? (
                <>
                  {p.sheets} homunculus · {p.sheetsComplete} complet{p.sheetsComplete > 1 ? "s" : ""}
                </>
              ) : (
                "Aucun homunculus"
              )}
            </div>

            <Link href={`/admin/joueurs/${p.id}`} className="btn btn-ghost btn-small">
              Modifier
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="muted">Aucun joueur ne correspond à « {query} ».</p>}
    </div>
  );
}
