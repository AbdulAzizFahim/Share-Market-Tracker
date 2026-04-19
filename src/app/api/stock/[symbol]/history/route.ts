import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export interface HistoryPoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

const TF_DAYS: Record<string, number> = {
  "1D": 1,
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
  ALL: Infinity,
};

function filterByTf(data: HistoryPoint[], tf: string): HistoryPoint[] {
  const days = TF_DAYS[tf] ?? TF_DAYS["1Y"];
  if (!isFinite(days)) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.date >= cutoffStr);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const tf = req.nextUrl.searchParams.get("tf") ?? "1Y";

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "history",
    `${symbol}.json`
  );

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      {
        error: `No historical data for ${symbol}. Run the fetch script: python scripts/fetch_history.py ${symbol}`,
        notFetched: true,
      },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);

    const allData: HistoryPoint[] = (json.data ?? []).map((row: any) => ({
      date: row.date,
      open: row.open ?? null,
      high: row.high ?? null,
      low: row.low ?? null,
      close: row.close ?? row.ltp ?? null,
      volume: row.volume ?? null,
    }));

    const filtered = filterByTf(allData, tf);

    return NextResponse.json({
      symbol,
      tf,
      updatedAt: json.updatedAt ?? null,
      data: filtered,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to read history file" },
      { status: 500 }
    );
  }
}
