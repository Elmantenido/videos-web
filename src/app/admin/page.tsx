"use client";

import { useState } from "react";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    embedUrl: "",
    thumbnail: "",
    duration: "",
    categoryNames: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Guardando...");
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        ...form,
        categoryNames: form.categoryNames
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      }),
    });

    if (res.ok) {
      setStatus("Video agregado ✔");
      setForm({
        title: "",
        description: "",
        embedUrl: "",
        thumbnail: "",
        duration: "",
        categoryNames: "",
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(`Error: ${data.error ?? res.statusText}`);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Agregar video</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="Clave de administrador"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded border px-3 py-2"
          required
        />
        <textarea
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border px-3 py-2"
          rows={3}
        />
        <input
          type="url"
          placeholder="URL del embed (ej. https://www.youtube.com/embed/XXXX)"
          value={form.embedUrl}
          onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="url"
          placeholder="URL de la miniatura (opcional)"
          value={form.thumbnail}
          onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Duración (ej. 12:34)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Categorías (separadas por coma, ej. Tutoriales, Vlogs)"
          value={form.categoryNames}
          onChange={(e) => setForm({ ...form, categoryNames: e.target.value })}
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Guardar
        </button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </form>
    </main>
  );
}
