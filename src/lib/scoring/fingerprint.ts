import { createHash } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Huella de headers "estables" de un cliente real (no cambian entre
 * requests de la misma visita, a diferencia de la IP). Se usa para
 * agrupar rotación de IPs con el mismo fingerprint (scoring/engine.ts).
 *
 * No es un fingerprint de "orden de headers" -- la API de NextRequest.headers
 * no garantiza exponer el orden crudo en el que el cliente los mandó, así
 * que en cambio hasheamos el CONJUNTO de valores de los headers que sí
 * importan para distinguir navegadores entre sí. Suficiente para agrupar
 * "mismo cliente, IP distinta"; no reemplaza un fingerprint de canvas/TLS.
 */
export function computeFingerprint(req: NextRequest): string {
  const parts = [
    req.headers.get("user-agent") ?? "",
    req.headers.get("accept-language") ?? "",
    req.headers.get("accept-encoding") ?? "",
    req.headers.get("accept") ?? "",
    req.headers.get("sec-ch-ua") ?? "",
    req.headers.get("sec-ch-ua-platform") ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}
