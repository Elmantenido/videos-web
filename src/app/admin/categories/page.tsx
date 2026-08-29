import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteCategory } from "../actions";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Categorías</h1>

      <div className="overflow-hidden rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Videos</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t">
                <td className="px-3 py-2 font-medium">{category.name}</td>
                <td className="px-3 py-2 text-gray-500">{category._count.videos}</td>
                <td className="px-3 py-2 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await deleteCategory(category.id);
                    }}
                  >
                    <button className="text-red-600 hover:underline">Borrar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <p className="p-6 text-center text-gray-500">Aún no hay categorías creadas.</p>
        )}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Borrar una categoría no borra los videos, solo les quita esa etiqueta.
      </p>
    </main>
  );
}
