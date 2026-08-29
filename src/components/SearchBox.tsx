"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PreviewVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
};

export default function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PreviewVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 3) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/videos?q=${encodeURIComponent(query.trim())}&take=6`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setResults(data.videos ?? []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) setTimeout(() => inputRef.current?.focus(), 0);
      return next;
    });
  }

  return (
    <div className="search-box" ref={containerRef}>
      <button
        className="icon-button"
        aria-label="Search videos"
        title="Search videos"
        onClick={toggleOpen}
      >
        ⌕
      </button>

      {open && (
        <div className="search-panel">
          <div className="search-input-row">
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search videos..."
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToResults();
                if (e.key === "Escape") setOpen(false);
              }}
              className="search-input"
            />
            <button className="search-submit" onClick={goToResults} aria-label="Search">
              ⌕
            </button>
          </div>

          {query.trim().length >= 3 && (
            <div className="search-preview">
              {loading && <p className="search-status">Searching…</p>}
              {!loading && results.length === 0 && (
                <p className="search-status">No results for &quot;{query}&quot;</p>
              )}
              {!loading &&
                results.map((video) => (
                  <Link
                    key={video.id}
                    href={`/video/${video.slug}`}
                    className="search-preview-row"
                    onClick={() => setOpen(false)}
                  >
                    <span className="search-preview-thumb">
                      {video.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnail} alt={video.title} />
                      ) : null}
                    </span>
                    <span className="search-preview-name">{video.title}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
