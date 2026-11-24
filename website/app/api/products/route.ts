import { NextResponse } from "next/server";
import { buildEvent, forward } from "@/lib/report";

export const runtime = "nodejs";

const PRODUCTS = [
  { id: "NB-1001", name: "Hex bolt, M8x40", price: 12.4 },
  { id: "NB-2050", name: "Cordless impact driver, 18V", price: 139.0 },
  { id: "NB-3300", name: "Safety goggles, anti-fog", price: 29.9 },
];

export async function GET(req: Request) {
  const start = Date.now();
  const res = NextResponse.json({ products: PRODUCTS });
  // Report this request with its real status + latency.
  forward(buildEvent(req, { status: 200, latency_ms: Date.now() - start }));
  return res;
}
