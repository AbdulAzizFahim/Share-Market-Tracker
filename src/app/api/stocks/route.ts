import { NextRequest, NextResponse } from "next/server";
import { fetchAllStocks, searchStocks } from "@/lib/dse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const symbolsParam = searchParams.get("symbols");
    const all = await fetchAllStocks();

    if (symbolsParam) {
      const wanted = new Set(
        symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      );
      const filtered = all.filter((s) => wanted.has(s.symbol));
      return NextResponse.json({ count: filtered.length, data: filtered });
    }

    const result = q ? searchStocks(all, q) : all;
    return NextResponse.json({ count: result.length, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch stocks" },
      { status: 502 }
    );
  }
}
