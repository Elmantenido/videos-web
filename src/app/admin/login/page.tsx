"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold">Acceso de administrador</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
          name="username"
          placeholder="Usuario"
          className="rounded border px-3 py-2"
          required
          autoFocus
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          className="rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
