"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ResultItem = {
  videoId: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  ok: boolean;
  reason: string;
};

type Summary = { total: number; ok: number; bad: number };

export default function VerifyAllButton() {
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

    const source = new EventSource("/api/admin/verify-all");

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

  const badResults = results.filter((r) => !r.ok);

  return (
    <div className="mb-8 rounded border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Verificar todos los videos</h2>
          <p className="text-sm text-gray-500">
            Prueba la reproducción de cada video subido y genera un informe con los que fallan.
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {running ? `Verificando... (${progress.done}/${progress.total})` : "Verificar todos"}
        </button>
      </div>

      {running && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded bg-gray-50 p-2 text-xs text-gray-500">
          {results
            .slice(-8)
            .reverse()
            .map((r) => (
              <p key={r.videoId}>
                {r.ok ? "✓" : "✗"} {r.title}
              </p>
            ))}
        </div>
      )}

      {summary && (
        <div className="mt-4">
          <p className="text-sm font-medium">
            {summary.ok} de {summary.total} videos reproducen correctamente
            {summary.bad > 0 ? ` — ${summary.bad} con problemas` : ""}.
          </p>

          {badResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {badResults.map((r) => (
                <div key={r.videoId} className="flex items-center gap-3 rounded border p-2">
                  <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {r.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumbnail} alt={r.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-red-600">{r.reason}</p>
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
