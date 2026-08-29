import { prisma } from "@/lib/prisma";

export const SETTING_GROUPS: {
  title: string;
  fields: { key: string; label: string; default: string; multiline?: boolean }[];
}[] = [
  {
    title: "Encabezado",
    fields: [
      { key: "brand_prefix", label: "Marca (parte 1)", default: "NOVA" },
      { key: "brand_suffix", label: "Marca (parte 2, resaltada)", default: "FLIX" },
      { key: "nav_home", label: "Enlace de navegación: Inicio", default: "Home" },
      { key: "nav_explore", label: "Enlace de navegación: Explorar", default: "Explore" },
      { key: "nav_categories", label: "Enlace de navegación: Categorías", default: "Categories" },
    ],
  },
  {
    title: "Hero (portada)",
    fields: [
      { key: "hero_eyebrow", label: "Texto pequeño superior", default: "This week's picks" },
      { key: "hero_title_line1", label: "Título, línea 1", default: "Stories that" },
      { key: "hero_title_emphasis", label: "Título, palabra resaltada", default: "deserve" },
      { key: "hero_title_line2", label: "Título, resto de la línea 2", default: "to be seen." },
      {
        key: "hero_copy",
        label: "Descripción",
        default: "A curated collection of pieces, episodes, and moments to discover something new.",
        multiline: true,
      },
      { key: "hero_cta_play", label: "Botón: ver video destacado", default: "Watch now" },
      { key: "hero_cta_explore", label: "Botón: sin video destacado", default: "Explore catalog" },
      { key: "hero_cta_new", label: "Botón: ver novedades", default: "See what's new" },
    ],
  },
  {
    title: "Sección de categorías",
    fields: [
      { key: "categories_kicker", label: "Texto pequeño superior", default: "Browse by topic" },
      { key: "categories_title_line1", label: "Título, texto normal", default: "Find your next" },
      { key: "categories_title_emphasis", label: "Título, palabra resaltada", default: "favorite." },
      { key: "category_pill_all", label: "Etiqueta \"todas\"", default: "All" },
    ],
  },
  {
    title: "Trending",
    fields: [
      { key: "trending_kicker", label: "Texto pequeño superior", default: "Most watched" },
      { key: "trending_title", label: "Título de la sección", default: "Trending now" },
    ],
  },
  {
    title: "Catálogo",
    fields: [
      { key: "catalog_kicker", label: "Texto pequeño superior", default: "Updated today" },
      { key: "catalog_title_line1", label: "Título, texto normal", default: "Latest" },
      { key: "catalog_title_emphasis", label: "Título, palabra resaltada", default: "videos" },
      { key: "catalog_view_all", label: "Enlace \"ver todo\"", default: "View all" },
      {
        key: "catalog_empty_state",
        label: "Mensaje cuando no hay videos",
        default: "No videos published yet. Add some from /admin.",
        multiline: true,
      },
    ],
  },
  {
    title: "Pie de página",
    fields: [
      { key: "footer_copyright", label: "Texto de derechos", default: "© 2026 NOVAFLIX" },
      { key: "footer_tagline", label: "Frase del pie de página", default: "A different take on entertainment" },
      { key: "footer_admin_link", label: "Enlace al panel de administración", default: "Admin panel" },
    ],
  },
];

export const SEO_FIELDS: { key: string; label: string; default: string; multiline?: boolean }[] = [
  { key: "seo_site_title", label: "Título del sitio (meta title)", default: "NOVAFLIX — Video Catalog" },
  {
    key: "seo_meta_description",
    label: "Meta descripción",
    default: "Discover a curated video catalog. Watch handpicked pieces, episodes, and moments.",
    multiline: true,
  },
  { key: "seo_keywords", label: "Palabras clave (separadas por coma)", default: "" },
  { key: "seo_og_image", label: "Imagen para compartir en redes (OG/Twitter, URL)", default: "" },
];

export const DEFAULT_SETTINGS: Record<string, string> = Object.fromEntries(
  [...SETTING_GROUPS.flatMap((group) => group.fields), ...SEO_FIELDS].map((f) => [f.key, f.default])
);

export async function getSiteSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...overrides };
}
