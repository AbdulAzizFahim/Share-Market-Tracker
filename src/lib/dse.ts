import type { Stock } from "./types";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface CachedData {
  data: Stock[];
  fetchedAt: number;
}

let cache: CachedData | null = null;
const CACHE_TTL_MS = 30 * 1000;

interface HistoryData {
  symbol: string;
  updatedAt: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    ltp: number;
    volume: number;
    trade: number;
    value: number;
  }>;
}

async function fetchFromLocalFiles(): Promise<Stock[]> {
  const historyDir = join(process.cwd(), "public", "data", "history");
  const stocks: Stock[] = [];
  const now = new Date().toISOString();

  try {
    const files = readdirSync(historyDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    console.log(`[local] reading ${jsonFiles.length} JSON files from ${historyDir}`);

    for (const file of jsonFiles) {
      try {
        const filePath = join(historyDir, file);
        const content = readFileSync(filePath, "utf-8");
        const history: HistoryData = JSON.parse(content);

        // Get the most recent data point (last entry in data array)
        const latest = history.data[history.data.length - 1];
        if (!latest) continue;

        // Calculate change and change percent from previous day
        const previous = history.data[history.data.length - 2];
        let change: number | null = null;
        let changePercent: number | null = null;

        if (previous) {
          change = latest.close - previous.close;
          if (previous.close !== 0) {
            changePercent = (change / previous.close) * 100;
          }
        }

        stocks.push({
          symbol: history.symbol,
          ltp: latest.ltp,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
          ycp: previous?.close ?? null,
          change,
          changePercent,
          trade: latest.trade,
          value: latest.value,
          volume: latest.volume,
          updatedAt: history.updatedAt ? `${history.updatedAt}T00:00:00Z` : now,
        });
      } catch (e: any) {
        console.error(`[local] failed to parse ${file}: ${e?.message ?? e}`);
      }
    }

    console.log(`[local] parsed ${stocks.length} stocks from local files`);
    return stocks;
  } catch (e: any) {
    console.error(`[local] failed to read history directory: ${e?.message ?? e}`);
    throw new Error(`Failed to read local stock data: ${e?.message ?? e}`);
  }
}

export async function fetchAllStocks(
  forceRefresh = false
): Promise<Stock[]> {
  if (
    !forceRefresh &&
    cache &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache.data;
  }

  const stocks = await fetchFromLocalFiles();

  // Sort by symbol
  stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));

  console.log(`[stocks] success: ${stocks.length} total symbols (source=local)`);

  cache = { data: stocks, fetchedAt: Date.now() };
  return stocks;
}

export async function fetchStock(symbol: string): Promise<Stock | null> {
  const all = await fetchAllStocks();
  const needle = symbol.trim().toUpperCase();
  return all.find((s) => s.symbol === needle) ?? null;
}

export function searchStocks(list: Stock[], query: string): Stock[] {
  const q = query.trim().toUpperCase();
  if (!q) return list;
  return list.filter((s) => s.symbol.includes(q));
}
