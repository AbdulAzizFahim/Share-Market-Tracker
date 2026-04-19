import { NextResponse } from "next/server";
import { fetchStock } from "@/lib/dse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const stock = await fetchStock(params.symbol);
    if (!stock) {
      return NextResponse.json(
        { error: `Symbol '${params.symbol}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: stock });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch stock" },
      { status: 502 }
    );
  }
}
