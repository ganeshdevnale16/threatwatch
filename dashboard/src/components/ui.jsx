export function Panel({ title, aside, icon: Icon, children, bodyClass }) {
  return (
    <section className="panel">
      {(title || aside) && (
        <div className="phead">
          <span className="pt">
            {Icon ? <Icon width={16} height={16} /> : null}
            <h2>{title}</h2>
          </span>
          {aside ? <span className="aside">{aside}</span> : null}
        </div>
      )}
      <div className={`pbody${bodyClass ? " " + bodyClass : ""}`}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, unit, icon: Icon, tone, trend }) {
  return (
    <div className="kpi">
      <div className="top">
        <div className="label">{label}</div>
        {Icon ? <span className={`ico${tone ? " " + tone : ""}`}><Icon width={18} height={18} /></span> : null}
      </div>
      <div className="value">
        {value}
        {unit ? <span className="u">{unit}</span> : null}
      </div>
      {trend ? <div className="trend">{trend}</div> : null}
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

// Small circular trust gauge (0-100).
export function TrustRing({ score = 0, bad = false, size = 44 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = bad ? "var(--trust-bad)" : "var(--green-dark)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle"
        fontSize="13" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}
