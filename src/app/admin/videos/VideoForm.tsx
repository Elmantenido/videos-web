"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/slugify";
import { extractPreviewImages } from "@/lib/preview";
import { IMPORT_STORAGE_KEY } from "../extraction/ExtractionForm";

type Category = { id: number; name: string };

type Props = {
  action: (formData: FormData) => void;
  submitLabel: string;
  categories: Category[];
  defaultValues?: {
    title: string;
    slug: string;
    description: string | null;
    embedUrl: string;
    thumbnail: string | null;
    backgroundImage: string | null;
    duration: string | null;
    studio: string | null;
    previewHtml: string | null;
    published: boolean;
    categoryIds: number[];
    tagNames: string;
  };
};

export default function VideoForm({ action, submitLabel, categories, defaultValues }: Props) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug));
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [embedUrl, setEmbedUrl] = useState(defaultValues?.embedUrl ?? "");
  const [thumbnail, setThumbnail] = useState(defaultValues?.thumbnail ?? "");
  const [backgroundImage, setBackgroundImage] = useState(defaultValues?.backgroundImage ?? "");
  const [duration, setDuration] = useState(defaultValues?.duration ?? "");
  const [studio, setStudio] = useState(defaultValues?.studio ?? "");
  const [previewHtml, setPreviewHtml] = useState(defaultValues?.previewHtml ?? "");
  const [categoryNamesText, setCategoryNamesText] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    defaultValues?.categoryIds ?? []
  );
  const [tagNamesText, setTagNamesText] = useState(defaultValues?.tagNames ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(() =>
    extractPreviewImages(defaultValues?.previewHtml ?? "")
  );

  // Only for the "new video" page: pick up data sent over from
  // /admin/extraction (another of the owner's own installations).
  useEffect(() => {
    if (defaultValues) return;
    const raw = sessionStorage.getItem(IMPORT_STORAGE_KEY);
    if (!raw) return;

    const timeout = setTimeout(() => {
      sessionStorage.removeItem(IMPORT_STORAGE_KEY);
      try {
        const imported = JSON.parse(raw);
        if (imported.title) setTitle(imported.title);
        if (imported.description) setDescription(imported.description);
        if (imported.embedUrl) setEmbedUrl(imported.embedUrl);
        if (imported.thumbnail) setThumbnail(imported.thumbnail);
        if (imported.backgroundImage) setBackgroundImage(imported.backgroundImage);
        if (imported.duration) setDuration(imported.duration);
        if (imported.studio) setStudio(imported.studio);
        if (imported.previewHtml) {
          setPreviewHtml(imported.previewHtml);
          setGalleryImages(extractPreviewImages(imported.previewHtml));
        }
        if (imported.categoryNames?.length) {
          // Match imported names against categories that already exist
          // (case-insensitively) so they get auto-checked instead of
          // duplicated as "new" categories.
          const matchedIds: number[] = [];
          const newNames: string[] = [];
          for (const rawName of imported.categoryNames as string[]) {
            const name = rawName.trim();
            if (!name) continue;
            const existing = categories.find(
              (c) => c.name.trim().toLowerCase() === name.toLowerCase()
            );
            if (existing) matchedIds.push(existing.id);
            else newNames.push(name.toUpperCase());
          }
          if (matchedIds.length) {
            setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...matchedIds])));
          }
          setCategoryNamesText(newNames.join(", "));
        }
        if (imported.tagNames?.length) setTagNamesText(imported.tagNames.join(", "));
        if (imported.title) setSlug(slugify(imported.title));
      } catch {
        // ignore malformed import payloads
      }
    }, 0);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Título
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </label>

      <label className="text-sm font-medium">
        URL del video (slug)
        <div className="mt-1 flex items-center gap-1 rounded border px-3 py-2 text-sm text-gray-500">
          <span>/video/</span>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className="flex-1 border-0 p-0 text-black outline-none"
            placeholder="se genera del título si lo dejas vacío"
          />
        </div>
      </label>

      <label className="text-sm font-medium">
        Descripción
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
        />
      </label>

      <label className="text-sm font-medium">
        Embed: pega la URL (ej. https://www.youtube.com/embed/XXXX) o el
        código de inserción completo (el <code>&lt;iframe&gt;</code> o{" "}
        <code>&lt;div&gt;</code> que te da la plataforma al elegir
        &quot;insertar&quot;)
        <textarea
          name="embedUrl"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2 font-mono text-xs"
          rows={4}
          required
        />
      </label>

      <div className="rounded border p-3">
        <p className="text-sm font-medium">Preview</p>
        <p className="mt-1 text-xs text-gray-500">
          Pega aquí el código HTML con las capturas del video. Se guarda y se
          muestra en la página del video, debajo de la descripción.
        </p>
        <textarea
          name="previewHtml"
          value={previewHtml}
          onChange={(e) => setPreviewHtml(e.target.value)}
          className="mt-2 w-full rounded border px-3 py-2 font-mono text-xs"
          rows={5}
          placeholder="<div>...código HTML con imágenes...</div>"
        />
        <button
          type="button"
          onClick={() => setGalleryImages(extractPreviewImages(previewHtml))}
          className="mt-2 rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Cargar imágenes de la vista previa
        </button>

        {previewHtml.trim() && galleryImages.length === 0 && (
          <p className="mt-2 text-xs text-amber-600">
            No se encontraron imágenes en ese HTML. Si usa carga diferida con un
            atributo distinto a src/data-src, dime cuál para agregarlo.
          </p>
        )}

        {galleryImages.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500">
              Elige una imagen para el reproductor (antes de dar play):
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {galleryImages.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setBackgroundImage(src)}
                  className={`aspect-video overflow-hidden rounded border-2 ${
                    backgroundImage === src ? "border-black" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <label className="text-sm font-medium">
        URL de la miniatura (se usa en las tarjetas: Last Videos, Random, Trending, categorías)
        <input
          type="url"
          name="thumbnail"
          value={thumbnail}
          onChange={(e) => setThumbnail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        URL de la imagen del reproductor (se ve dentro del reproductor de este
        video antes de darle play; puede ser distinta de la miniatura)
        <input
          type="url"
          name="backgroundImage"
          value={backgroundImage}
          onChange={(e) => setBackgroundImage(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        Duración (ej. 12:34)
        <input
          type="text"
          name="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        Estudio
        <input
          type="text"
          name="studio"
          value={studio}
          onChange={(e) => setStudio(e.target.value)}
          placeholder="Ej. Studio Ghibli"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <div className="text-sm font-medium">
        Categorías
        <div className="mt-1 flex flex-wrap gap-3 rounded border px-3 py-2">
          {categories.length === 0 && (
            <span className="text-gray-400">Aún no hay categorías creadas</span>
          )}
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-1 font-normal">
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                checked={selectedCategoryIds.includes(category.id)}
                onChange={(e) => {
                  setSelectedCategoryIds((prev) =>
                    e.target.checked
                      ? [...prev, category.id]
                      : prev.filter((id) => id !== category.id)
                  );
                }}
              />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <label className="text-sm font-medium">
        Nuevas categorías (separadas por coma, opcional)
        <input
          type="text"
          name="categoryNames"
          value={categoryNamesText}
          onChange={(e) => setCategoryNamesText(e.target.value)}
          placeholder="Tutoriales, Vlogs"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        Tags (separados por coma)
        <input
          type="text"
          name="tagNames"
          value={tagNamesText}
          onChange={(e) => setTagNamesText(e.target.value)}
          placeholder="destacado, 2026, corto"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaultValues?.published ?? true}
        />
        Publicado (visible en el sitio)
      </label>

      <button
        type="submit"
        className="mt-2 rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
