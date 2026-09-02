import type { Metadata } from "next";

// Página trampa (ver HoneypotLink.tsx y lib/scoring/request.ts). No hay
// nada real acá -- el simple hecho de pedir esta URL ya deja registrada
// la señal de honeypot en proxy.ts antes de que esta página se renderice.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PreviewFullPage() {
  return null;
}
