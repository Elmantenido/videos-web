"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  isAuthenticated,
} from "@/lib/auth";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

function parseNames(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function login(_prevState: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!checkCredentials(username, password)) {
    return "Usuario o contraseña incorrectos.";
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

async function connectOrCreateNamed(
  model: "category" | "tag",
  names: string[]
) {
  const rows = await Promise.all(
    names.map((name) =>
      model === "category"
        ? prisma.category.upsert({
            where: { slug: slugify(name) },
            update: {},
            create: { name, slug: slugify(name) },
          })
        : prisma.tag.upsert({
            where: { slug: slugify(name) },
            update: {},
            create: { name, slug: slugify(name) },
          })
    )
  );
  return rows.map((r) => ({ id: r.id }));
}

async function resolveCategoryConnections(formData: FormData) {
  const selectedIds = formData
    .getAll("categoryIds")
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
    .map((id) => ({ id }));

  const newOnes = await connectOrCreateNamed(
    "category",
    parseNames(formData.get("categoryNames"))
  );

  return [...selectedIds, ...newOnes];
}

export async function createVideo(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const embedUrl = String(formData.get("embedUrl") ?? "").trim();
  if (!title || !embedUrl) throw new Error("Título y embed son obligatorios");

  const categories = await resolveCategoryConnections(formData);
  const tags = await connectOrCreateNamed("tag", parseNames(formData.get("tagNames")));

  await prisma.video.create({
    data: {
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      description: String(formData.get("description") ?? "") || null,
      embedUrl,
      thumbnail: String(formData.get("thumbnail") ?? "") || null,
      duration: String(formData.get("duration") ?? "") || null,
      studio: String(formData.get("studio") ?? "") || null,
      published: formData.get("published") === "on",
      categories: { connect: categories },
      tags: { connect: tags },
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateVideo(videoId: number, formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const embedUrl = String(formData.get("embedUrl") ?? "").trim();
  if (!title || !embedUrl) throw new Error("Título y embed son obligatorios");

  const categories = await resolveCategoryConnections(formData);
  const tags = await connectOrCreateNamed("tag", parseNames(formData.get("tagNames")));

  await prisma.video.update({
    where: { id: videoId },
    data: {
      title,
      description: String(formData.get("description") ?? "") || null,
      embedUrl,
      thumbnail: String(formData.get("thumbnail") ?? "") || null,
      duration: String(formData.get("duration") ?? "") || null,
      studio: String(formData.get("studio") ?? "") || null,
      published: formData.get("published") === "on",
      categories: { set: categories },
      tags: { set: tags },
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteVideo(videoId: number) {
  await requireAuth();
  await prisma.video.delete({ where: { id: videoId } });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateSiteSettings(formData: FormData) {
  await requireAuth();

  const entries = Array.from(formData.entries()).filter(
    ([key]) => !key.startsWith("$ACTION_ID")
  );

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/seo");
}
