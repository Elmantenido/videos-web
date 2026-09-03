import Link from "next/link";
import { getSessionSafely } from "@/lib/session";
import { signOutAction } from "@/app/actions/session";

export default async function AuthHeaderButtons() {
  const session = await getSessionSafely();

  if (session?.user) {
    return (
      <div className="top-auth">
        <Link href="/account" className="auth-header-link">My Playlists</Link>
        <form action={signOutAction}>
          <button type="submit" className="auth-header-link">Sign Out</button>
        </form>
      </div>
    );
  }

  return (
    <div className="top-auth">
      <Link href="/sign-in" className="auth-header-link">Sign In</Link>
      <Link href="/register" className="auth-header-button">Create Account</Link>
    </div>
  );
}
