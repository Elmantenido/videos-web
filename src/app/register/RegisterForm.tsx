"use client";

import { useActionState } from "react";
import { registerUser } from "./actions";

export default function RegisterForm() {
  const [error, formAction, pending] = useActionState(registerUser, null);

  return (
    <form action={formAction} className="auth-form">
      <input type="text" name="name" placeholder="Name" required autoFocus className="auth-input" />
      <input type="email" name="email" placeholder="Email" required className="auth-input" />
      <input
        type="password"
        name="password"
        placeholder="Password (min. 8 characters)"
        required
        minLength={8}
        className="auth-input"
      />
      <button type="submit" disabled={pending} className="auth-button">
        {pending ? "Creating account..." : "Create Account"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}
