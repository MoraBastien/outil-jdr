// Vue MJ, en lecture seule, d'une fiche d'homunculus d'un joueur.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getUserById, getHomunculi } from "@/lib/db";
import Header from "@/components/Header";
import { HomunculusCreator, normalize, type HomunculusState } from "@/tools/homunculus-creator";
import { MAX_ECHO } from "@/tools/homunculus/echo";
import { formatDate } from "../../../../homunculus";

export default async function SheetPage({ params }: { params: Promise<{ id: string; sheetId: string }> }) {
  const admin = await requireAdmin();
  const { id, sheetId } = await params;
  const player = await getUserById(id);
  if (!player || player.role !== "player") notFound();
  const stored = (await getHomunculi(player.id)).find((h) => h.id === sheetId);
  if (!stored) notFound();

  const state = normalize(stored.state as HomunculusState, MAX_ECHO);

  return (
    <>
      <Header user={admin} />
      <main className="page page-wide stack">
        <nav className="breadcrumbs" aria-label="Fil d'Ariane">
          <Link href="/admin">Administration</Link> <span aria-hidden="true">/</span>{" "}
          <Link href={`/admin/joueurs/${player.id}`}>{player.name}</Link> <span aria-hidden="true">/</span>{" "}
          <span>{state.nom.trim() || "Sans nom"}</span>
        </nav>
        <p className="muted small">
          Lecture seule · créée le {formatDate(stored.createdAt)} · modifiée le {formatDate(stored.updatedAt)}
        </p>
        <HomunculusCreator
          className="homunculus-host"
          initialState={state}
          echo={state.echo}
          maxEcho={MAX_ECHO}
          storage={null}
          readOnly
          theme="dark"
          ambient
          showBeta={false}
        />
      </main>
    </>
  );
}
