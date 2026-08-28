import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { logout, deleteVideo } from "./actions";

export default async function AdminDashboard() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    include: { categories: true, tags: true },
  });

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
                </td>
                <td className="px-3 py-2 font-medium">{video.title}</td>
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
            Aún no hay videos. Crea el primero desde{" "}
            <Link href="/admin/videos/new" className="text-blue-600 hover:underline">
              Nuevo video
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
