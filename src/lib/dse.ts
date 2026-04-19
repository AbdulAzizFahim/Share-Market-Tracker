import * as cheerio from "cheerio";
import type { Stock } from "./types";

const HTTP_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.google.com/",
  "Upgrade-Insecure-Requests": "1",
  "sec-ch-ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
};

function parseNum(text: string | undefined | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[,\s]/g, "").replace(/[^\d.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface CachedData {
  data: Stock[];
  fetchedAt: number;
}

let cache: CachedData | null = null;
const CACHE_TTL_MS = 30 * 1000;

// ---------- Source: DSE (dsebd.org) ----------

async function fetchFromDSE(url: string): Promise<Stock[]> {
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: HTTP_HEADERS,
    cache: "no-store",
    redirect: "follow",
  });
  const html = await res.text();
  const elapsed = Date.now() - t0;
  console.log(
    `[dse] ${url} -> status=${res.status} ct=${
      res.headers.get("content-type") ?? "?"
    } bytes=${html.length} in ${elapsed}ms`
  );
  if (!res.ok) {
    throw new Error(`DSE ${url} HTTP ${res.status}`);
  }
  if (html.length < 500) {
    console.log("[dse] body snippet:", html.slice(0, 500));
    throw new Error(`DSE ${url} returned tiny body (${html.length} bytes)`);
  }

  const $ = cheerio.load(html);

  // Find the table with the most rows; that's the price table
  let bestTable: ReturnType<typeof $> | null = null;
  let bestCount = 0;
  $("table").each((_i: number, el: any) => {
    const rows = $(el).find("tr").length;
    if (rows > bestCount) {
      bestCount = rows;
      bestTable = $(el);
    }
  });

  console.log(`[dse] largest table has ${bestCount} rows`);
  if (!bestTable || bestCount < 5) {
    console.log("[dse] body snippet:", html.slice(0, 500));
    throw new Error(`DSE ${url} no price table found`);
  }

  const stocks: Stock[] = [];
  const now = new Date().toISOString();

  // Check if the table uses multi-column layout (multiple <td> per row)
  const firstDataRow = (bestTable as ReturnType<typeof $>).find("tr").eq(1);
  const firstRowCellCount = firstDataRow.find("td").length;
  console.log(`[dse] first data row has ${firstRowCellCount} cells`);

  if (firstRowCellCount >= 3) {
    // ---- MULTI-COLUMN TABLE (traditional layout) ----
    const headers: string[] = [];
    (bestTable as ReturnType<typeof $>)
      .find("tr")
      .first()
      .find("th,td")
      .each((_i: number, th: any) => {
        headers.push($(th).text().trim().toUpperCase());
      });

    const idxOf = (patterns: RegExp[]): number => {
      for (let i = 0; i < headers.length; i++) {
        if (patterns.some((p) => p.test(headers[i]))) return i;
      }
      return -1;
    };

    const colSymbol = idxOf([/TRADING.*CODE/, /^CODE$/, /SYMBOL/]);
    const colLtp = idxOf([/LTP/, /LAST/]);
    const colHigh = idxOf([/^HIGH/]);
    const colLow = idxOf([/^LOW/]);
    const colClose = idxOf([/CLOSEP/, /^CLOSE/]);
    const colYcp = idxOf([/YCP/]);
    const colChange = idxOf([/CHANGE/]);
    const colTrade = idxOf([/TRADE$/, /^TRADE/]);
    const colValue = idxOf([/VALUE/]);
    const colVolume = idxOf([/VOLUME/]);

    if (colSymbol < 0) {
      console.log("[dse] headers:", headers);
      throw new Error(`DSE ${url} could not find symbol column`);
    }

    (bestTable as ReturnType<typeof $>).find("tr").each((i: number, tr: any) => {
      if (i === 0) return;
      const cells = $(tr).find("td");
      if (cells.length < 3) return;

      const symbol = $(cells[colSymbol]).text().trim().toUpperCase();
      if (!symbol || /^\d+$/.test(symbol)) return;

      const ltp = colLtp >= 0 ? parseNum($(cells[colLtp]).text()) : null;
      const change =
        colChange >= 0 ? parseNum($(cells[colChange]).text()) : null;
      const ycp = colYcp >= 0 ? parseNum($(cells[colYcp]).text()) : null;

      let changePercent: number | null = null;
      if (change !== null && ycp && ycp !== 0) {
        changePercent = (change / ycp) * 100;
      }

      stocks.push({
        symbol,
        ltp,
        open: null,
        high: colHigh >= 0 ? parseNum($(cells[colHigh]).text()) : null,
        low: colLow >= 0 ? parseNum($(cells[colLow]).text()) : null,
        close: colClose >= 0 ? parseNum($(cells[colClose]).text()) : null,
        ycp,
        change,
        changePercent,
        trade: colTrade >= 0 ? parseNum($(cells[colTrade]).text()) : null,
        value: colValue >= 0 ? parseNum($(cells[colValue]).text()) : null,
        volume: colVolume >= 0 ? parseNum($(cells[colVolume]).text()) : null,
        updatedAt: now,
      });
    });
  } else {
    // ---- SINGLE-CELL ROWS (scroll page format) ----
    // Each row has 1 <td> with text like: "SYMBOL 123.45 ... -0.50 -1.23%"
    // Pattern: SYMBOL(s) PRICE [whitespace/tabs] CHANGE CHANGE%
    const rowRegex =
      /^([A-Z0-9][A-Z0-9._-]*)\s+([\d,.]+)\s+.*?([-+]?[\d,.]+)\s+([-+]?[\d,.]+)%\s*$/;
    // Simpler fallback: just symbol + price (some rows may not have change)
    const simpleRegex = /^([A-Z0-9][A-Z0-9._-]*)\s+([\d,.]+)/;

    const seen = new Set<string>();
    (bestTable as ReturnType<typeof $>).find("tr").each((_i: number, tr: any) => {
      const cells = $(tr).find("td");
      if (cells.length === 0) return;
      // Take the text of the first (only) cell
      const raw = $(cells[0]).text().replace(/[\t\n\r]+/g, " ").trim();
      if (!raw) return;

      const m = raw.match(rowRegex);
      if (m) {
        const symbol = m[1].toUpperCase();
        if (seen.has(symbol)) return;
        seen.add(symbol);
        const ltp = parseNum(m[2]);
        const change = parseNum(m[3]);
        const changePercent = parseNum(m[4]);
        stocks.push({
          symbol,
          ltp,
          open: null,
          high: null,
          low: null,
          close: null,
          ycp: null,
          change,
          changePercent,
          trade: null,
          value: null,
          volume: null,
          updatedAt: now,
        });
      } else {
        // Fallback: at least get symbol + price
        const sm = raw.match(simpleRegex);
        if (sm) {
          const symbol = sm[1].toUpperCase();
          if (seen.has(symbol)) return;
          seen.add(symbol);
          stocks.push({
            symbol,
            ltp: parseNum(sm[2]),
            open: null,
            high: null,
            low: null,
            close: null,
            ycp: null,
            change: null,
            changePercent: null,
            trade: null,
            value: null,
            volume: null,
            updatedAt: now,
          });
        }
      }
    });
  }

  console.log(`[dse] parsed ${stocks.length} stocks from ${url}`);
  return stocks;
}

// ---------- Source: AmarStock (amarstock.com) ----------

async function fetchFromAmarStock(): Promise<Stock[]> {
  const url = "https://www.amarstock.com/";
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: HTTP_HEADERS,
    cache: "no-store",
    redirect: "follow",
  });
  const html = await res.text();
  const elapsed = Date.now() - t0;
  console.log(
    `[amarstock] ${url} -> status=${res.status} bytes=${html.length} in ${elapsed}ms`
  );
  if (!res.ok) throw new Error(`AmarStock HTTP ${res.status}`);

  const $ = cheerio.load(html);
  const stocks: Stock[] = [];
  const now = new Date().toISOString();

  // AmarStock embeds its stock list as anchors to /stock/SYMBOL.
  // Grab every such anchor plus the adjacent price/change text.
  const seen = new Set<string>();
  $("a[href*='/stock/']").each((_i: number, el: any) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/stock\/([A-Za-z0-9._-]+)/);
    if (!m) return;
    const symbol = m[1].toUpperCase();
    if (seen.has(symbol)) return;
    if (!/^[A-Z0-9._-]{1,15}$/.test(symbol)) return;
    seen.add(symbol);

    // Try to pull price + change from the row containing this link
    const row = $(el).closest("tr,li,div");
    const rowText = row.text();
    // Look for a number like 123.45 and a signed number like +1.23 or -0.45
    const nums = rowText.match(/-?\d+\.\d+/g) ?? [];
    const ltp = nums[0] ? parseNum(nums[0]) : null;
    const change =
      nums[1] && /[+-]/.test(rowText) ? parseNum(nums[1]) : null;

    stocks.push({
      symbol,
      ltp,
      open: null,
      high: null,
      low: null,
      close: null,
      ycp: null,
      change,
      changePercent: null,
      trade: null,
      value: null,
      volume: null,
      updatedAt: now,
    });
  });

  console.log(`[amarstock] parsed ${stocks.length} stocks`);
  return stocks;
}

// ---------- Company listing (symbol universe) ----------

let companyListCache: { symbols: string[]; fetchedAt: number } | null = null;
const COMPANY_LIST_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchCompanyListing(): Promise<string[]> {
  if (
    companyListCache &&
    Date.now() - companyListCache.fetchedAt < COMPANY_LIST_TTL_MS
  ) {
    return companyListCache.symbols;
  }
  const url = "https://www.dsebd.org/company_listingg.php";
  try {
    const t0 = Date.now();
    const res = await fetch(url, {
      headers: HTTP_HEADERS,
      cache: "no-store",
    });
    const html = await res.text();
    console.log(
      `[dse-listing] ${url} -> status=${res.status} bytes=${
        html.length
      } in ${Date.now() - t0}ms`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const $ = cheerio.load(html);
    const symbols = new Set<string>();
    $("a[href*='displayCompany.php']").each((_i: number, el: any) => {
      const href = $(el).attr("href") ?? "";
      const match = href.match(/name=([A-Za-z0-9._-]+)/);
      if (match) symbols.add(match[1].toUpperCase());
      const text = $(el).text().trim().toUpperCase();
      if (text && /^[A-Z0-9._-]{1,15}$/.test(text)) symbols.add(text);
    });

    const list = Array.from(symbols).sort();
    console.log(`[dse-listing] parsed ${list.length} symbols`);
    companyListCache = { symbols: list, fetchedAt: Date.now() };
    return list;
  } catch (e: any) {
    console.error(`[dse-listing] failed: ${e?.message ?? e}`);
    return companyListCache?.symbols ?? [];
  }
}

// ---------- Orchestrator ----------

/** Each source is tried in order; first non-empty result wins. */
const SOURCES: Array<{ name: string; run: () => Promise<Stock[]> }> = [
  {
    name: "dsebd-scroll",
    run: () =>
      fetchFromDSE("https://www.dsebd.org/latest_share_price_scroll_l.php"),
  },
  {
    name: "dsebd-all",
    run: () =>
      fetchFromDSE("https://www.dsebd.org/latest_share_price_all.php"),
  },
  {
    name: "dsebd-by-value",
    run: () =>
      fetchFromDSE(
        "https://www.dsebd.org/latest_share_price_scroll_by_value.php"
      ),
  },
  { name: "amarstock", run: fetchFromAmarStock },
];

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

  const errors: string[] = [];
  let stocks: Stock[] = [];
  let sourceUsed = "";

  for (const src of SOURCES) {
    try {
      const result = await src.run();
      if (result.length > 0) {
        stocks = result;
        sourceUsed = src.name;
        break;
      } else {
        errors.push(`${src.name}: 0 rows`);
      }
    } catch (e: any) {
      errors.push(`${src.name}: ${e?.message ?? e}`);
    }
  }

  // Also attempt the company listing (for symbol completeness).
  const extraSymbols = await fetchCompanyListing();

  if (stocks.length === 0 && extraSymbols.length === 0) {
    const detail = errors.join(" | ");
    console.error(`[stocks] ALL SOURCES FAILED. ${detail}`);
    throw new Error(
      `Could not fetch Bangladesh stock data from any source. ` +
        `Attempts: ${detail}`
    );
  }

  // Deduplicate by symbol
  const seen = new Set<string>();
  const unique = stocks.filter((s) => {
    if (seen.has(s.symbol)) return false;
    seen.add(s.symbol);
    return true;
  });

  const now = new Date().toISOString();
  for (const sym of extraSymbols) {
    if (!seen.has(sym)) {
      seen.add(sym);
      unique.push({
        symbol: sym,
        ltp: null,
        open: null,
        high: null,
        low: null,
        close: null,
        ycp: null,
        change: null,
        changePercent: null,
        trade: null,
        value: null,
        volume: null,
        updatedAt: now,
      });
    }
  }

  unique.sort((a, b) => a.symbol.localeCompare(b.symbol));

  console.log(
    `[stocks] success: ${unique.length} total symbols (source=${
      sourceUsed || "none"
    }, listing=${extraSymbols.length})`
  );

  cache = { data: unique, fetchedAt: Date.now() };
  return unique;
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
