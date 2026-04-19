import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { StockPrefetcher } from "@/components/StockPrefetcher";

export const metadata: Metadata = {
  title: "DSE Watch — Bangladesh Stock Tracker",
  description:
    "Personal tracker for Dhaka Stock Exchange (DSE) share prices and charts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-gray-200 font-sans antialiased">
        <StockPrefetcher />
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
          Data scraped live from{" "}
          <a
            href="https://www.dsebd.org"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-300"
          >
            dsebd.org
          </a>
          . Charts by TradingView. Personal use only, no warranty.
        </footer>
      </body>
    </html>
  );
}
