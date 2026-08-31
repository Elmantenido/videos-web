import { browserHeaders } from "@/lib/browser-headers";

export type MalMatch = {
  title: string;
  url: string;
  score: string | null;
  ranked: string | null;
  popularity: string | null;
  members: string | null;
};

/** Strips a trailing "Episode N" / "Ep N" / plain " N" so sequels/episodes
 * search MyAnimeList by their series name (e.g. "So low 3" -> "So low"). */
function stripEpisodeNumber(title: string): string {
  return title.replace(/\s*(?:episode|ep\.?)?\s*\d+\s*$/i, "").trim();
}

// Combining diacritical marks (U+0300-U+036F), stripped after NFD
// normalization so accented and unaccented spellings of a title overlap.
const COMBINING_MARKS = new RegExp(`[\\u0300-\\u036f]`, "g");

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * MAL's search falls back to loosely-related (sometimes essentially
 * unrelated) results when nothing matches well -- a nonsense query still
 * comes back with hundreds of hits. This is the sanity gate that keeps a
 * clearly-unrelated result from ever being accepted as "the" match.
 */
function titlesLikelyMatch(query: string, candidate: string): boolean {
  const normQuery = normalizeTitle(query);
  const normCandidate = normalizeTitle(candidate);
  if (!normQuery || !normCandidate) return false;
  return normCandidate.includes(normQuery) || normQuery.includes(normCandidate);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: browserHeaders(),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MyAnimeList respondió con estado ${res.status}`);
  return res.text();
}

type SearchResult = { title: string; type: string; url: string };

/** Parses MAL's classic search results table (anime.php?q=...). Scoped to
 * the results table specifically, not the whole page, so an unrelated
 * <tr> elsewhere (ads, sidebars) can't be mistaken for a result row. */
function parseSearchResults(html: string): SearchResult[] {
  const tableSection = html.match(/js-categories-seasonal js-block-list list"[\s\S]*?<\/table>/);
  const scope = tableSection ? tableSection[0] : html;

  const results: SearchResult[] = [];
  const rows = scope.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];

  for (const row of rows) {
    const titleMatch = row.match(
      /class="hoverinfo_trigger fw-b fl-l"\s+href="([^"]+)"[\s\S]*?<strong>([^<]+)<\/strong>/
    );
    const typeMatch = row.match(/width="45">\s*([A-Za-z ]+?)\s*<\/td>/);
    if (!titleMatch || !typeMatch) continue;

    results.push({
      url: titleMatch[1],
      title: titleMatch[2].trim(),
      type: typeMatch[1].trim(),
    });
  }

  return results;
}

function extractScore(html: string): string | null {
  const match = html.match(/itemprop="ratingValue"[^>]*>([^<]+)</i);
  return match ? match[1].trim() : null;
}

function extractStat(html: string, label: string): string | null {
  const regex = new RegExp(`<span class="dark_text">${label}:</span>\\s*([^<\\n]+)`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Searches MyAnimeList for a video's title (series name, numbering
 * stripped) and, if a genuinely matching result is found, fetches that
 * entry's stats. MAL's search falls back to loosely-related results for
 * anything that doesn't match well (a nonsense query still returns
 * hundreds of hits), so every candidate is first filtered down to ones
 * whose title actually corresponds to the query -- only among THOSE is an
 * OVA-type result preferred, since that's what this catalog is
 * overwhelmingly made of. Returns null if nothing genuinely matched --
 * never throws for "no match", only for network/parsing failures the
 * caller should surface as an error.
 */
export async function lookupMyAnimeList(videoTitle: string): Promise<MalMatch | null> {
  const query = stripEpisodeNumber(videoTitle);
  if (query.length < 2) return null;

  const searchHtml = await fetchText(
    `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime`
  );
  const results = parseSearchResults(searchHtml).filter((r) => titlesLikelyMatch(query, r.title));
  if (results.length === 0) return null;

  const match = results.find((r) => r.type.toUpperCase() === "OVA") ?? results[0];
  const detailHtml = await fetchText(match.url);

  return {
    title: match.title,
    url: match.url,
    score: extractScore(detailHtml),
    ranked: extractStat(detailHtml, "Ranked"),
    popularity: extractStat(detailHtml, "Popularity"),
    members: extractStat(detailHtml, "Members"),
  };
}
