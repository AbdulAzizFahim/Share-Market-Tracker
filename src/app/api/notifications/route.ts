import { NextRequest, NextResponse } from "next/server";
import {
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/notifications — list all notifications
export async function GET() {
  try {
    const notifications = await getAllNotifications();
    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/notifications — mark read or clear
// body: { action: "markRead" | "markAllRead" | "clearAll", id?: string }
export async function POST(req: NextRequest) {
  try {
    const { action, id } = await req.json();
    if (action === "markRead" && id) {
      await markNotificationRead(id);
    } else if (action === "markAllRead") {
      await markAllNotificationsRead();
    } else if (action === "clearAll") {
      await clearAllNotifications();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const notifications = await getAllNotifications();
    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/notifications — delete a notification
// body: { id: string }
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await deleteNotification(id);
    const notifications = await getAllNotifications();
    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
