"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ResultItem = {
  videoId: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  matched: boolean;
  malTitle: string | null;
};

type Summary = { total: number; matched: number; unmatched: number };

export default function MalUpdateAllButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  function start() {
    setRunning(true);
    setResults([]);
    setSummary(null);
    setProgress({ done: 0, total: 0 });

    const source = new EventSource("/api/admin/mal-update-all");

    source.addEventListener("start", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setProgress({ done: 0, total: data.total });
    });

    source.addEventListener("result", (e) => {
      const data: ResultItem = JSON.parse((e as MessageEvent).data);
      setResults((prev) => [...prev, data]);
      setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    });

    source.addEventListener("done", (e) => {
      const data: Summary = JSON.parse((e as MessageEvent).data);
      setSummary(data);
      setRunning(false);
      source.close();
      router.refresh();
    });

    source.onerror = () => {
      setRunning(false);
      source.close();
    };
  }

  const unmatchedResults = results.filter((r) => !r.matched);

  return (
    <div className="mb-8 rounded border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Actualizar todos desde MyAnimeList</h2>
          <p className="text-sm text-gray-500">
            Busca cada video en MyAnimeList y guarda de una vez los datos que encuentre (Score,
            Ranked, Popularity, Members). Si el título principal no encuentra nada, prueba también
            con los nombres alternativos guardados en la descripción.
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {running ? `Actualizando... (${progress.done}/${progress.total})` : "Actualizar todos"}
        </button>
      </div>

      {running && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded bg-gray-50 p-2 text-xs text-gray-500">
          {results
            .slice(-8)
            .reverse()
            .map((r) => (
              <p key={r.videoId}>
                {r.matched ? "✓" : "✗"} {r.title}
              </p>
            ))}
        </div>
      )}

      {summary && (
        <div className="mt-4">
          <p className="text-sm font-medium">
            {summary.matched} de {summary.total} videos actualizados desde MyAnimeList
            {summary.unmatched > 0 ? ` — ${summary.unmatched} sin coincidencia.` : "."}
          </p>

          {unmatchedResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {unmatchedResults.map((r) => (
                <div key={r.videoId} className="flex items-center gap-3 rounded border p-2">
                  <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {r.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumbnail} alt={r.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-gray-500">Sin coincidencia en MyAnimeList</p>
                  </div>
                  <Link
                    href={`/admin/videos/${r.videoId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Revisar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
