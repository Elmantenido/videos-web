import Link from "next/link";

type Props = {
  copyright: string;
  tagline: string;
  adminLabel: string;
  keywordPhrase?: string;
  partnersHtml?: string;
};

export default function SiteFooter({ copyright, tagline, adminLabel, keywordPhrase, partnersHtml }: Props) {
  return (
    <>
      {keywordPhrase && <h2 className="footer-keyword">{keywordPhrase}</h2>}
      {partnersHtml && (
        // Admin-authored (site settings, same trust level as a video's
        // previewHtml) -- not user input, so raw HTML is intentional here.
        <div className="footer-partners" dangerouslySetInnerHTML={{ __html: partnersHtml }} />
      )}
      <footer className="footer">
        <span>{copyright}</span>
        <h3>{tagline}</h3>
        <Link href="/admin">{adminLabel} ↗</Link>
      </footer>
    </>
  );
}
