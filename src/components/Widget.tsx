// Cadre commun des panneaux du tableau de bord : en-tête, lien vers l'outil,
// chargement indépendant (Suspense) et isolation des erreurs.
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import WidgetBoundary from "./WidgetBoundary";

export default function Widget({
  title,
  icon,
  href,
  wide,
  transitionName,
  children,
}: {
  title: string;
  icon: string;
  href?: string;
  wide?: boolean;
  /** Nom de transition partagé avec le titre de la page de l'outil (morphing entre les pages). */
  transitionName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`widget${wide ? " widget-wide" : ""}`} aria-label={title}>
      <header className="widget-head">
        <span className="widget-label" style={transitionName ? { viewTransitionName: transitionName } : undefined}>
          <span className="widget-icon" aria-hidden="true">
            {icon}
          </span>
          <h2 className="widget-title">{title}</h2>
        </span>
        {href && (
          <Link href={href} className="widget-link">
            Ouvrir <span className="arrow">→</span>
          </Link>
        )}
      </header>
      <div className="widget-body">
        <WidgetBoundary>
          <Suspense fallback={<WidgetSkeleton />}>{children}</Suspense>
        </WidgetBoundary>
      </div>
    </section>
  );
}

function WidgetSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}
