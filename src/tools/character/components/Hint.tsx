"use client";
// Petite bulle d'aide « ? » : explique une notion de règle en clair.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export default function Hint({ children, label = "Explication" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span className="hint" ref={ref}>
      <button
        type="button"
        className="hint-btn"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      {open && (
        <span className="hint-bubble" role="tooltip" id={id}>
          {children}
        </span>
      )}
    </span>
  );
}
