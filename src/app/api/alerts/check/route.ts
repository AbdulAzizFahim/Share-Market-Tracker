import { NextRequest, NextResponse } from "next/server";
import { fetchAllStocks } from "@/lib/dse";
import { getAllAlerts, markAlertFired, createNotification } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function sendAlertEmail(
  symbol: string,
  targetPrice: number,
  currentPrice: number
) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ALERT_EMAIL;

  if (!apiKey || !toEmail) {
    console.warn("[alerts] RESEND_API_KEY or ALERT_EMAIL not set — skipping email");
    return;
  }

  const body = {
    from: "DSE Watch <onboarding@resend.dev>",
    to: [toEmail],
    subject: `Price Alert: ${symbol} hit ৳${currentPrice.toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#ef4444">🔔 Price Alert Triggered</h2>
        <p><strong>${symbol}</strong> is now trading at <strong>৳${currentPrice.toFixed(2)}</strong>, which is at or below your target of <strong>৳${targetPrice.toFixed(2)}</strong>.</p>
        <p style="color:#6b7280;font-size:13px">Triggered at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })} (BD time)</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p style="font-size:12px;color:#9ca3af">Sent by your DSE Watch app. This alert will not fire again unless you reset it.</p>
      </div>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  console.log(`[alerts] Email sent for ${symbol} @ ${currentPrice}`);
}

export async function POST(req: NextRequest) {
  try {
    const alerts = await getAllAlerts();

    if (!alerts.length) {
      return NextResponse.json({ fired: [] });
    }

    // Only check alerts that haven't fired yet
    const pending = alerts.filter((a) => !a.firedAt);
    if (!pending.length) {
      return NextResponse.json({ fired: [] });
    }

    const stocks = await fetchAllStocks();
    const priceMap = new Map(stocks.map((s) => [s.symbol, s.ltp]));

    const fired: string[] = [];

    await Promise.all(
      pending.map(async (alert) => {
        const ltp = priceMap.get(alert.symbol);
        if (ltp == null) return;
        if (ltp <= alert.targetPrice) {
          try {
            await sendAlertEmail(alert.symbol, alert.targetPrice, ltp);
            await markAlertFired(alert.symbol);
            await createNotification(
              "alert_fired",
              `${alert.symbol} hit target price`,
              `${alert.symbol} is now trading at ৳${ltp.toFixed(2)}, at or below your target of ৳${alert.targetPrice.toFixed(2)}.`,
              { symbol: alert.symbol, targetPrice: alert.targetPrice, currentPrice: ltp }
            );
            fired.push(alert.symbol);
          } catch (e: any) {
            console.error(`[alerts] Failed to send email for ${alert.symbol}: ${e.message}`);
          }
        }
      })
    );

    return NextResponse.json({ fired });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Alert check failed" },
      { status: 500 }
    );
  }
}
