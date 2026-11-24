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
      {dets.map((d) => (
        <div className="trust" key={d.detector}>
          <div>
            <div className="name">{NAMES[d.detector] || d.detector}</div>
            <div className="meta">
              {d.status === "degraded" ? "degraded — verify its alerts manually" : "healthy"} ·{" "}
              {d.feedback?.labelled || 0} labelled, {Math.round((d.feedback?.fp_rate || 0) * 100)}% FP
            </div>
          </div>
          <div className={`score${d.trust_score < d.threshold ? " bad" : ""}`}>{d.trust_score}</div>
        </div>
      ))}
    </div>
  );
}
