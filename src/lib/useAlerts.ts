"use client";

import { useState, useEffect } from "react";

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  createdAt: string;
  firedAt?: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const json = await res.json();
      setAlerts(json.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function setAlert(symbol: string, targetPrice: number) {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, targetPrice }),
    });
    const json = await res.json();
    setAlerts(json.alerts ?? []);
  }

  async function removeAlert(symbol: string) {
    const res = await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    const json = await res.json();
    setAlerts(json.alerts ?? []);
  }

  function getAlert(symbol: string): PriceAlert | undefined {
    return alerts.find((a) => a.symbol === symbol.toUpperCase());
  }

  return { alerts, loading, setAlert, removeAlert, getAlert, refresh: fetchAlerts };
}
