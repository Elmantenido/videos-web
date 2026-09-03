import { auth } from "@/auth";

/** auth() throws if AUTH_SECRET is missing/misconfigured. Every page calls
 * this indirectly via the header, so a deploy mistake there should degrade
 * to "logged out" instead of 500ing the entire site. */
export async function getSessionSafely() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSessionSafely();
  return session?.user?.id ?? null;
}
