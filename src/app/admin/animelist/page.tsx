import Link from "next/link";
import MalUpdateAllButton from "@/components/MalUpdateAllButton";

export default function AnimeListPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-2 mt-2 text-2xl font-bold">AnimeList</h1>
      <p className="mb-6 text-sm text-gray-500">
        Consulta MyAnimeList para todos los videos del catálogo y guarda los datos de Score,
        Ranked, Popularity y Members que encuentre para cada uno.
      </p>

      <MalUpdateAllButton />
    </main>
  );
}
