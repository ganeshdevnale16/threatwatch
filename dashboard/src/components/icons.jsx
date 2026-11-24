// Minimal inline SVG icons (no icon-library dependency). Inherit currentColor.
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconDashboard = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
export const IconAlert = (p) => (
  <svg {...base} {...p}><path d="M12 3l9 16H3z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>
);
export const IconPlug = (p) => (
  <svg {...base} {...p}><path d="M9 2v6M15 2v6" /><path d="M7 8h10v3a5 5 0 0 1-10 0z" /><path d="M12 16v6" /></svg>
);
export const IconGear = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 6.9 4.6l.1.1A1.6 1.6 0 0 0 9 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8z" /></svg>
);
export const IconShield = (p) => (
  <svg {...base} {...p}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IconPulse = (p) => (
  <svg {...base} {...p}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
);
export const IconUsers = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9" /></svg>
);
export const IconBolt = (p) => (
  <svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
);
export const IconScan = (p) => (
  <svg {...base} {...p}><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" /><path d="M4 12h16" /></svg>
);
export const IconBug = (p) => (
  <svg {...base} {...p}><rect x="8" y="7" width="8" height="11" rx="4" /><path d="M9 7a3 3 0 0 1 6 0M3 11h3M18 11h3M3 16h3M18 16h3M12 2v3" /></svg>
);
export const IconRadar = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 19 7" /></svg>
);
