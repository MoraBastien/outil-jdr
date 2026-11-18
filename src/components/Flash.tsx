"use client";
// Message de retour (?ok=… / ?error=…) : s'affiche, retire le paramètre de l'URL,
// et disparaît tout seul quand c'est une confirmation.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const text = error ?? ok;

  useEffect(() => {
    setVisible(true);
    if (!text) return;
    // Nettoie l'URL pour qu'un rechargement ne réaffiche pas le message.
    window.history.replaceState(null, "", pathname);
    if (error) return;
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [text, error, pathname]);

  if (!text || !visible) return null;

  return (
    <p className={`flash toast ${error ? "flash-error" : "flash-ok"}`} role={error ? "alert" : "status"}>
      <span aria-hidden="true">{error ? "⚠" : "✓"}</span>
      {text}
      <button type="button" className="toast-close" onClick={() => setVisible(false)} aria-label="Fermer">
        ×
      </button>
    </p>
  );
}
