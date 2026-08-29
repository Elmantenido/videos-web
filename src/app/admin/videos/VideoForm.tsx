"use client";

import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { extractPreviewImages } from "@/lib/preview";

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
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug));
  const [thumbnail, setThumbnail] = useState(defaultValues?.thumbnail ?? "");
  const [backgroundImage, setBackgroundImage] = useState(defaultValues?.backgroundImage ?? "");
  const [previewHtml, setPreviewHtml] = useState(defaultValues?.previewHtml ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(() =>
    extractPreviewImages(defaultValues?.previewHtml ?? "")
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Título
        <input
          type="text"
          name="title"
          defaultValue={defaultValues?.title}
          onChange={(e) => {
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
          defaultValue={defaultValues?.description ?? ""}
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
          defaultValue={defaultValues?.embedUrl}
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
          defaultValue={defaultValues?.duration ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        Estudio
        <input
          type="text"
          name="studio"
          defaultValue={defaultValues?.studio ?? ""}
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
                defaultChecked={defaultValues?.categoryIds.includes(category.id)}
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
          placeholder="Tutoriales, Vlogs"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium">
        Tags (separados por coma)
        <input
          type="text"
          name="tagNames"
          defaultValue={defaultValues?.tagNames}
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
