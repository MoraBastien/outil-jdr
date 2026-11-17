"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="stack">
      <label htmlFor="code" className="label">
        Code d&apos;accès
      </label>
      <input
        id="code"
        name="code"
        className="input input-code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        required
      />
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
