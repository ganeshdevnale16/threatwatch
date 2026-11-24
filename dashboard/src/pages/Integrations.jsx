import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Panel } from "../components/ui";
import { agoFromEpoch } from "../lib/format";

export default function Integrations() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [setup, setSetup] = useState(null); // {site_id, name, ingest_key}

  const load = () => api.integrations().then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await api.createIntegration(name.trim(), url.trim());
      setName("");
      setUrl("");
      await load();
      setSetup(created); // created has the full ingest_key
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const showSetup = async (id) => setSetup(await api.integration(id));
  const remove = async (id) => {
    if (!confirm("Remove this integration? Its ingest key will stop working.")) return;
    await api.deleteIntegration(id);
    if (setup?.site_id === id) setSetup(null);
    await load();
  };

  return (
    <div>
      <div className="pagehead">
        <h1>Integrations</h1>
        <span className="sub">Connect a website so its traffic is monitored</span>
      </div>
      {err && <p className="banner">{err}</p>}

      <div className="row two">
        <Panel title="Connected websites">
          {items.length === 0 ? (
            <p className="empty">No websites yet. Add one on the right to get an ingest key.</p>
          ) : (
            <table className="tw">
              <thead>
                <tr><th>Name</th><th>Events</th><th>Last event</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.site_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div className="note" style={{ margin: 0 }}>{i.url || i.site_id}</div>
                    </td>
                    <td className="mono">{i.event_count}</td>
                    <td style={{ color: "var(--muted)" }}>{agoFromEpoch(i.last_event_at)}</td>
                    <td><span className={`pill${i.status === "active" ? "" : " gray"}`}>{i.status}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn sm ghost" onClick={() => showSetup(i.site_id)}>Agent setup</button>{" "}
                      <button className="btn sm danger" onClick={() => remove(i.site_id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Add a website">
          <form onSubmit={add}>
            <label className="fld"><span>Name</span>
              <input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Supply" />
            </label>
            <label className="fld"><span>URL (optional)</span>
              <input className="in" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://northwind.vercel.app" />
            </label>
            <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create integration"}</button>
          </form>
        </Panel>
      </div>

      {setup && (
        <div style={{ marginTop: 16 }}>
          <Panel title={`Agent setup — ${setup.name}`} aside="add these to your site">
            <p style={{ marginTop: 0, fontSize: 14 }}>
              Set these environment variables on your website (Vercel → Project → Settings → Environment
              Variables, or <code>.env.local</code> for local dev), then redeploy. The middleware agent
              that ships with the sample site will start forwarding traffic.
            </p>
            <div className="code">{`TW_INGEST_URL=${apiOrigin()}
TW_INGEST_KEY=${setup.ingest_key}`}</div>
            <p className="note">
              Keep the ingest key secret — anyone with it can submit events as this site. You can remove the
              integration to revoke it.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}

function apiOrigin() {
  const base = import.meta.env.VITE_API_BASE;
  if (base) return base.replace(/\/$/, "");
  return "http://localhost:8000";
}
