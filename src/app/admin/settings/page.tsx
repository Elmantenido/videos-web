import Link from "next/link";
import { getSiteSettings, SETTING_GROUPS } from "@/lib/site-settings";
import { updateSiteSettings } from "../actions";

export default async function SiteSettingsPage() {
  const values = await getSiteSettings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Textos del sitio</h1>

      <form action={updateSiteSettings} className="flex flex-col gap-8">
        <input type="hidden" name="formScope" value="settings" />
        {SETTING_GROUPS.map((group) => (
          <fieldset key={group.title} className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold uppercase text-gray-500">
              {group.title}
            </legend>
            {group.fields.map((field) =>
              field.type === "checkbox" ? (
                <label key={field.key} className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name={field.key}
                    defaultChecked={values[field.key] === "true"}
                  />
                  {field.label}
                </label>
              ) : (
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
              )
            )}
          </fieldset>
        ))}

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Guardar textos
        </button>
      </form>
    </main>
  );
}
