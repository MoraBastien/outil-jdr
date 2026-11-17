import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, canUseTool } from "@/lib/auth";
import { getTool } from "@/tools/registry";
import Header from "@/components/Header";

export default async function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const user = await requireUser();
  const tool = getTool(toolId);
  if (!tool) notFound();
  if (!canUseTool(user, tool.id)) redirect("/accueil");

  const Tool = tool.component;
  const player = { name: user.name, isAdmin: user.role === "admin", echo: user.echo, profile: user.profile };

  if (tool.wide) {
    return (
      <>
        <Header user={user} />
        <main className="page page-wide stack">
          <Link href="/accueil" className="muted">
            ← Retour
          </Link>
          <Tool player={player} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header user={user} />
      <main className="page stack-lg">
        <div className="stack">
          <Link href="/accueil" className="muted">
            ← Retour
          </Link>
          <h1 className="title">
            {tool.icon} {tool.name}
          </h1>
        </div>
        <section className="card">
          <Tool player={player} />
        </section>
      </main>
    </>
  );
}
