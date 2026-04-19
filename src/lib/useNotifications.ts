"use client";

import { useState, useEffect } from "react";
import type { Notification } from "@/lib/redis";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", id }),
    });
    fetchNotifications();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    fetchNotifications();
  }

  async function deleteNotif(id: string) {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchNotifications();
  }

  async function clearAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearAll" }),
    });
    fetchNotifications();
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return {
    notifications,
    loading,
    open,
    setOpen,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotif,
    clearAll,
    refresh: fetchNotifications,
  };
}
