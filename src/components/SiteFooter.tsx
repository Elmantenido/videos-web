import Link from "next/link";

type Props = {
  copyright: string;
  tagline: string;
  adminLabel: string;
  keywordPhrase?: string;
};

export default function SiteFooter({ copyright, tagline, adminLabel, keywordPhrase }: Props) {
  return (
    <>
      {keywordPhrase && <h2 className="footer-keyword">{keywordPhrase}</h2>}
      <footer className="footer">
        <span>{copyright}</span>
        <span>{tagline}</span>
        <Link href="/admin">{adminLabel} ↗</Link>
      </footer>
    </>
  );
}
