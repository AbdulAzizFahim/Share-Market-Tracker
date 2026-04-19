import { NextRequest, NextResponse } from "next/server";
import { getFavorites, addFavorite, removeFavorite } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/favorites — list all favorites
export async function GET() {
  try {
    const favorites = await getFavorites();
    return NextResponse.json({ favorites });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/favorites — add a favorite
// body: { symbol: string }
export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const favorites = await addFavorite(symbol);
    return NextResponse.json({ favorites });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/favorites — remove a favorite
// body: { symbol: string }
export async function DELETE(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const favorites = await removeFavorite(symbol);
    return NextResponse.json({ favorites });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
