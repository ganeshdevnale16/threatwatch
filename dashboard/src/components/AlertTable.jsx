import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CLASS_LABEL, CLASS_LIST, humanise, timeOf } from "../lib/format";
import { IconAlert, IconBolt, IconBug, IconRadar, IconScan } from "./icons";
import { ConfidenceBar, SeverityBadge } from "./ui";

const ICON = {
  ddos_flood: IconBolt,
  path_scanning: IconScan,
  injection_probe: IconBug,
  scraper_beacon: IconRadar,
};

export default function AlertTable({ alerts, showFilter = true, limit = 150 }) {
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => {
    const base = filter === "all" ? alerts : alerts.filter((a) => a.threat_class === filter);
    return base.slice(0, limit);
  }, [alerts, filter, limit]);

  return (
    <div>
      {showFilter && (
        <div className="chips">
          {["all", ...CLASS_LIST].map((f) => (
            <button key={f} className={`chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All threats" : CLASS_LABEL[f]}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="empty">
          <IconAlert width={28} height={28} className="big" />
          No alerts yet. Run the attack simulator against your site and they appear here in real time.
        </p>
      ) : (
        <div className="scroll">
          <table className="tw">
            <thead>
              <tr>
                <th>Time</th>
                <th>Severity</th>
                <th>Threat</th>
                <th>Source</th>
                <th>Site</th>
                <th>Confidence</th>
                <th>Trust</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const I = ICON[a.threat_class] || IconAlert;
                return (
                  <tr key={a.alert_id}>
                    <td className="mono" style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{timeOf(a.timestamp)}</td>
                    <td><SeverityBadge severity={a.severity} /></td>
                    <td>
                      <div className="threatcell">
                        <span className={`ti ${a.threat_class}`}><I width={15} height={15} /></span>
                        <span>
                          <Link to={`/alerts/${a.alert_id}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                            {CLASS_LABEL[a.threat_class] || a.threat_class}
                          </Link>
                          {a.attack_subtype ? <span style={{ color: "var(--faint)", fontSize: 11.5, marginLeft: 6 }}>{humanise(a.attack_subtype)}</span> : null}
                          {a.feedback ? (
                            <span className="pill gray" style={{ marginLeft: 6 }}>
                              {a.feedback.verdict === "false_positive" ? "false positive" : "confirmed"}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="mono truncate" title={a.entity}>{a.entity}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }} className="truncate">{a.site_name || a.site_id}</td>
                    <td style={{ minWidth: 120 }}><ConfidenceBar value={a.confidence} /></td>
                    <td className="mono" style={{ color: a.trace?.detector_trust_score < 70 ? "var(--trust-bad)" : "var(--muted)" }}>
                      {a.trace?.detector_trust_score ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
