import { NextResponse } from "next/server";
import { buildEvent, forward } from "@/lib/report";

export const runtime = "nodejs";

// Demo auth endpoint. Credential-stuffing / brute-force tools hitting this with
// many 401s show up as a request flood (high error ratio) on the dashboard.
export async function POST(req: Request) {
  const start = Date.now();
  let ok = false;
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    ok = body.username === "demo" && body.password === "demo-password";
  } catch {
    ok = false;
  }
  const status = ok ? 200 : 401;
  const res = NextResponse.json(
    ok ? { token: "demo-session-token" } : { error: "invalid credentials" },
    { status },
  );
  forward(buildEvent(req, { status, latency_ms: Date.now() - start }));
  return res;
}
