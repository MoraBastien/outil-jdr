import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getUserById, getHomunculi, getGroups } from "@/lib/db";
import { isGroupTool, userGroupIds } from "@/lib/groups";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import Flash from "@/components/Flash";
import { clampEcho, MAX_ECHO } from "@/tools/homunculus/echo";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import { deletePlayer, deleteHomunculus } from "../../actions";
import { summarize, formatDate } from "../../homunculus";
import PlayerEditor, { type EditorPlayer } from "./PlayerEditor";
import PageMain from "@/components/PageMain";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { error, ok } = await searchParams;
  const player = await getUserById(id);
  if (!player || player.role !== "player") notFound();

  const sheets = (await getHomunculi(player.id)).map(summarize);
  const groups = await getGroups();
  const editorPlayer: EditorPlayer = {
    id: player.id,
    name: player.name,
    code: player.code,
    echo: clampEcho(player.echo),
    tools: player.tools,
    groupIds: userGroupIds(player),
    fields: player.profile.fields,
    notes: player.profile.notes,
  };

  return (
    <>
      <Header user={admin} />
      <PageMain className="page stack-lg">
        <div className="page-head">
          <nav className="breadcrumbs" aria-label="Fil d'Ariane">
            <Link href="/admin">Administration</Link> <span aria-hidden="true">/</span> <span aria-current="page">{player.name}</span>
          </nav>
          <h1 className="title">{player.name}</h1>
        </div>

        {/* Clé unique à chaque rendu serveur : le message réapparaît même s'il est identique au précédent. */}
        <Flash key={Date.now()} ok={ok} error={error} />

        <PlayerEditor
          // Réinitialise l'état local (dont « non enregistré ») après chaque enregistrement.
          key={JSON.stringify(editorPlayer) + (ok ?? "")}
          player={editorPlayer}
          tools={TOOLS.map((t) => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, byGroup: isGroupTool(t.id) }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          homunculusToolId={HOMUNCULUS_META.id}
          maxEcho={MAX_ECHO}
        />

        <section className="card stack">
          <div className="section-head">
            <h2 className="subtitle">Fiches d&apos;homunculus</h2>
            <span className="muted small">
              {sheets.length} fiche{sheets.length > 1 ? "s" : ""}
            </span>
          </div>

          {sheets.length === 0 ? (
            <p className="muted">
              {player.tools.includes(HOMUNCULUS_META.id)
                ? "Aucune fiche enregistrée pour l'instant."
                : "L'Atelier de Rigel n'est pas autorisé pour ce joueur."}
            </p>
          ) : (
            <ul className="sheet-list">
              {sheets.map((s) => (
                <li key={s.id} className="sheet-row">
                  <div className="stack-xs">
                    <Link href={`/admin/joueurs/${player.id}/fiches/${s.id}`} className="player-name">
                      {s.nom}
                    </Link>
                    <span className="muted small">
                      {[s.matiere, s.classe].filter(Boolean).join(" · ") || "Matière et classe à choisir"}
                      {s.pv != null && ` · ${s.pv} PV`}
                    </span>
                  </div>
                  <div className="chips">
                    <span className="chip chip-accent">Écho {s.echo}</span>
                    <span className={`chip ${s.complete ? "chip-ok" : ""}`}>
                      {s.complete ? "Complète" : `${s.stepsDone}/6 étapes`}
                    </span>
                    {s.relances > 0 && (
                      <span className="chip chip-warn" title="Relances de caractéristiques et de Fêlure">
                        {s.relances} relance{s.relances > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className="muted small">{formatDate(s.updatedAt)}</span>
                  <div className="row-actions">
                    <Link href={`/admin/joueurs/${player.id}/fiches/${s.id}`} className="btn btn-ghost btn-small">
                      Voir
                    </Link>
                    <details className="inline-confirm">
                      <summary className="btn btn-ghost btn-small">Supprimer</summary>
                      <form action={deleteHomunculus}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="ownerId" value={player.id} />
                        <button className="btn btn-danger btn-small">Confirmer</button>
                      </form>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack danger-zone">
          <h2 className="subtitle">Zone dangereuse</h2>
          <p className="muted small">
            Supprime le joueur, son code d&apos;accès, sa fiche de personnage, ses fiches d&apos;homunculus et son journal de dés. Irréversible.
          </p>
          <details className="danger">
            <summary>Supprimer {player.name}</summary>
            <form action={deletePlayer}>
              <input type="hidden" name="id" value={player.id} />
              <button className="btn btn-danger btn-small">Confirmer la suppression de {player.name}</button>
            </form>
          </details>
        </section>
      </PageMain>
    </>
  );
}
