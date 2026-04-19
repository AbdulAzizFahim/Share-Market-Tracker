import Link from "next/link";
import { LineChart, List, Star } from "lucide-react";
import { NavbarSearch } from "./NavbarSearch";

export function Navbar() {
  return (
    <header className="border-b border-border bg-bg-soft/50 backdrop-blur sticky top-0 z-30">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold shrink-0"
        >
          <LineChart className="w-5 h-5 text-accent" />
          <span className="hidden sm:inline">DSE Watch</span>
        </Link>

        <div className="flex-1 flex items-center justify-end sm:justify-center">
          <NavbarSearch />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="btn !py-1.5 !px-3 text-xs"
            title="Favorites"
          >
            <Star className="w-4 h-4" />
            <span className="hidden md:inline">Favorites</span>
          </Link>
          <Link
            href="/search"
            className="btn !py-1.5 !px-3 text-xs"
            title="Browse all"
          >
            <List className="w-4 h-4" />
            <span className="hidden md:inline">Browse</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
