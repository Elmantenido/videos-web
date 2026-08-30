type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic sweep so this Map can't grow without bound from many distinct
// keys (e.g. an attacker rotating source IPs) -- each entry is tiny, but
// "never cleaned up" is still a slow memory leak without this.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  },
  10 * 60 * 1000
).unref();

/** Fixed-window limiter. Returns true if this call is allowed under `limit`
 * hits per `windowMs` for the given key (e.g. `login:<ip>`). Single-process,
 * in-memory -- fine for this app's single PM2 instance, not for a cluster. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}
