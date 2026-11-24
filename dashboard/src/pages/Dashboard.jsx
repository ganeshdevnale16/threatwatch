import AlertTable from "../components/AlertTable";
import AssurancePanel from "../components/AssurancePanel";
import { AlertsPerMinute, TopTalkers } from "../components/Charts";
import { IconAlert, IconBolt, IconPlug, IconPulse, IconRadar, IconShield, IconUsers } from "../components/icons";
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
        <Kpi label="Total alerts" value={totalAlerts} icon={IconAlert} tone="green" trend="all time" />
        <Kpi label="High / critical" value={highish} icon={IconBolt} tone={highish ? "red" : "green"} trend="needs review" />
        <Kpi label="Requests / sec" value={reqPerS.toFixed(1)} icon={IconPulse} trend="live, all sites" />
        <Kpi label="Active sources" value={live.active_sources ?? 0} icon={IconUsers} trend="in window" />
        <Kpi label="Integrations" value={integrations} icon={IconPlug} trend="connected sites" />
      </div>

      <div className="row two">
        <Panel title="Live threat alerts" icon={IconAlert} aside="newest first">
          <AlertTable alerts={alerts} />
        </Panel>
        <Panel title="AI assurance" icon={IconShield} aside="model health">
          <AssurancePanel assurance={assurance} />
        </Panel>
      </div>

      <div className="row wide">
        <Panel title="Alert volume" icon={IconPulse} aside="per minute">
          <AlertsPerMinute alerts={alerts} />
        </Panel>
        <Panel title="Top talkers" icon={IconRadar} aside="current window">
          <TopTalkers stats={stats} />
        </Panel>
      </div>
    </div>
  );
}
