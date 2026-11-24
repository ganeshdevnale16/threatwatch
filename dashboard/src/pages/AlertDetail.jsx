import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Panel, SeverityBadge } from "../components/ui";
import { CLASS_LABEL, dateTimeOf, humanise } from "../lib/format";

export default function AlertDetail() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [err, setErr] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explainNote, setExplainNote] = useState(null);
  const [savingFb, setSavingFb] = useState(false);

  const load = () => api.alert(id).then(setA).catch((e) => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (err) return <p className="banner">Could not load alert: {err}</p>;
  if (!a) return <p className="empty">Loading…</p>;

  const ev = a.evidence || {};
  const tr = a.trace || {};

  const explain = async () => {
    setExplaining(true);
    setExplainNote(null);
    try {
      const res = await api.explain(id);
      setExplainNote(res.note || `via ${res.source}`);
      await load();
    } catch (e) {
      setExplainNote(`failed: ${e.message}`);
    } finally {
      setExplaining(false);
    }
  };

  const feedback = async (verdict) => {
    setSavingFb(true);
    try {
      await api.feedback(id, verdict, null);
      await load();
    } finally {
      setSavingFb(false);
    }
  };

  return (
    <div>
      <div className="pagehead">
        <h1>{CLASS_LABEL[a.threat_class] || a.threat_class}</h1>
        <span className="sub"><Link to="/alerts">← all alerts</Link></span>
      </div>

      <div className="row two">
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Summary">
            <dl className="kv">
              <dt>Severity</dt><dd><SeverityBadge severity={a.severity} /></dd>
              <dt>Confidence</dt><dd>{Math.round(a.confidence * 100)}%</dd>
              <dt>Subtype</dt><dd>{humanise(a.attack_subtype) || "—"}</dd>
              <dt>Source</dt><dd className="mono">{a.entity}</dd>
              <dt>Site</dt><dd>{a.site_name || a.site_id}</dd>
              <dt>Detector</dt><dd>{a.detector}</dd>
              <dt>When</dt><dd>{dateTimeOf(a.timestamp)}</dd>
              <dt>MITRE ATT&CK</dt><dd>{a.mitre_attack}</dd>
            </dl>
          </Panel>

          <Panel title="Evidence">
            {(ev.signals || []).map((s, i) => <div className="sig" key={i}>{s}</div>)}
            <dl className="kv" style={{ marginTop: 10 }}>
              {Object.entries(ev.features || {}).map(([k, v]) => (
                <div style={{ display: "contents" }} key={k}>
                  <dt>{humanise(k)}</dt>
                  <dd className="mono">{String(v)}</dd>
                </div>
              ))}
            </dl>
            {(ev.samples || []).length > 0 && (
              <>
                <div className="note" style={{ marginTop: 10 }}>Sample requests</div>
                <div className="code">{ev.samples.join("\n")}</div>
              </>
            )}
          </Panel>

          <Panel title="Decision trace">
            <dl className="kv">
              <dt>Config fingerprint</dt><dd className="mono">{tr.config_hash}</dd>
              <dt>Window</dt><dd className="mono">{tr.window_start} → {tr.window_end}</dd>
              <dt>Raw score</dt><dd className="mono">{tr.raw_score}</dd>
              <dt>Detector trust</dt><dd className="mono" style={{ color: tr.detector_trust_score < 70 ? "var(--trust-bad)" : undefined }}>{tr.detector_trust_score ?? "—"}</dd>
            </dl>
          </Panel>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Recommended action">
            <p style={{ margin: 0, fontSize: 14 }}>{a.recommended_action}</p>
            <p className="note">This system only informs. A human analyst decides any action.</p>
          </Panel>

          <Panel title="AI explanation">
            {a.ai_explanation ? (
              <div className="explain">{a.ai_explanation}</div>
            ) : (
              <p className="empty" style={{ padding: "16px 0" }}>No explanation generated yet.</p>
            )}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={explain} disabled={explaining}>
              {explaining ? "Generating…" : a.ai_explanation ? "Regenerate" : "Explain this alert"}
            </button>
            {explainNote && <p className="note">{explainNote}</p>}
          </Panel>

          <Panel title="Analyst feedback">
            <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--muted)" }}>
              {a.feedback ? `Marked ${humanise(a.feedback.verdict)}.` : "Was this a real threat?"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" onClick={() => feedback("true_positive")} disabled={savingFb}>Confirm threat</button>
              <button className="btn sm ghost" onClick={() => feedback("false_positive")} disabled={savingFb}>False positive</button>
            </div>
            <p className="note">Feedback feeds the detector's trust score on the assurance panel.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
