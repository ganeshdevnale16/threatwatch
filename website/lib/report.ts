// Monitoring agent helper.
//
// Forwards a single request's metadata to the ThreatWatch detector. Fire-and-forget:
// it never blocks or breaks the site's own response, and silently no-ops if the
// integration env vars are not set. Only request metadata is sent — no bodies,
// no cookies, no response content.

export type ReqEvent = {
  ts: number;
  ip: string;
  method: string;
  path: string;
  query: string;
  status: number;
  ua: string;
  referer: string;
  country: string;
};

export function buildEvent(
  req: Request,
  extra: Partial<ReqEvent> = {},
): ReqEvent {
  const url = new URL(req.url);
  const h = req.headers;
  const ip =
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "0.0.0.0";
  return {
    ts: Date.now() / 1000,
    ip,
    method: req.method,
    path: url.pathname,
    query: url.search.replace(/^\?/, ""),
    status: 0,
    ua: h.get("user-agent") || "",
    referer: h.get("referer") || "",
    country: h.get("x-vercel-ip-country") || "",
    ...extra,
  };
}

export function forward(
  event: ReqEvent,
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  const base = process.env.TW_INGEST_URL;
  const key = process.env.TW_INGEST_KEY;
  if (!base || !key) return;
  const p = fetch(`${base.replace(/\/$/, "")}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-key": key },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {
    /* never surface monitoring errors to the visitor */
  });
  if (waitUntil) waitUntil(p);
}
