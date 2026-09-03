import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "./SignInForm";
import { signInWithGoogle } from "./actions";

export const metadata: Metadata = { title: "Sign In", robots: { index: false, follow: true } };

export default async function SignInPage() {
  const s = await getSiteSettings();

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <div className="auth-page">
          <div className="auth-card">
            <h1>Sign In</h1>
            <SignInForm />
            <div className="auth-divider"><span>o</span></div>
            <form action={signInWithGoogle}>
              <button type="submit" className="auth-google-button">Continuar con Google</button>
            </form>
            <p className="auth-switch">
              ¿No tenés cuenta? <Link href="/register">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />
    </main>
  );
}
