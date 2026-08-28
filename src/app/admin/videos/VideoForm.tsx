"use client";

type Props = {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: {
    title: string;
    description: string | null;
    embedUrl: string;
    thumbnail: string | null;
    duration: string | null;
    published: boolean;
    categoryNames: string;
    tagNames: string;
  };
};

export default function VideoForm({ action, submitLabel, defaultValues }: Props) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Título
        <input
          type="text"
          name="title"
          defaultValue={defaultValues?.title}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
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
        URL del embed (ej. https://www.youtube.com/embed/XXXX)
        <input
          type="url"
          name="embedUrl"
          defaultValue={defaultValues?.embedUrl}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </label>

      <label className="text-sm font-medium">
        URL de la imagen/miniatura
        <input
          type="url"
          name="thumbnail"
          defaultValue={defaultValues?.thumbnail ?? ""}
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
        Categorías (separadas por coma)
        <input
          type="text"
          name="categoryNames"
          defaultValue={defaultValues?.categoryNames}
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
