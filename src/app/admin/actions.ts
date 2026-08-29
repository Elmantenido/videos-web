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
    names.map(async (name) => {
      const slug = slugify(name);
      if (model === "category") {
        const existing = await prisma.category.findFirst({
          where: { OR: [{ slug }, { name }] },
        });
        return existing ?? prisma.category.create({ data: { name, slug } });
      }
      const existing = await prisma.tag.findFirst({
        where: { OR: [{ slug }, { name }] },
      });
      return existing ?? prisma.tag.create({ data: { name, slug } });
    })
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

export async function resolveReport(reportId: number) {
  await requireAuth();
  await prisma.report.update({ where: { id: reportId }, data: { resolved: true } });
  revalidatePath("/admin/reports");
}

export async function deleteReport(reportId: number) {
  await requireAuth();
  await prisma.report.delete({ where: { id: reportId } });
  revalidatePath("/admin/reports");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractCategoryNames(html: string): string[] {
  const names: string[] = [];

  // Some sources link categories as plain "/categoria/x" anchors.
  for (const match of html.matchAll(
    /<a[^>]*href=["']\/categoria\/[^"']*["'][^>]*>([^<]*)<\/a>/gi
  )) {
    const name = decodeHtmlEntities(match[1]);
    if (name) names.push(name);
  }

  // Others render categories as "badge" chips linking to /browse/tags/<slug>,
  // e.g. <a href="/browse/tags/comedy" class="badge badge-outline ...">COMEDY</a>.
  // The category name is the link's text, not the slug in the href — the
  // href+badge-class combo is distinctive enough on its own, no need to also
  // scope this to a particular wrapping container.
  for (const match of html.matchAll(/<a([^>]*)>([^<]*)<\/a>/gi)) {
    const [, attrs, text] = match;
    if (!/href=["']\/browse\/tags\//i.test(attrs)) continue;
    if (!/class=["'][^"']*\bbadge\b/i.test(attrs)) continue;
    const name = decodeHtmlEntities(text);
    if (name) names.push(name);
  }

  return Array.from(new Set(names));
}

function extractStudio(html: string): string | null {
  const container = html.match(
    /<div[^>]*gap-x-3 gap-y-1 text-sm text-gray-500[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!container) return null;
  const spans = container[1].match(/<span[^>]*>([^<]*)<\/span>/gi) ?? [];
  for (const span of spans) {
    const text = decodeHtmlEntities(span.replace(/<[^>]+>/g, ""));
    if (text && !/views?$/i.test(text)) return text;
  }
  return null;
}

function extractPreviewImageUrls(html: string): string[] {
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const urls: string[] = [];
  for (const tag of imgTags) {
    if (!tag.includes("aspect-[9/10]")) continue;
    const match = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (match) urls.push(match[1]);
  }
  return Array.from(new Set(urls));
}

function extractLabeledSection(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Only a following <h2> ends the section — some sites render each value
  // inside its own "pill" card (e.g. an <h3> per item), which must stay
  // part of the section's content instead of being treated as a boundary.
  const match = html.match(
    new RegExp(`<h2[^>]*>\\s*${escaped}\\s*<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>|$)`, "i")
  );
  if (!match) return null;
  // Drop the "show more"/"mostrar más" toggle button — it's UI chrome, not
  // part of the section's actual content, and would otherwise get appended
  // to the extracted text.
  const block = match[1].replace(
    /<button\b[^>]*data-expand-button[^>]*>[\s\S]*?<\/button>/gi,
    ""
  );

  const pillMatches = Array.from(
    block.matchAll(/<span[^>]*class=["'][^"']*break-words[^"']*["'][^>]*>([^<]*)<\/span>/gi)
  );
  if (pillMatches.length > 0) {
    const names = pillMatches.map((m) => decodeHtmlEntities(m[1])).filter(Boolean);
    return names.length ? names.join(", ") : null;
  }

  const text = decodeHtmlEntities(block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  return text || null;
}

function extractStudioByLabel(html: string): string | null {
  const idx = html.search(/Studio/i);
  if (idx === -1) return null;
  const match = html
    .slice(idx)
    .match(/<strong[^>]*class=["'][^"']*font-medium text-primary[^"']*["'][^>]*>([^<]*)<\/strong>/i);
  return match ? decodeHtmlEntities(match[1]) : null;
}

function extractDuration(html: string): string | null {
  // e.g. <span class="badge badge-outline badge-xs ...">16 min</span> — the
  // site only shows whole minutes, so we render it as MM:00 to match the
  // MM:SS convention already used in the "Duración" field.
  const match = html.match(
    /<span[^>]*class=["'][^"']*\bbadge\b[^"']*["'][^>]*>\s*(\d+)\s*min\s*<\/span>/i
  );
  return match ? `${match[1]}:00` : null;
}

function extractPosterImageUrlByAlt(html: string): string | null {
  // Neither alt="Video poster" nor eager/high-priority loading is unique on
  // its own — related-video cards can reuse the exact same player component,
  // and thus the same poster markup, on their own thumbnail. The main
  // player's wrapper id is unique and always precedes any related-videos
  // section, so scope the search to everything from there onward.
  const containerIdx = html.search(/id=["']HTVPlayerContainer["']/i);
  const scope = containerIdx === -1 ? html : html.slice(containerIdx);

  const tag = scope.match(
    /<img\b(?=[^>]*\balt=["']Video poster["'])(?=[^>]*(?:\bloading=["']eager["']|\bfetchpriority=["']high["']))[^>]*>/i
  )?.[0];
  if (!tag) return null;
  const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  return src ? src[1] : null;
}

function extractPosterImageUrl(html: string): string | null {
  // Fallback for sources without the "Video poster" alt marker: some posters
  // are lazy-loaded, so the real URL can live in a data-* attribute while src
  // itself is still a blank/placeholder image at that point.
  const srcAttrs = [
    "data-src",
    "data-original",
    "data-lazy-src",
    "data-lazy",
    "data-image",
    "data-echo",
    "src",
  ];
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    for (const attr of srcAttrs) {
      const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*images/posters[^"']*)["']`, "i"));
      if (match) return match[1];
    }
  }
  return null;
}

export async function extractFromUrl(url: string) {
  await requireAuth();

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { error: "Esa URL no es válida." };
  }

  let html: string;
  try {
    const res = await fetch(target.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { error: `No se pudo abrir esa página (${res.status}).` };
    }
    html = await res.text();
  } catch {
    return { error: "No se pudo conectar con esa URL." };
  }

  const jsonLd = extractJsonLd(html);
  const title =
    (typeof jsonLd?.name === "string" ? jsonLd.name : null) ??
    extractMetaContent(html, "og:title") ??
    html.match(/<title>([^<]*)<\/title>/i)?.[1] ??
    null;

  if (!title) {
    return { error: "No se encontraron datos de video en esa página." };
  }

  const synopsis = extractLabeledSection(html, "Synopsis");
  const alternateNames = extractLabeledSection(html, "Alternate Names");

  const baseDescription =
    synopsis ??
    (typeof jsonLd?.description === "string" ? jsonLd.description : null) ??
    extractMetaContent(html, "og:description");

  const description = [
    baseDescription ? decodeHtmlEntities(baseDescription) : null,
    alternateNames ? `Alternate Names: ${alternateNames}` : null,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

  const thumbnail =
    (typeof jsonLd?.thumbnailUrl === "string" ? jsonLd.thumbnailUrl : null) ??
    extractMetaContent(html, "og:image");

  const previewImages = extractPreviewImageUrls(html);

  return {
    data: {
      title: decodeHtmlEntities(title),
      description,
      embedUrl: "",
      thumbnail,
      backgroundImage: extractPosterImageUrlByAlt(html) ?? extractPosterImageUrl(html),
      duration: extractDuration(html),
      studio:
        extractStudioByLabel(html) ??
        extractLabeledSection(html, "Studio") ??
        extractStudio(html),
      previewHtml: previewImages.map((src) => `<img src="${src}">`).join(""),
      categoryNames: extractCategoryNames(html),
      tagNames: [] as string[],
    },
  };
}

export async function updateSiteSettings(formData: FormData) {
  await requireAuth();

  // Each settings form only renders its own subset of fields (Textos del
  // sitio vs. SEO). A hidden "formScope" input tells us which one, so a
  // submission from one form never wipes out fields that belong to the
  // other and simply weren't present in this particular FormData.
  const scope = formData.get("formScope");
  const fields =
    scope === "seo" ? SEO_FIELDS : SETTING_GROUPS.flatMap((g) => g.fields);

  await Promise.all(
    fields.map((field) => {
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
