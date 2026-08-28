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
      { key: "nav_home", label: "Enlace de navegación: Inicio", default: "Inicio" },
      { key: "nav_explore", label: "Enlace de navegación: Explorar", default: "Explorar" },
      { key: "nav_categories", label: "Enlace de navegación: Categorías", default: "Categorías" },
      { key: "admin_link_label", label: "Botón de administración", default: "Añadir video" },
    ],
  },
  {
    title: "Hero (portada)",
    fields: [
      { key: "hero_eyebrow", label: "Texto pequeño superior", default: "Selección de la semana" },
      { key: "hero_title_line1", label: "Título, línea 1", default: "Historias que" },
      { key: "hero_title_emphasis", label: "Título, palabra resaltada", default: "merecen" },
      { key: "hero_title_line2", label: "Título, resto de la línea 2", default: "verse." },
      {
        key: "hero_copy",
        label: "Descripción",
        default: "Una colección curada de piezas, episodios y momentos para descubrir algo nuevo.",
        multiline: true,
      },
      { key: "hero_cta_play", label: "Botón: ver video destacado", default: "Ver ahora" },
      { key: "hero_cta_explore", label: "Botón: sin video destacado", default: "Explorar catálogo" },
      { key: "hero_cta_new", label: "Botón: ver novedades", default: "Ver novedades" },
    ],
  },
  {
    title: "Sección de categorías",
    fields: [
      { key: "categories_kicker", label: "Texto pequeño superior", default: "Explora por tema" },
      { key: "categories_title_line1", label: "Título, texto normal", default: "Encuentra tu próximo" },
      { key: "categories_title_emphasis", label: "Título, palabra resaltada", default: "favorito." },
      { key: "category_pill_all", label: "Etiqueta \"todas\"", default: "Todo" },
    ],
  },
  {
    title: "Catálogo",
    fields: [
      { key: "catalog_kicker", label: "Texto pequeño superior", default: "Actualizado hoy" },
      { key: "catalog_title_line1", label: "Título, texto normal", default: "Últimos" },
      { key: "catalog_title_emphasis", label: "Título, palabra resaltada", default: "videos" },
      { key: "catalog_view_all", label: "Enlace \"ver todo\"", default: "Ver todo" },
      {
        key: "catalog_empty_state",
        label: "Mensaje cuando no hay videos",
        default: "Aún no hay videos publicados. Agrégalos desde /admin.",
        multiline: true,
      },
    ],
  },
  {
    title: "Pie de página",
    fields: [
      { key: "footer_copyright", label: "Texto de derechos", default: "© 2026 NOVAFLIX" },
      { key: "footer_tagline", label: "Frase del pie de página", default: "Una mirada diferente al entretenimiento" },
      { key: "footer_admin_link", label: "Enlace al panel de administración", default: "Panel de administración" },
    ],
  },
];

export const DEFAULT_SETTINGS: Record<string, string> = Object.fromEntries(
  SETTING_GROUPS.flatMap((group) => group.fields.map((f) => [f.key, f.default]))
);

export async function getSiteSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...overrides };
}
