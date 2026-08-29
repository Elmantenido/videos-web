import Link from "next/link";
import ExtractionForm from "./ExtractionForm";

export default function ExtractionPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">Extracción</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pega la URL de un video de tu otra instalación de este mismo proyecto
        para traer su título, descripción, imágenes, categorías y tags, y
        usarlos como base al crear el video aquí. Requiere que ambos sitios
        tengan configurado el mismo <code>EXPORT_API_KEY</code>.
      </p>
      <ExtractionForm />
    </main>
  );
}
