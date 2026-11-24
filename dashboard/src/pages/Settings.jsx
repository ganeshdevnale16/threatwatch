import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Panel } from "../components/ui";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", hint: "e.g. gpt-4o-mini · leave base URL blank" },
  { id: "anthropic", label: "Anthropic", hint: "e.g. claude-sonnet-4-5" },
  { id: "local", label: "Local / OpenAI-compatible", hint: "Ollama, LM Studio, vLLM, OpenRouter — set base URL" },
];

export default function Settings() {
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({ label: "", provider: "openai", model: "", api_key: "", base_url: "", make_default: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [testResult, setTestResult] = useState({});

  const load = () => api.models().then(setModels).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    if (!form.model.trim()) { setErr("Model name is required."); return; }
    setBusy(true);
    setErr(null);
    try {
      await api.addModel(form);
      setForm({ label: "", provider: "openai", model: "", api_key: "", base_url: "", make_default: false });
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id) => { await api.setDefaultModel(id); await load(); };
  const remove = async (id) => { if (confirm("Delete this model?")) { await api.deleteModel(id); await load(); } };
  const test = async (id) => {
    setTestResult((t) => ({ ...t, [id]: "…" }));
    try {
      const r = await api.testModel(id);
      setTestResult((t) => ({ ...t, [id]: r.ok ? `ok — "${r.reply}"` : `error — ${r.error}` }));
    } catch (e) {
      setTestResult((t) => ({ ...t, [id]: `error — ${e.message}` }));
    }
  };

  const prov = PROVIDERS.find((p) => p.id === form.provider);

  return (
    <div>
      <div className="pagehead">
        <h1>Settings · AI models</h1>
        <span className="sub">The default model writes plain-English alert explanations</span>
      </div>
      {err && <p className="banner">{err}</p>}

      <div className="row two">
        <Panel title="Configured models">
          {models.length === 0 ? (
            <p className="empty">No models yet. Add one on the right. Until then, alerts use the built-in offline explanation.</p>
          ) : (
            <table className="tw">
              <thead>
                <tr><th>Model</th><th>Provider</th><th>Key</th><th>Default</th><th></th></tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.label}</div>
                      <div className="note mono" style={{ margin: 0 }}>{m.model}</div>
                      {testResult[m.id] && <div className="note" style={{ margin: "2px 0 0" }}>{testResult[m.id]}</div>}
                    </td>
                    <td>{m.provider}</td>
                    <td className="mono" style={{ color: "var(--faint)" }}>{m.api_key || "—"}</td>
                    <td>{m.is_default ? <span className="pill">default</span> : (
                      <button className="btn sm ghost" onClick={() => makeDefault(m.id)}>Set default</button>
                    )}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn sm ghost" onClick={() => test(m.id)}>Test</button>{" "}
                      <button className="btn sm danger" onClick={() => remove(m.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Add a model">
          <form onSubmit={add}>
            <label className="fld"><span>Provider</span>
              <select className="in" value={form.provider} onChange={set("provider")}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <p className="note" style={{ marginTop: -6 }}>{prov?.hint}</p>
            <label className="fld"><span>Label</span>
              <input className="in" value={form.label} onChange={set("label")} placeholder="My GPT model" />
            </label>
            <label className="fld"><span>Model name</span>
              <input className="in" value={form.model} onChange={set("model")} placeholder={form.provider === "anthropic" ? "claude-sonnet-4-5" : "gpt-4o-mini"} />
            </label>
            <label className="fld"><span>API key</span>
              <input className="in" type="password" value={form.api_key} onChange={set("api_key")} placeholder={form.provider === "local" ? "(often blank for local)" : "sk-…"} />
            </label>
            {form.provider === "local" && (
              <label className="fld"><span>Base URL</span>
                <input className="in" value={form.base_url} onChange={set("base_url")} placeholder="http://localhost:11434/v1" />
              </label>
            )}
            <label className="fld" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.make_default} onChange={set("make_default")} />
              <span style={{ margin: 0 }}>Make this the default model</span>
            </label>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "Add model"}</button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
