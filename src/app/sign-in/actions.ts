"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function signInWithCredentials(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) return "Email o contraseña incorrectos.";
    throw err;
  }
  return null;
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}
