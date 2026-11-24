export function Panel({ title, aside, children }) {
  return (
    <section className="panel">
      {(title || aside) && (
        <div className="phead">
          <h2>{title}</h2>
          {aside ? <span className="aside">{aside}</span> : null}
        </div>
      )}
      <div className="pbody">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, unit, accent }) {
  return (
    <div className={`kpi${accent ? " accent" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit ? <span className="u">{unit}</span> : null}
      </div>
    </div>
  );
}

export function SeverityBadge({ severity }) {
  return <span className={`sev ${severity}`}>{severity}</span>;
}

export function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="conf">
      <div className="bar" title={`${pct}%`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="n">{pct}%</span>
    </div>
  );
}
