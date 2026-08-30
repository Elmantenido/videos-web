import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveReport, deleteReport } from "../actions";

// No cookies()/headers() are read here, so Next would otherwise be free to
// prerender this page as static at build time -- serving admins a stale
// snapshot from the last deploy instead of newly submitted reports.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { video: { select: { id: true, title: true, slug: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Reportes de video</h1>

      <div className="flex flex-col gap-4">
        {reports.map((report) => {
          let diagnostics: Record<string, string> | null = null;
          try {
            diagnostics = report.diagnostics ? JSON.parse(report.diagnostics) : null;
          } catch {
            diagnostics = null;
          }

          return (
            <div
              key={report.id}
              className={`rounded border p-4 ${report.resolved ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/video/${report.video.slug}`}
                    target="_blank"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {report.video.title}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {report.createdAt.toLocaleString()}
                  </p>
                </div>
                {report.resolved && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                    Resuelto
                  </span>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                {report.message}
              </p>

              {report.contactEmail && (
                <p className="mt-2 text-xs text-gray-500">
                  Contacto: {report.contactEmail}
                </p>
              )}

              {diagnostics && (
                <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-500">
                  {Object.entries(diagnostics).map(([key, value]) => (
                    <p key={key} className="capitalize">
                      {key}: {value}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-3">
                {!report.resolved && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveReport(report.id);
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
                    await deleteReport(report.id);
                  }}
                >
                  <button className="text-sm text-red-600 hover:underline">Borrar</button>
                </form>
              </div>
            </div>
          );
        })}

        {reports.length === 0 && (
          <p className="text-center text-gray-500">Aún no hay reportes.</p>
        )}
      </div>
    </main>
  );
}
