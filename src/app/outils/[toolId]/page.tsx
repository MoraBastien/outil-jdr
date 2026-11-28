import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, canUseTool } from "@/lib/auth";
import { getTool } from "@/tools/registry";
import Header from "@/components/Header";
import PageMain from "@/components/PageMain";
import { entitySheetOf } from "@/tools/homunculus/entity";
import { ASTRAL_LABELS } from "@/tools/homunculus/astral/theme";

export default async function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const user = await requireUser();
  const tool = getTool(toolId);
  if (!tool) notFound();
  if (!canUseTool(user, tool.id)) redirect("/accueil");

  const Tool = tool.component;
  // L'Écho et la fiche de l'entité ne sont envoyés qu'aux joueurs de l'Atelier : les autres n'en ont pas connaissance.
  const entity = entitySheetOf(user);
  const player = {
    name: user.name,
    isAdmin: user.role === "admin",
    ...(entity || user.role === "admin" ? { echo: user.echo } : {}),
    ...(entity ? { altSheet: entity } : {}),
    profile: user.profile,
  };
  // Données préchargées côté serveur (outils qui le proposent) : en cas d'échec, l'outil les recharge lui-même.
  // Pas pour la fiche d'un joueur de l'Atelier : il voit la fiche de son entité, chargée à part.
  const skipPreload = Boolean(entity) && tool.id === "personnage";
  const initial = tool.preload && !skipPreload ? await tool.preload().catch(() => undefined) : undefined;
  const crumbLabel = entity && tool.id === "personnage" ? ASTRAL_LABELS.personnage : tool.name;
  const crumbs = (
    <nav className="breadcrumbs" aria-label="Fil d'Ariane">
      <Link href="/accueil">{entity ? ASTRAL_LABELS.home : "Accueil"}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{crumbLabel}</span>
    </nav>
  );

  if (tool.wide) {
    return (
      <>
        <Header user={user} />
        <PageMain className="page page-wide stack">
          {crumbs}
          <Tool player={player} initial={initial} />
        </PageMain>
      </>
    );
  }

  return (
    <>
      <Header user={user} />
      <PageMain className="page stack-lg">
        <div className="page-head">
          {crumbs}
          <h1 className="title" style={{ viewTransitionName: `tool-${tool.id}`, width: "fit-content" }}>
            <span className="title-icon" aria-hidden="true">
              {tool.icon}
            </span>{" "}
            {tool.name}
          </h1>
          <p className="muted">{tool.description}</p>
        </div>
        <section className="card card-lg">
          <Tool player={player} initial={initial} />
        </section>
      </PageMain>
    </>
  );
}
