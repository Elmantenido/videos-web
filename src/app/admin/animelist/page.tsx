import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MalUpdateAllButton from "@/components/MalUpdateAllButton";
import MalUpdateMissingButton from "@/components/MalUpdateMissingButton";

// The counters below must reflect the catalog as of this exact visit (right
// after running a batch, in particular), so this can't be a cached static
// page the way it would default to without reading a dynamic API.
export const dynamic = "force-dynamic";

export default async function AnimeListPage() {
  const [total, withData] = await Promise.all([
    prisma.video.count(),
    prisma.video.count({ where: { malTitle: { not: null } } }),
  ]);
  const withoutData = total - withData;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-2 mt-2 text-2xl font-bold">AnimeList</h1>
      <p className="mb-4 text-sm text-gray-500">
        Consulta MyAnimeList y guarda los datos de Score, Ranked, Popularity y Members que
        encuentre para cada video.
      </p>

      <div className="mb-6 flex gap-3 text-sm">
        <span className="rounded bg-green-100 px-3 py-1.5 text-green-700">
          {withData} con datos de MyAnimeList
        </span>
        <span className="rounded bg-gray-100 px-3 py-1.5 text-gray-600">
          {withoutData} sin datos
        </span>
        <span className="rounded border px-3 py-1.5 text-gray-500">{total} en total</span>
      </div>

      <MalUpdateAllButton />
      <MalUpdateMissingButton />
    </main>
  );
}
