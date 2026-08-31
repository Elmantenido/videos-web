"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return <Icon>{direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}</Icon>;
}

const NAV_ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <Icon>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </Icon>
    ),
  },
  {
    href: "/recent-uploads",
    label: "Recent Uploads",
    icon: (
      <Icon>
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </Icon>
    ),
  },
  {
    href: "/new-releases",
    label: "New Releases",
    icon: (
      <Icon>
        <path d="M12 3l2.5 5.5L20 9l-4.5 4 1 6L12 16l-4.5 3 1-6L4 9l5.5-.5Z" />
      </Icon>
    ),
  },
  {
    href: "/random",
    label: "Random",
    icon: (
      <Icon>
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </Icon>
    ),
  },
  {
    href: "/#trending",
    label: "Trending",
    icon: (
      <Icon>
        <path d="M12 3s-4 3.5-4 7.5a4 4 0 0 0 8 0c0-1-.4-2-1-3 .3 1.7-.5 3-2 3.5" />
      </Icon>
    ),
  },
  {
    href: "/videos",
    label: "All Videos",
    icon: (
      <Icon>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3Z" />
      </Icon>
    ),
  },
  {
    href: "/explore",
    label: "Explore",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5Z" />
      </Icon>
    ),
  },
  {
    href: "/explore#categorias",
    label: "Categories",
    icon: (
      <Icon>
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </Icon>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </Icon>
    ),
  },
];

// Desktop-only preference: the rail shows icons + labels the first time a
// visitor arrives (no stored value yet), and remembers whether they
// collapsed it to icons-only on a later visit. Read via useSyncExternalStore
// (not useState+useEffect) so the very first client render matches the
// server-rendered HTML (always "expanded") instead of briefly flashing the
// wrong state while a localStorage-reading effect catches up.
const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";
let collapsedCache: boolean | null = null;
const collapseListeners = new Set<() => void>();

function readCollapsed() {
  if (collapsedCache === null) {
    collapsedCache = localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
  }
  return collapsedCache;
}

function writeCollapsed(value: boolean) {
  collapsedCache = value;
  localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? "1" : "0");
  collapseListeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

function getServerSnapshot() {
  return false;
}

export default function SidebarNav() {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, getServerSnapshot);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function toggleCollapsed() {
    writeCollapsed(!collapsed);
  }

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
          className={`sidebar-drawer ${collapsed ? "is-collapsed" : ""}`}
          aria-label="Site navigation"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sidebar-drawer-top">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="sidebar-close"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              className="sidebar-collapse-toggle"
            >
              <ChevronIcon direction={collapsed ? "right" : "left"} />
            </button>
          </div>
          <ul className="sidebar-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} title={item.label}>
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
