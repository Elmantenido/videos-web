import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const take = Number(searchParams.get("take") ?? 24);
  const cursor = searchParams.get("cursor");

  const videos = await prisma.video.findMany({
    where: {
      published: true,
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
    include: { categories: true },
  });

  return NextResponse.json({ videos });
}

// Protegido con una clave simple en el header x-admin-key (ver .env ADMIN_KEY)
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, embedUrl, thumbnail, duration, categoryNames } =
    body;

  if (!title || !embedUrl) {
    return NextResponse.json(
      { error: "title y embedUrl son obligatorios" },
      { status: 400 }
    );
  }

  const names: string[] = Array.isArray(categoryNames)
    ? categoryNames.filter(Boolean)
    : [];

  const categories = await Promise.all(
    names.map((name) =>
      prisma.category.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      })
    )
  );

  const video = await prisma.video.create({
    data: {
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      description,
      embedUrl,
      thumbnail,
      duration,
      categories: { connect: categories.map((c) => ({ id: c.id })) },
    },
  });

  return NextResponse.json({ video }, { status: 201 });
}
