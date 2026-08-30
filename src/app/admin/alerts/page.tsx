import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveAlert, deleteAlert } from "../actions";

// No cookies()/headers() are read here, so Next would otherwise be free to
// prerender this page as static at build time -- serving admins a stale
// snapshot instead of newly detected alerts.
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await prisma.videoAlert.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { video: { select: { id: true, slug: true, title: true, thumbnail: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-2 mt-2 text-2xl font-bold">Alertas de reproducción</h1>
      <p className="mb-6 text-sm text-gray-500">
        Se generan automáticamente cuando el formato del embed de un video no es válido, o al usar
        &quot;Verificar reproducción&quot; en la edición de un video.
      </p>

      <div className="flex flex-col gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex gap-4 rounded border p-4 ${alert.resolved ? "opacity-60" : ""}`}
          >
            <Link
              href={`/video/${alert.video.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-gray-100"
            >
              {alert.video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={alert.video.thumbnail}
                  alt={alert.video.title}
                  className="h-full w-full object-cover"
                />
              )}
            </Link>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/videos/${alert.video.id}`}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {alert.video.title}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {alert.video.slug} · {alert.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      alert.source === "auto" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {alert.source === "auto" ? "Automática" : "Manual"}
                  </span>
                  {alert.resolved && (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                      Resuelto
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-2 text-sm text-gray-800">{alert.reason}</p>

              <div className="mt-3 flex gap-3">
                <Link
                  href={`/admin/videos/${alert.video.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Revisar video
                </Link>
                {!alert.resolved && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveAlert(alert.id);
                    }}
                  >
                    <button className="text-sm text-green-700 hover:underline">
                      Marcar resuelto
                    </button>
                  </form>
                )}
                <form
                  action={async () => {
                    "use server";
                    await deleteAlert(alert.id);
                  }}
                >
                  <button className="text-sm text-red-600 hover:underline">Borrar</button>
                </form>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <p className="text-center text-gray-500">No hay alertas. Todos los videos parecen estar en orden.</p>
        )}
      </div>
    </main>
  );
}
