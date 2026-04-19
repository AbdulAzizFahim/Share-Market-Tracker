const FAV_KEY = "dse.favorites.v1";
const RECENT_KEY = "dse.recent.v1";
const MAX_RECENT = 10;

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new CustomEvent("dse-storage-change", { detail: { key } }),
    );
  } catch {
    // ignore quota errors
  }
}

export function getFavorites(): string[] {
  return read<string[]>(FAV_KEY, []);
}

export function isFavorite(symbol: string): boolean {
  return getFavorites().includes(symbol.toUpperCase());
}

function addFavorite(symbol: string) {
  const s = symbol.toUpperCase();
  const favs = getFavorites();
  if (!favs.includes(s)) {
    favs.push(s);
    write(FAV_KEY, favs);
  }
}

function removeFavorite(symbol: string) {
  const s = symbol.toUpperCase();
  const next = getFavorites().filter((x) => x !== s);
  write(FAV_KEY, next);
}

export function toggleFavorite(symbol: string): boolean {
  if (isFavorite(symbol)) {
    removeFavorite(symbol);
    return false;
  }
  addFavorite(symbol);
  return true;
}

export function getRecent(): string[] {
  return read<string[]>(RECENT_KEY, []);
}

export function pushRecent(symbol: string) {
  const s = symbol.toUpperCase();
  const list = getRecent().filter((x) => x !== s);
  list.unshift(s);
  write(RECENT_KEY, list.slice(0, MAX_RECENT));
}

export function clearRecent() {
  write(RECENT_KEY, []);
}

export function onStorageChange(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("dse-storage-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("dse-storage-change", handler);
  };
}
