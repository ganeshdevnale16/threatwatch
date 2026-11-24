// ThreatWatch monitoring agent (Vercel Edge Middleware).
//
// Runs on every request except API routes (those report their own true status)
// and static assets. It mirrors the request metadata to the detector using
// event.waitUntil, so forwarding completes after the response is sent and never
// adds latency for the visitor.

import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { buildEvent, forward } from "./lib/report";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest, event: NextFetchEvent) {
  try {
    forward(buildEvent(req), (p) => event.waitUntil(p));
  } catch {
    /* monitoring must never break the site */
  }
  return NextResponse.next();
}
