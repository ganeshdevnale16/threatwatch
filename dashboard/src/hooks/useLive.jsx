import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { api, wsUrl } from "../api/client";

const MAX = 500;
const Ctx = createContext(null);

export function LiveProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [assurance, setAssurance] = useState({});
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState(null);
  const retry = useRef(0);

  const loadInitial = useCallback(async () => {
    try {
      const [a, s, as] = await Promise.all([api.alerts({ limit: 200 }), api.stats(), api.assurance()]);
      setAlerts(a);
      setStats(s);
      setAssurance(as.detectors || {});
      setError(null);
    } catch (e) {
      setError(`Backend not reachable (${e.message}). Start it with: python run.py`);
    }
  }, []);

  useEffect(() => {
    let ws, closed = false, timer;
    const connect = () => {
      setConnection("connecting");
      ws = new WebSocket(wsUrl());
      ws.onopen = () => {
        retry.current = 0;
        setConnection("live");
        loadInitial();
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "alert") setAlerts((p) => [msg.data, ...p].slice(0, MAX));
        else if (msg.type === "stats") setStats(msg.data);
        else if (msg.type === "assurance") setAssurance(msg.data);
      };
      ws.onclose = () => {
        if (closed) return;
        setConnection("off");
        timer = setTimeout(connect, Math.min(8000, 1000 * 2 ** retry.current++));
      };
      ws.onerror = () => ws.close();
    };
    loadInitial();
    connect();
    return () => { closed = true; clearTimeout(timer); ws?.close(); };
  }, [loadInitial]);

  const patchAlert = useCallback((a) => {
    setAlerts((p) => p.map((x) => (x.alert_id === a.alert_id ? { ...x, ...a } : x)));
  }, []);

  return (
    <Ctx.Provider value={{ alerts, stats, assurance, connection, error, reload: loadInitial, patchAlert }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLive = () => useContext(Ctx);
