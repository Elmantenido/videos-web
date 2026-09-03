"use client";

import { useActionState } from "react";
import { signInWithCredentials } from "./actions";

export default function SignInForm() {
  const [error, formAction, pending] = useActionState(signInWithCredentials, null);

  return (
    <form action={formAction} className="auth-form">
      <input type="email" name="email" placeholder="Email" required autoFocus className="auth-input" />
      <input type="password" name="password" placeholder="Contraseña" required className="auth-input" />
      <button type="submit" disabled={pending} className="auth-button">
        {pending ? "Entrando..." : "Entrar"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}
