/**
 * Minimal Upstash Redis REST client — no SDK needed.
 * Uses the Upstash REST API directly via fetch.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCmd<T = unknown>(...args: (string | number)[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set");
  }
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result as T;
}

const ALERTS_KEY = "dse:alerts";
const FAVORITES_KEY = "dse:favorites";

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  createdAt: string;
  firedAt?: string;
}

export async function getAllAlerts(): Promise<PriceAlert[]> {
  try {
    const raw = await redisCmd<string | null>("GET", ALERTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PriceAlert[];
  } catch {
    return [];
  }
}

async function saveAlerts(alerts: PriceAlert[]) {
  await redisCmd("SET", ALERTS_KEY, JSON.stringify(alerts));
}

export async function setAlert(symbol: string, targetPrice: number): Promise<PriceAlert[]> {
  const s = symbol.toUpperCase();
  const alerts = await getAllAlerts();
  const filtered = alerts.filter((a) => a.symbol !== s);
  filtered.push({ symbol: s, targetPrice, createdAt: new Date().toISOString() });
  await saveAlerts(filtered);
  return filtered;
}

export async function removeAlert(symbol: string): Promise<PriceAlert[]> {
  const s = symbol.toUpperCase();
  const alerts = (await getAllAlerts()).filter((a) => a.symbol !== s);
  await saveAlerts(alerts);
  return alerts;
}

export async function markAlertFired(symbol: string): Promise<void> {
  const s = symbol.toUpperCase();
  const alerts = await getAllAlerts();
  const updated = alerts.map((a) =>
    a.symbol === s ? { ...a, firedAt: new Date().toISOString() } : a
  );
  await saveAlerts(updated);
}

// ---------- Notifications ----------

const NOTIFICATIONS_KEY = "dse:notifications";

export interface Notification {
  id: string;
  type: "alert_fired" | "system";
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  data?: Record<string, unknown>;
}

export async function getAllNotifications(): Promise<Notification[]> {
  try {
    const raw = await redisCmd<string | null>("GET", NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Notification[];
  } catch {
    return [];
  }
}

async function saveNotifications(notifs: Notification[]) {
  await redisCmd("SET", NOTIFICATIONS_KEY, JSON.stringify(notifs));
}

export async function createNotification(
  type: Notification["type"],
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<Notification[]> {
  const notifs = await getAllNotifications();
  const newNotif: Notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    data,
  };
  await saveNotifications([newNotif, ...notifs]);
  return [newNotif, ...notifs];
}

export async function markNotificationRead(id: string): Promise<void> {
  const notifs = await getAllNotifications();
  const updated = notifs.map((n) =>
    n.id === id ? { ...n, readAt: new Date().toISOString() } : n
  );
  await saveNotifications(updated);
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifs = await getAllNotifications();
  const updated = notifs.map((n) =>
    n.readAt ? n : { ...n, readAt: new Date().toISOString() }
  );
  await saveNotifications(updated);
}

export async function deleteNotification(id: string): Promise<void> {
  const notifs = (await getAllNotifications()).filter((n) => n.id !== id);
  await saveNotifications(notifs);
}

export async function clearAllNotifications(): Promise<void> {
  await redisCmd("DEL", NOTIFICATIONS_KEY);
}

// ---------- Favorites ----------

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await redisCmd<string | null>("GET", FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function saveFavorites(favorites: string[]) {
  await redisCmd("SET", FAVORITES_KEY, JSON.stringify(favorites));
}

export async function addFavorite(symbol: string): Promise<string[]> {
  const s = symbol.toUpperCase();
  const favs = await getFavorites();
  if (!favs.includes(s)) {
    favs.push(s);
    await saveFavorites(favs);
  }
  return favs;
}

export async function removeFavorite(symbol: string): Promise<string[]> {
  const s = symbol.toUpperCase();
  const favs = (await getFavorites()).filter((x) => x !== s);
  await saveFavorites(favs);
  return favs;
}

export async function toggleFavorite(symbol: string): Promise<{ isFavorite: boolean; favorites: string[] }> {
  const s = symbol.toUpperCase();
  const favs = await getFavorites();
  if (favs.includes(s)) {
    const updated = favs.filter((x) => x !== s);
    await saveFavorites(updated);
    return { isFavorite: false, favorites: updated };
  } else {
    const updated = [...favs, s];
    await saveFavorites(updated);
    return { isFavorite: true, favorites: updated };
  }
}
