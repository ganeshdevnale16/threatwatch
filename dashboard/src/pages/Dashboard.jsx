import AlertTable from "../components/AlertTable";
import AssurancePanel from "../components/AssurancePanel";
import { AlertsPerMinute, TopTalkers } from "../components/Charts";
import { Kpi, Panel } from "../components/ui";
import { useLive } from "../hooks/useLive";

export default function Dashboard() {
  const { alerts, stats, assurance } = useLive();
  const sev = stats?.alerts?.by_severity || {};
  const totalAlerts = stats?.alerts?.total ?? 0;
  const highish = (sev.high || 0) + (sev.critical || 0);
  const live = stats?.live || {};
  const reqPerS = Object.values(live.sites || {}).reduce((n, s) => n + (s.req_per_s || 0), 0);
  const integrations = stats?.integrations?.length ?? 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="row k">
        <Kpi label="Alerts (total)" value={totalAlerts} accent />
        <Kpi label="High / critical" value={highish} />
        <Kpi label="Requests/s" value={reqPerS.toFixed(1)} unit="now" />
        <Kpi label="Active sources" value={live.active_sources ?? 0} />
        <Kpi label="Integrations" value={integrations} />
      </div>

      <div className="row two">
        <Panel title="Live threat alerts" aside="newest first">
          <AlertTable alerts={alerts} />
        </Panel>
        <Panel title="AI assurance" aside="model health, live">
          <AssurancePanel assurance={assurance} />
        </Panel>
      </div>

      <div className="row wide">
        <Panel title="Alerts per minute">
          <AlertsPerMinute alerts={alerts} />
        </Panel>
        <Panel title="Top talkers" aside="current window">
          <TopTalkers stats={stats} />
        </Panel>
      </div>
    </div>
  );
}
