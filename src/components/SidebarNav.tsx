"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/recent-uploads", label: "Recent Uploads" },
  { href: "/new-releases", label: "New Releases" },
  { href: "/random", label: "Random" },
  { href: "/#trending", label: "Trending" },
  { href: "/videos", label: "All Videos" },
  { href: "/explore", label: "Explore" },
  { href: "/explore#categorias", label: "Categories" },
  { href: "/search", label: "Search" },
];

export default function SidebarNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="icon-button sidebar-toggle"
      >
        ☰
      </button>

      <div
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <nav
          className="sidebar-drawer"
          aria-label="Site navigation"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="sidebar-close"
          >
            ✕
          </button>
          <ul className="sidebar-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
