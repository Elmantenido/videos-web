import { addAssetHits } from "@/lib/scoring/engine";

// Los requests a _next/static/_next/image son demasiados por página como
// para escribir en la base uno por uno (spec: "no debe añadir carga
// perceptible por request... en lote"). Se cuentan en memoria y se
// vuelcan a IpScore cada FLUSH_INTERVAL_MS.
const pending = new Map<string, number>();
const FLUSH_INTERVAL_MS = 15_000;

export function recordAssetHit(ip: string): void {
  pending.set(ip, (pending.get(ip) ?? 0) + 1);
}

/**
 * Lo que todavía no se volcó a IpScore.assetHits. El paso agregado
 * (engine.ts) corre casi al instante en cada request, muy por debajo de
 * FLUSH_INTERVAL_MS -- sin esto, cualquier sesión (humana o no) parece
 * tener 0 assets durante sus primeros ~15s, aunque el navegador ya los
 * haya pedido, y como la señal tiene cooldown queda marcada igual
 * después de que el dato se corrige.
 */
export function getPendingAssetHits(ip: string): number {
  return pending.get(ip) ?? 0;
}

async function flush(): Promise<void> {
  if (pending.size === 0) return;
  const batch = Array.from(pending.entries());
  pending.clear();
  await Promise.all(batch.map(([ip, count]) => addAssetHits(ip, count).catch(() => {})));
}

setInterval(() => {
  flush().catch(() => {});
}, FLUSH_INTERVAL_MS).unref();
