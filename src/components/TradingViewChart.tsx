"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HistoryPoint } from "@/app/api/stock/[symbol]/history/route";

const TIMEFRAMES = [
  { label: "1D", tf: "1D" },
  { label: "7D", tf: "7D" },
  { label: "1M", tf: "1M" },
  { label: "3M", tf: "3M" },
  { label: "6M", tf: "6M" },
  { label: "1Y", tf: "1Y" },
  { label: "3Y", tf: "3Y" },
  { label: "5Y", tf: "5Y" },
  { label: "All", tf: "ALL" },
];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TradingViewChart({ symbol }: { symbol: string }) {
  const [tf, setTf] = useState("1Y");
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sym: string, timeframe: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/${sym}/history?tf=${timeframe}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load chart");
      setData(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error loading chart data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(symbol, tf);
  }, [symbol, tf, load]);

  const first = data[0]?.close ?? null;
  const last = data[data.length - 1]?.close ?? null;
  const isUp = first != null && last != null && last >= first;
  const color = isUp ? "#22c55e" : "#ef4444";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d: HistoryPoint = payload[0].payload;
    return (
      <div className="bg-bg-soft border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-gray-400 mb-1">{d.date}</p>
        <p className="text-white font-semibold">Close: {fmt(d.close)}</p>
        {d.open != null && <p className="text-gray-300">Open: {fmt(d.open)}</p>}
        {d.high != null && (
          <p className="text-green-400">High: {fmt(d.high)}</p>
        )}
        {d.low != null && <p className="text-red-400">Low: {fmt(d.low)}</p>}
        {d.volume != null && (
          <p className="text-gray-400">Vol: {d.volume.toLocaleString()}</p>
        )}
      </div>
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Timeframe buttons */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.tf}
            type="button"
            onClick={() => setTf(t.tf)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition border ${
              tf === t.tf
                ? "bg-accent text-black border-accent"
                : "bg-bg-soft text-gray-300 border-border hover:bg-border/60"
            }`}
          >
            {t.label}
          </button>
        ))}
        {last != null && first != null && (
          <span
            className={`ml-auto text-xs font-medium ${isUp ? "text-green-400" : "text-red-400"}`}
          >
            {isUp ? "▲" : "▼"} {fmt(last)} BDT
          </span>
        )}
      </div>

      {/* Chart area */}
      <div className="relative w-full" style={{ minHeight: 380 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/60 z-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-6">
            <p className="text-gray-400 text-sm font-medium">
              No chart data yet
            </p>
            <p className="text-gray-500 text-xs max-w-sm">
              Run the fetch script to download historical data for this symbol:
            </p>
            <code className="bg-bg text-accent text-xs px-3 py-1.5 rounded border border-border select-all">
              python scripts/fetch_history.py {symbol}
            </code>
            <p className="text-gray-600 text-xs">
              Or fetch all symbols at once:{" "}
              <span className="text-gray-500">
                python scripts/fetch_history.py
              </span>
            </p>
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            No data available
          </div>
        )}
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => v.toLocaleString()}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <a
          href={`https://finance.yahoo.com/quote/${symbol}.BD`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-500 hover:text-accent transition"
        >
          Yahoo Finance ↗
        </a>
        <a
          href={`https://dsebd.org/displayCompany.php?name=${symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-500 hover:text-accent transition"
        >
          DSE Company Page ↗
        </a>
      </div>
    </div>
  );
}
