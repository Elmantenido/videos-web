import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.category.upsert({
    where: { slug: "general" },
    update: {},
    create: { name: "General", slug: "general" },
  });

  await prisma.video.upsert({
    where: { slug: "video-de-ejemplo" },
    update: {},
    create: {
      title: "Video de ejemplo",
      slug: "video-de-ejemplo",
      description: "Este es un video de ejemplo para probar el sitio.",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      duration: "3:33",
      categories: { connect: [{ id: cat.id }] },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
