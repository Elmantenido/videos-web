"use client";

import { useState, useTransition } from "react";

type Result = { ok: boolean; message: string };

export default function MalLookupButton({ lookup }: { lookup: () => Promise<Result> }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      setResult(await lookup());
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Buscando..." : "Buscar en MyAnimeList"}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
          {result.ok ? "✓ " : "✗ "}
          {result.message}
        </p>
      )}
    </div>
  );
}
