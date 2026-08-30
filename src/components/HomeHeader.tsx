import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SidebarNav from "@/components/SidebarNav";

type Props = {
  brandPrefix: string;
  brandSuffix: string;
  navHome: string;
  navExplore: string;
  navCategories: string;
  activeTab: "home" | "explore";
};

export default function HomeHeader({
  brandPrefix,
  brandSuffix,
  navHome,
  navExplore,
  navCategories,
  activeTab,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar-start">
        <SidebarNav />
        <Link href="/" className="brand" aria-label={`${brandPrefix}${brandSuffix} home`}>
          <span className="brand-mark"><span>{brandPrefix.charAt(0)}</span></span>
          <span>{brandPrefix}<span>{brandSuffix}</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={activeTab === "home" ? "active" : ""} href="/">{navHome}</Link>
          <Link className={activeTab === "explore" ? "active" : ""} href="/explore">{navExplore}</Link>
          <Link href="/explore#categorias">{navCategories}</Link>
          <Link href="#trending">Trending</Link>
        </nav>
      </div>
      <div className="top-actions">
        <SearchBox />
      </div>
    </header>
  );
}
