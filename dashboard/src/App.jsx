import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { LiveProvider, useLive } from "./hooks/useLive";
import { IconAlert, IconDashboard, IconGear, IconPlug, IconShield } from "./components/icons";
import Alerts from "./pages/Alerts";
import AlertDetail from "./pages/AlertDetail";
import Dashboard from "./pages/Dashboard";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";

const NAV = [
  { to: "/", label: "Overview", icon: IconDashboard, end: true },
  { to: "/alerts", label: "Alerts", icon: IconAlert },
  { to: "/integrations", label: "Integrations", icon: IconPlug },
  { to: "/settings", label: "Settings", icon: IconGear },
];

const TITLES = { "/": "Security Overview", "/alerts": "Threat Alerts", "/integrations": "Integrations", "/settings": "Settings" };

function Sidebar() {
  const { connection } = useLive();
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="mark"><IconShield width={18} height={18} /></span>
        <span className="name">
          Threat<b>Watch</b>
          <span className="tag">Threat Detection</span>
        </span>
      </div>
      <nav>
        <div className="sect">Monitoring</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={cls}>
            <n.icon /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="foot">
        <div className="live">
          <span className={`dotlive ${connection === "live" ? "live" : "off"}`} />
          {connection === "live" ? "Live — streaming" : connection === "off" ? "Reconnecting…" : "Connecting…"}
        </div>
        Passive web-attack detection. Metadata only.
      </div>
    </aside>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="clock">{now.toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>;
}

function Topbar() {
  const { pathname } = useLocation();
  const { connection } = useLive();
  const title = TITLES[pathname] || (pathname.startsWith("/alerts/") ? "Alert Detail" : "ThreatWatch");
  return (
    <div className="topbar">
      <h1>{title}</h1>
      <span className="spacer" />
      <span className="livechip">
        <span className={`dotlive ${connection === "live" ? "live" : "off"}`} />
        {connection === "live" ? "Live" : connection === "off" ? "Reconnecting" : "Connecting"}
      </span>
      <Clock />
    </div>
  );
}

function Shell() {
  const { error } = useLive();
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          {error ? <p className="banner">{error}</p> : null}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alerts/:id" element={<AlertDetail />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<p className="empty">Page not found.</p>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}
