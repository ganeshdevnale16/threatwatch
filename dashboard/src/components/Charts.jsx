import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export function AlertsPerMinute({ alerts }) {
  const data = useMemo(() => {
    const buckets = new Map();
    for (const a of alerts) {
      const t = new Date(a.timestamp);
      if (isNaN(t)) continue;
      const key = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-20).map(([t, n]) => ({ t, n }));
  }, [alerts]);

  if (!data.length) return <p className="empty">No alerts to chart yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f2" vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#5b6770" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6770" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e4e8ea" }} />
        <Bar dataKey="n" fill="#86bc25" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopTalkers({ stats }) {
  const rows = useMemo(() => {
    const sites = stats?.live?.sites || {};
    const all = [];
    for (const s of Object.values(sites)) for (const t of s.top_talkers || []) all.push(t);
    const merged = new Map();
    for (const t of all) merged.set(t.ip, (merged.get(t.ip) || 0) + t.requests);
    return [...merged.entries()].map(([ip, requests]) => ({ ip, requests })).sort((a, b) => b.requests - a.requests).slice(0, 8);
  }, [stats]);

  if (!rows.length) return <p className="empty">No active sources in the current window.</p>;
  const max = rows[0].requests || 1;
  return (
    <table className="tw">
      <tbody>
        {rows.map((r) => (
          <tr key={r.ip}>
            <td className="mono" style={{ width: 150 }}>{r.ip}</td>
            <td>
              <div className="bar"><span style={{ width: `${(r.requests / max) * 100}%` }} /></div>
            </td>
            <td style={{ textAlign: "right", color: "var(--muted)", width: 60 }}>{r.requests}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
