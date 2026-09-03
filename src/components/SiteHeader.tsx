import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SidebarNav from "@/components/SidebarNav";
import AuthHeaderButtons from "@/components/AuthHeaderButtons";
import { getSessionSafely } from "@/lib/session";

type Props = {
  brandPrefix: string;
  brandSuffix: string;
};

export default async function SiteHeader({ brandPrefix, brandSuffix }: Props) {
  const session = await getSessionSafely();
  return (
    <div className="header-shell">
      <header className="topbar">
        <div className="topbar-start">
          <SidebarNav loggedIn={Boolean(session?.user)} />
          <Link href="/" className="brand" aria-label={`${brandPrefix}${brandSuffix} home`}>
            <span className="brand-mark"><span>{brandPrefix.charAt(0)}</span></span>
            <span>{brandPrefix}<span>{brandSuffix}</span></span>
          </Link>
        </div>
        <div className="top-actions">
          <SearchBox />
        </div>
        <AuthHeaderButtons />
      </header>
    </div>
  );
}
