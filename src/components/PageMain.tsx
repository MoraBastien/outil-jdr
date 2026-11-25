// Contenu principal d'une page, animé à l'entrée et à la sortie lors d'une navigation
// (View Transitions du navigateur via React). L'en-tête, lui, reste en place.
import { ViewTransition, type ReactNode } from "react";

export default function PageMain({ className, children }: { className: string; children: ReactNode }) {
  return (
    // update="none" : pas d'animation quand la page se rafraîchit après une action serveur.
    <ViewTransition enter="page" exit="page" update="none" default="none">
      <main id="contenu" tabIndex={-1} className={className}>
        {children}
      </main>
    </ViewTransition>
  );
}
