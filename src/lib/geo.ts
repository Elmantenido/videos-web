function isPrivateIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.3")
  );
}

export async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    if (data.status === "success" && data.country) return data.country as string;
  } catch {
    // geolocation is best-effort; ignore failures
  }
  return null;
}
