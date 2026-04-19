"use client";

import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFavorites() {
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      const json = await res.json();
      setFavorites(json.favorites ?? []);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function toggleFavorite(symbol: string) {
    const s = symbol.toUpperCase();
    const isFav = favorites.includes(s);
    
    try {
      const res = await fetch("/api/favorites", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: s }),
      });
      const json = await res.json();
      setFavorites(json.favorites ?? []);
      return !isFav;
    } catch {
      return false;
    }
  }

  function isFavorite(symbol: string): boolean {
    return favorites.includes(symbol.toUpperCase());
  }

  return { favorites, loading, toggleFavorite, isFavorite, refresh: fetchFavorites };
}
