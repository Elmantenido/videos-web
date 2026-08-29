import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSearchTermsByDay } from "@/lib/analytics";

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

function startOfDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
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

export default async function SearchStatsPage({ searchParams }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const { from, to } = await searchParams;

  const rangeFrom = from ? new Date(`${from}T00:00:00`) : startOfDaysAgo(6);
  const rangeTo = to ? new Date(`${to}T23:59:59`) : endOfToday();

  const days = await getSearchTermsByDay(rangeFrom, rangeTo);
  const totalSearches = days.reduce((sum, d) => sum + d.total, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Buscador</h1>

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
          href="/admin/search"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Últimos 7 días
        </Link>
      </form>

      <p className="mb-4 text-sm text-gray-500">
        {totalSearches} búsqueda{totalSearches === 1 ? "" : "s"} en este rango.
      </p>

      <div className="flex flex-col gap-6">
        {days.map((d) => (
          <div key={d.day} className="rounded border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <span className="text-xs text-gray-500">
                {d.total} búsqueda{d.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.terms.map((t) => (
                <span
                  key={t.term}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {t.term} <span className="text-gray-400">×{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        ))}

        {days.length === 0 && (
          <p className="rounded border p-6 text-center text-gray-500">
            No hay búsquedas registradas en este rango.
          </p>
        )}
      </div>
    </main>
  );
}
