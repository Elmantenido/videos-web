"use client";

import { useEffect } from "react";

const PING_INTERVAL_MS = 20_000;

export default function VisitHeartbeat() {
  useEffect(() => {
    function ping() {
      if (document.visibilityState === "visible") {
        fetch("/api/track/ping", { method: "POST" }).catch(() => {});
      }
    }

    const interval = setInterval(ping, PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
