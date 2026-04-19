"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import Link from "next/link";
import { StockAutocomplete } from "./StockAutocomplete";

/**
 * Navbar-embedded search:
 * - Inline autocomplete on sm+ screens
 * - Collapsible icon-triggered overlay on mobile
 */
export function NavbarSearch() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile overlay on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop inline search */}
      <div className="hidden sm:block w-72 md:w-96">
        <StockAutocomplete size="sm" placeholder="Search ticker…" />
      </div>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="sm:hidden btn !py-1.5 !px-3 text-xs"
        aria-label="Search"
      >
        <SearchIcon className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm sm:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="bg-bg-card border-b border-border p-3 flex items-center gap-2">
            <div className="flex-1">
              <StockAutocomplete
                autoFocus
                size="md"
                placeholder="Search DSE ticker…"
                onSelect={() => setMobileOpen(false)}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn !p-2"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3">
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-200 underline"
            >
              Open full search page →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
