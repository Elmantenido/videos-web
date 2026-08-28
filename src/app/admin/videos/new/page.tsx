import Link from "next/link";
import VideoForm from "../VideoForm";
import { createVideo } from "../../actions";

export default function NewVideoPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Nuevo video</h1>
      <VideoForm action={createVideo} submitLabel="Crear video" />
    </main>
  );
}
