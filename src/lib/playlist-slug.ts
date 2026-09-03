import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Random alphanumeric playlist slug (not derived from the name), retried on collision. */
export async function generatePlaylistSlug(): Promise<string> {
  for (;;) {
    const slug = randomSlug();
    const existing = await prisma.playlist.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
}
