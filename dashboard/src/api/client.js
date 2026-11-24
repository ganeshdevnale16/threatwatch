// REST client. In dev, Vite proxies /api and /ws to the backend on :8000.
// For a deployed dashboard, set VITE_API_BASE at build time.
const BASE = import.meta.env.VITE_API_BASE || "";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* not json */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.status === 204 ? null : res.json();
}

const post = (p, body) => req(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const del = (p) => req(p, { method: "DELETE" });

export const api = {
  health: () => req("/api/health"),
  stats: () => req("/api/stats"),
  assurance: () => req("/api/assurance"),

  alerts: (params = {}) => req(`/api/alerts?${new URLSearchParams(params)}`),
  alert: (id) => req(`/api/alerts/${encodeURIComponent(id)}`),
  feedback: (id, verdict, note) => post(`/api/alerts/${encodeURIComponent(id)}/feedback`, { verdict, note }),
  explain: (id) => post(`/api/alerts/${encodeURIComponent(id)}/explain`),

  integrations: () => req("/api/integrations"),
  integration: (id) => req(`/api/integrations/${encodeURIComponent(id)}`),
  createIntegration: (name, url) => post("/api/integrations", { name, url }),
  deleteIntegration: (id) => del(`/api/integrations/${encodeURIComponent(id)}`),

  models: () => req("/api/models"),
  addModel: (m) => post("/api/models", m),
  setDefaultModel: (id) => post(`/api/models/${encodeURIComponent(id)}/default`),
  testModel: (id) => post(`/api/models/${encodeURIComponent(id)}/test`),
  deleteModel: (id) => del(`/api/models/${encodeURIComponent(id)}`),
};

export function wsUrl() {
  if (BASE) return BASE.replace(/^http/, "ws") + "/ws";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}
