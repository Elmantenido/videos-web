"use client";

import { useState, useTransition } from "react";

type Result = { ok: boolean; reason: string };

export default function VerifyPlaybackButton({ verify }: { verify: () => Promise<Result> }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      setResult(await verify());
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
        {pending ? "Verificando..." : "Verificar reproducción"}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
          {result.ok ? "✓ " : "✗ "}
          {result.reason}
        </p>
      )}
    </div>
  );
}
