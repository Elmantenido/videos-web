import Link from "next/link";
import { getVisits, getSummary, getLast30MinBuckets } from "@/lib/analytics";
import AnalyticsBarChart from "@/components/AnalyticsBarChart";

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function toInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { from, to } = await searchParams;

  const rangeFrom = from ? new Date(`${from}T00:00:00`) : startOfToday();
  const rangeTo = to ? new Date(`${to}T23:59:59`) : endOfToday();

  const [visits, summary, buckets] = await Promise.all([
    getVisits(rangeFrom, rangeTo),
    getSummary(rangeFrom, rangeTo),
    getLast30MinBuckets(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Visitas del sitio</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
          Últimos 30 minutos
        </h2>
        <div className="rounded border p-4">
          <AnalyticsBarChart buckets={buckets} />
        </div>
      </section>

      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Desde
          <input
            type="date"
            name="from"
            defaultValue={toInputValue(rangeFrom)}
            className="mt-1 block rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={toInputValue(rangeTo)}
            className="mt-1 block rounded border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Filtrar
        </button>
        <Link
          href="/admin/analytics"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Hoy
        </Link>
      </form>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <p className="text-xs uppercase text-gray-500">Visitas</p>
          <p className="text-2xl font-bold">{summary.visits}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-xs uppercase text-gray-500">Vistas de página</p>
          <p className="text-2xl font-bold">{summary.pageViews}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-xs uppercase text-gray-500">Reproducciones</p>
          <p className="text-2xl font-bold">{summary.plays}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">País</th>
              <th className="px-3 py-2">Página</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Tiempo aprox.</th>
              <th className="px-3 py-2">Reproducciones</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit) => (
              <tr key={visit.id} className="border-t">
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {visit.createdAt.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {visit.isBot ? (
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                      {visit.visitorType}
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                      {visit.visitorType}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{visit.country ?? "—"}</td>
                <td className="max-w-[220px] truncate px-3 py-2" title={visit.landingPage}>
                  {visit.landingPage}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2" title={visit.referrer ?? undefined}>
                  {visit.referrer ?? "Direct"}
                </td>
                <td className="px-3 py-2">{formatDuration(visit.durationSeconds)}</td>
                <td className="px-3 py-2">{visit.playsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visits.length === 0 && (
          <p className="p-6 text-center text-gray-500">No hay visitas en este rango.</p>
        )}
      </div>
    </main>
  );
}
