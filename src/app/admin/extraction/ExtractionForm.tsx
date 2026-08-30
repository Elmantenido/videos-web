"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractFromUrl } from "../actions";

type ExtractedData = {
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnail: string | null;
  backgroundImage: string | null;
  duration: string | null;
  studio: string | null;
  releasedAt: string | null;
  previewHtml: string | null;
  categoryNames: string[];
  tagNames: string[];
};

export const IMPORT_STORAGE_KEY = "novaflix_video_import";

export default function ExtractionForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    const result = await extractFromUrl(url);
    setLoading(false);

    if (result.error) setError(result.error);
    else setData(result.data ?? null);
  }

  function useThisData() {
    if (!data) return;
    sessionStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(data));
    router.push("/admin/videos/new");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleExtract} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-otro-sitio.com/video/algun-slug"
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Extraer"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="rounded border p-4">
          <div className="flex gap-4">
            {data.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnail}
                alt=""
                className="h-32 w-24 flex-shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{data.title}</p>
              {data.studio && <p className="text-sm text-gray-500">{data.studio}</p>}
              {data.releasedAt && (
                <p className="text-sm text-gray-500">Released: {data.releasedAt}</p>
              )}
              {data.description && (
                <p className="mt-1 line-clamp-3 text-sm text-gray-600">{data.description}</p>
              )}
              {data.categoryNames.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Categorías: {data.categoryNames.join(", ")}
                </p>
              )}
              {data.tagNames.length > 0 && (
                <p className="text-xs text-gray-500">Tags: {data.tagNames.join(", ")}</p>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-amber-600">
            El enlace del video (embed) no viene incluido por seguridad —
            deberás pegarlo tú mismo en el siguiente paso.
          </p>

          <button
            onClick={useThisData}
            className="mt-2 rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Usar estos datos para crear el video
          </button>
        </div>
      )}
    </div>
  );
}
