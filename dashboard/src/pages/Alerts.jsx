import AlertTable from "../components/AlertTable";
import { Panel } from "../components/ui";
import { useLive } from "../hooks/useLive";

export default function Alerts() {
  const { alerts } = useLive();
  return (
    <div>
      <div className="pagehead">
        <h1>Alerts</h1>
        <span className="sub">{alerts.length} in view · filter by threat class below</span>
      </div>
      <Panel>
        <AlertTable alerts={alerts} limit={500} />
      </Panel>
    </div>
  );
}
