import Link from "next/link";
import { getSiteSettings, SEO_FIELDS } from "@/lib/site-settings";
import { updateSiteSettings } from "../actions";

export default async function SeoSettingsPage() {
  const values = await getSiteSettings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">SEO</h1>
      <p className="mb-6 text-sm text-gray-500">
        Título, meta descripción e información que usan los buscadores y las
        redes sociales al mostrar tu sitio.
      </p>

      <form action={updateSiteSettings} className="flex flex-col gap-4">
        <input type="hidden" name="formScope" value="seo" />
        {SEO_FIELDS.map((field) => (
          <label key={field.key} className="text-sm font-medium">
            {field.label}
            {field.multiline ? (
              <textarea
                name={field.key}
                defaultValue={values[field.key]}
                rows={3}
                className="mt-1 w-full rounded border px-3 py-2 font-normal"
              />
            ) : (
              <input
                type="text"
                name={field.key}
                defaultValue={values[field.key]}
                className="mt-1 w-full rounded border px-3 py-2 font-normal"
              />
            )}
          </label>
        ))}

        <button
          type="submit"
          className="mt-2 rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Guardar SEO
        </button>
      </form>
    </main>
  );
}
