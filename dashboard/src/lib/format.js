export const CLASS_LABEL = {
  ddos_flood: "DDoS / flood",
  path_scanning: "Path scanning",
  injection_probe: "Injection probe",
  scraper_beacon: "Scraper beacon",
};

export const CLASS_LIST = ["ddos_flood", "path_scanning", "injection_probe", "scraper_beacon"];

export function timeOf(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export function dateTimeOf(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function humanise(s) {
  return (s || "").replace(/[-_]/g, " ");
}

export function agoFromEpoch(sec) {
  if (!sec) return "never";
  const d = Date.now() / 1000 - sec;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
