import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VideoForm from "../VideoForm";
import { updateVideo, deleteVideo } from "../../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditVideoPage({ params }: Props) {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id: Number(id) },
    include: { categories: true, tags: true },
  });
  if (!video) notFound();

  const boundUpdate = updateVideo.bind(null, video.id);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Editar video</h1>
      <VideoForm
        action={boundUpdate}
        submitLabel="Guardar cambios"
        defaultValues={{
          title: video.title,
          description: video.description,
          embedUrl: video.embedUrl,
          thumbnail: video.thumbnail,
          duration: video.duration,
          published: video.published,
          categoryNames: video.categories.map((c) => c.name).join(", "),
          tagNames: video.tags.map((t) => t.name).join(", "),
        }}
      />

      <form
        action={async () => {
          "use server";
          await deleteVideo(video.id);
          redirect("/admin");
        }}
        className="mt-6 border-t pt-6"
      >
        <button className="text-sm text-red-600 hover:underline">
          Borrar este video
        </button>
      </form>
    </main>
  );
}
