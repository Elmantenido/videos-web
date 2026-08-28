"use client";

type Category = { id: number; name: string };

type Props = {
  action: (formData: FormData) => void;
  submitLabel: string;
  categories: Category[];
  defaultValues?: {
    title: string;
    description: string | null;
    embedUrl: string;
    thumbnail: string | null;
    duration: string | null;
    studio: string | null;
    published: boolean;
    categoryIds: number[];
    tagNames: string;
  };
};

export default function VideoForm({ action, submitLabel, categories, defaultValues }: Props) {
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
