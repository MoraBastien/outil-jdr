"use client";
// Message de retour (?ok=… / ?error=…) : s'affiche, retire le paramètre de l'URL,
// et disparaît tout seul quand c'est une confirmation.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  // Fermeture animée : on joue l'animation de sortie avant de retirer le message.
  const close = () => {
    setLeaving(true);
    setTimeout(() => setVisible(false), 260);
  };
  const text = error ?? ok;

  useEffect(() => {
    setVisible(true);
    setLeaving(false);
    if (!text) return;
    // Nettoie l'URL pour qu'un rechargement ne réaffiche pas le message.
    window.history.replaceState(null, "", pathname);
    if (error) return;
    const t = setTimeout(close, 4500);
    return () => clearTimeout(t);
  }, [text, error, pathname]);

  if (!text || !visible) return null;

  return (
    <p className={`flash toast ${error ? "flash-error" : "flash-ok"}${leaving ? " toast-out" : ""}`} role={error ? "alert" : "status"}>
      <span aria-hidden="true">{error ? "⚠" : "✓"}</span>
      {text}
      <button type="button" className="toast-close" onClick={close} aria-label="Fermer">
        ×
      </button>
    </p>
  );
}
