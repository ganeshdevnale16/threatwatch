import { TrustRing } from "./ui";

const NAMES = {
  flood_detector: "Flood detector",
  scan_detector: "Scan detector",
  injection_detector: "Injection detector",
  beacon_detector: "Beacon detector",
};

export default function AssurancePanel({ assurance }) {
  const dets = Object.values(assurance || {});
  if (!dets.length) return <p className="empty">Model health appears once the detectors are running.</p>;
  return (
    <div>
      {dets.map((d) => {
        const bad = d.trust_score < d.threshold;
        return (
          <div className="trust" key={d.detector}>
            <TrustRing score={d.trust_score} bad={bad} />
            <div className="body">
              <div className="name">{NAMES[d.detector] || d.detector}</div>
              <div className="meta">
                {d.feedback?.labelled || 0} labelled · {Math.round((d.feedback?.fp_rate || 0) * 100)}% false-positive
                {" · "}{d.alerts_recent || 0} recent
              </div>
            </div>
            <span className={`state ${bad ? "bad" : "ok"}`}>{bad ? "Degraded" : "Healthy"}</span>
          </div>
        );
      })}
    </div>
  );
}
