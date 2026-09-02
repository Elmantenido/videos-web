import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite viene en modo "delete" (rollback journal) por default: cada
// escritura toma un lock exclusivo y serializa contra todas las demás
// conexiones. El motor de detección de scraping (lib/scoring) suma una
// escritura más por request sobre esta misma base -- bajo tráfico real
// concurrente eso puede toparse con "database is locked". WAL permite
// lecturas concurrentes mientras hay una escritura en curso. Es un ajuste
// que queda grabado en el archivo .db, así que correrlo de nuevo en cada
// arranque es barato y no rompe nada si ya estaba en WAL.
prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
