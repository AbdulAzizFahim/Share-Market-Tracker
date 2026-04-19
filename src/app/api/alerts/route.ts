import { NextRequest, NextResponse } from "next/server";
import { getAllAlerts, setAlert, removeAlert } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/alerts — list all alerts
export async function GET() {
  try {
    const alerts = await getAllAlerts();
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/alerts — create or update an alert
// body: { symbol: string, targetPrice: number }
export async function POST(req: NextRequest) {
  try {
    const { symbol, targetPrice } = await req.json();
    if (!symbol || typeof targetPrice !== "number" || targetPrice <= 0) {
      return NextResponse.json({ error: "Invalid symbol or targetPrice" }, { status: 400 });
    }
    const alerts = await setAlert(symbol, targetPrice);
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/alerts — remove an alert
// body: { symbol: string }
export async function DELETE(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const alerts = await removeAlert(symbol);
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
