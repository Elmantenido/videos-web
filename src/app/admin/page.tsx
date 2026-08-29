import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { logout, deleteVideo } from "./actions";

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminDashboard({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);

  const where = query ? { title: { contains: query } } : {};

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { categories: true, tags: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.video.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(n));
    return `/admin?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/settings"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Textos del sitio
          </Link>
          <Link
            href="/admin/seo"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            SEO
          </Link>
          <Link
            href="/admin/categories"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Categorías
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Visitas
          </Link>
          <Link
            href="/admin/reports"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Reportes
          </Link>
          <Link
            href="/admin/search"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Buscador
          </Link>
          <Link
            href="/admin/extraction"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Extracción
          </Link>
          <Link
            href="/admin/videos/new"
            className="rounded bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
          >
            Nuevo video
          </Link>
          <form action={logout}>
            <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <form method="GET" action="/admin" className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por título..."
          className="w-full max-w-sm rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Buscar
        </button>
        {query && (
          <Link
            href="/admin"
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Miniatura</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Categorías</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/video/${video.slug}`} target="_blank" rel="noopener noreferrer">
                    <div className="h-12 w-20 overflow-hidden rounded bg-gray-100">
                      {video.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/video/${video.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {video.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {video.categories.map((c) => c.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {video.tags.map((t) => t.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">
                  {video.published ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                      Publicado
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      Oculto
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteVideo(video.id);
                      }}
                    >
                      <button className="text-red-600 hover:underline">
                        Borrar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {videos.length === 0 && (
          <p className="p-6 text-center text-gray-500">
            {query ? (
              `No hay videos que coincidan con "${query}".`
            ) : (
              <>
                Aún no hay videos. Crea el primero desde{" "}
                <Link href="/admin/videos/new" className="text-blue-600 hover:underline">
                  Nuevo video
                </Link>
                .
              </>
            )}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Página {page} de {totalPages} ({total} video{total === 1 ? "" : "s"})
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded border px-3 py-1.5 hover:bg-gray-50">
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="rounded border px-3 py-1.5 hover:bg-gray-50">
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
