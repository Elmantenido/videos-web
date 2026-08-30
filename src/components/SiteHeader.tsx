import Link from "next/link";
import SearchBox from "@/components/SearchBox";

type Props = {
  brandPrefix: string;
  brandSuffix: string;
};

export default function SiteHeader({ brandPrefix, brandSuffix }: Props) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-start">
          <Link href="/" className="brand" aria-label={`${brandPrefix}${brandSuffix} home`}>
            <span className="brand-mark">{brandPrefix.charAt(0)}</span>
            <span>{brandPrefix}<span>{brandSuffix}</span></span>
          </Link>
        </div>
        <div className="top-actions">
          <SearchBox />
        </div>
      </header>
    </div>
  );
}
