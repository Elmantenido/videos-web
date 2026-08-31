import Link from "next/link";

type Props = {
  copyright: string;
  tagline: string;
  adminLabel: string;
};

export default function SiteFooter({ copyright, tagline, adminLabel }: Props) {
  return (
    <footer className="footer">
      <span>{copyright}</span>
      <span>{tagline}</span>
      <Link href="/admin">{adminLabel} ↗</Link>
    </footer>
  );
}
