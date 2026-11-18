import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, canUseTool } from "@/lib/auth";
import { getTool } from "@/tools/registry";
import Header from "@/components/Header";
import PageMain from "@/components/PageMain";

export default async function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const user = await requireUser();
  const tool = getTool(toolId);
  if (!tool) notFound();
  if (!canUseTool(user, tool.id)) redirect("/accueil");

  const Tool = tool.component;
  const player = { name: user.name, isAdmin: user.role === "admin", echo: user.echo, profile: user.profile };
  const crumbs = (
    <nav className="breadcrumbs" aria-label="Fil d'Ariane">
      <Link href="/accueil">Accueil</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{tool.name}</span>
    </nav>
  );

  if (tool.wide) {
    return (
      <>
        <Header user={user} />
        <PageMain className="page page-wide stack">
          {crumbs}
          <Tool player={player} />
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
          <Tool player={player} />
        </section>
      </PageMain>
    </>
  );
}
