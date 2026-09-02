/**
 * Simula un scraper (requests secuenciales, UA de librería, sin cargar
 * CSS/JS/imágenes, sin correr el beacon de JS) contra un server de
 * `next dev` ya corriendo, y verifica que el motor de detección lo deja
 * en estado "confirmado" en menos de 100 requests (criterio de
 * aceptación del pedido original).
 *
 * Uso:
 *   npm run dev                      # en otra terminal
 *   npm run simulate-scraper
 *
 * No hay Nginx delante en dev, así que no hay X-Forwarded-For real -- el
 * script manda el suyo propio (una IP de TEST-NET-3, RFC 5737, reservada
 * para documentación/pruebas) para poder ejercitar el motor de puntaje,
 * que en producción confía en el X-Forwarded-For que agrega Nginx.
 */
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.SIMULATE_BASE_URL ?? "http://127.0.0.1:3000";
const TEST_IP = "203.0.113.77";
const MAX_REQUESTS = 80;
const DELAY_MS = 250;

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkServerUp() {
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`No se pudo conectar a ${BASE_URL}. ¿Está corriendo "npm run dev"?`);
    process.exit(1);
  }
}

async function main() {
  await checkServerUp();

  // Empieza cada corrida sin arrastrar puntaje de una prueba anterior.
  await prisma.ipScore.deleteMany({ where: { ip: TEST_IP } });

  console.log(`Simulando scraper contra ${BASE_URL} como ${TEST_IP}...\n`);

  let reachedConfirmed = false;
  let requestsSent = 0;

  for (let i = 1; i <= MAX_REQUESTS; i++) {
    requestsSent = i;
    await fetch(`${BASE_URL}/video/${i}`, {
      headers: {
        "user-agent": "python-requests/2.31.0",
        "x-forwarded-for": TEST_IP,
        // A propósito NO se mandan Accept-Language/Accept-Encoding/Sec-Fetch-*:
        // un cliente HTTP crudo normalmente no los manda como lo haría un navegador.
      },
    }).catch(() => {});

    await sleep(DELAY_MS);

    // Cada tanto revisa si ya escaló a "confirmado" para no seguir
    // pegándole al server más de lo necesario.
    if (i % 5 === 0) {
      const score = await prisma.ipScore.findUnique({ where: { ip: TEST_IP } });
      if (score?.state === "confirmado") {
        reachedConfirmed = true;
        break;
      }
    }
  }

  // Le da un margen al último after() en segundo plano (debounce del
  // paso agregado es de 5s) antes de leer el resultado final.
  await sleep(6000);

  const finalScore = await prisma.ipScore.findUnique({ where: { ip: TEST_IP } });
  const signals = await prisma.scoreSignal.findMany({
    where: { ip: TEST_IP },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Requests enviados: ${requestsSent}`);
  console.log(`Puntaje final: ${finalScore?.score ?? 0}`);
  console.log(`Estado final: ${finalScore?.state ?? "(sin registro)"}\n`);
  console.log("Desglose de señales disparadas:");
  for (const s of signals) {
    console.log(`  [+${s.weight}] ${s.key}${s.detail ? ` -- ${s.detail}` : ""}`);
  }

  const confirmed = reachedConfirmed || finalScore?.state === "confirmado";
  const withinBudget = requestsSent < 100;

  console.log(
    `\n${confirmed && withinBudget ? "OK" : "FALLÓ"}: estado confirmado=${confirmed} en ${requestsSent} requests (<100 requerido).`
  );

  await prisma.$disconnect();
  process.exit(confirmed && withinBudget ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
