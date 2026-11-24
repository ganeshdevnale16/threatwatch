import { NavLink, Route, Routes } from "react-router-dom";
import { LiveProvider, useLive } from "./hooks/useLive";
import Alerts from "./pages/Alerts";
import AlertDetail from "./pages/AlertDetail";
import Dashboard from "./pages/Dashboard";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";

function TopBar() {
  const { connection } = useLive();
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <header className="topbar">
      <span className="brand">
        <span className="dot" />
        Threat<b>Watch</b>
      </span>
      <nav>
        <NavLink to="/" end className={cls}>Dashboard</NavLink>
        <NavLink to="/alerts" className={cls}>Alerts</NavLink>
        <NavLink to="/integrations" className={cls}>Integrations</NavLink>
        <NavLink to="/settings" className={cls}>Settings</NavLink>
      </nav>
      <span className="status">
        <span className={`dotlive ${connection === "live" ? "live" : "off"}`} />
        {connection === "live" ? "Live" : connection === "off" ? "Reconnecting" : "Connecting"}
      </span>
    </header>
  );
}

function Shell() {
  const { error } = useLive();
  return (
    <div className="app">
      <TopBar />
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
  );
}

export default function App() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}
