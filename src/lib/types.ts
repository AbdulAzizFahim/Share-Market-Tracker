export interface Stock {
  symbol: string;
  ltp: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  ycp: number | null;
  change: number | null;
  changePercent: number | null;
  trade: number | null;
  value: number | null;
  volume: number | null;
  updatedAt: string;
}

export interface StockSummary {
  symbol: string;
  ltp: number | null;
  change: number | null;
  changePercent: number | null;
}
