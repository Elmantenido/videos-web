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
    return "Too many attempts. Wait a few minutes and try again.";
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return "Enter a name.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email.";
  if (password.length < 8) return "Password must be at least 8 characters.";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password) },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) return "Account created, but automatic sign-in failed.";
    throw err;
  }
  return null;
}
