"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { sanitizeEmbedCode } from "@/lib/embed";
import { SETTING_GROUPS, SEO_FIELDS } from "@/lib/site-settings";
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

async function ensureUniqueSlug(base: string, excludeVideoId?: number) {
  let slug = base;
  let attempt = 2;
  while (true) {
    const existing = await prisma.video.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeVideoId) return slug;
    slug = `${base}-${attempt}`;
    attempt++;
  }
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

  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = await ensureUniqueSlug(slugify(requestedSlug || title));

  await prisma.video.create({
    data: {
      title,
      slug,
      description: String(formData.get("description") ?? "") || null,
      embedUrl,
      thumbnail: String(formData.get("thumbnail") ?? "") || null,
      backgroundImage: String(formData.get("backgroundImage") ?? "") || null,
      duration: String(formData.get("duration") ?? "") || null,
      studio: String(formData.get("studio") ?? "") || null,
      previewHtml: sanitizeEmbedCode(String(formData.get("previewHtml") ?? "")) || null,
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

  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = await ensureUniqueSlug(slugify(requestedSlug || title), videoId);

  await prisma.video.update({
    where: { id: videoId },
    data: {
      title,
      slug,
      description: String(formData.get("description") ?? "") || null,
      embedUrl,
      thumbnail: String(formData.get("thumbnail") ?? "") || null,
      backgroundImage: String(formData.get("backgroundImage") ?? "") || null,
      duration: String(formData.get("duration") ?? "") || null,
      studio: String(formData.get("studio") ?? "") || null,
      previewHtml: sanitizeEmbedCode(String(formData.get("previewHtml") ?? "")) || null,
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

export async function deleteCategory(categoryId: number) {
  await requireAuth();
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/");
  revalidatePath("/admin/categories");
}

export async function updateSiteSettings(formData: FormData) {
  await requireAuth();

  const knownFields = [...SETTING_GROUPS.flatMap((g) => g.fields), ...SEO_FIELDS];

  await Promise.all(
    knownFields.map((field) => {
      const value =
        field.type === "checkbox"
          ? formData.get(field.key) === "on"
            ? "true"
            : "false"
          : String(formData.get(field.key) ?? "");

      return prisma.siteSetting.upsert({
        where: { key: field.key },
        update: { value },
        create: { key: field.key, value },
      });
    })
  );

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/seo");
}
