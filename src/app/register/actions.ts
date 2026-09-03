"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { signIn } from "@/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(_prevState: string | null, formData: FormData) {
  const reqHeaders = await headers();
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`register:${ip}`, 5, 10 * 60 * 1000)) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return "Ingresá un nombre.";
  if (!EMAIL_RE.test(email)) return "Ingresá un email válido.";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "Ya existe una cuenta con ese email.";

  await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password) },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) return "Cuenta creada, pero no se pudo iniciar sesión automáticamente.";
    throw err;
  }
  return null;
}
