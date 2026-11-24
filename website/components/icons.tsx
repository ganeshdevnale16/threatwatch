// Inline SVG icons for the storefront. All inherit currentColor.
type P = { size?: number };
const s = (n = 20) => ({ width: n, height: n, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const Shield = ({ size }: P) => (<svg {...s(size)}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>);
export const Search = ({ size }: P) => (<svg {...s(size)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>);
export const Cart = ({ size }: P) => (<svg {...s(size)}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.5 12h11l2-8H6" /></svg>);
export const User = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
export const Bolt = ({ size }: P) => (<svg {...s(size)}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>);
export const Wrench = ({ size }: P) => (<svg {...s(size)}><path d="M14 7a4 4 0 0 1-5 5l-6 6 2 2 6-6a4 4 0 0 1 5-5l3-3-2-2z" /></svg>);
export const Bolt2 = ({ size }: P) => (<svg {...s(size)}><path d="M12 2l2 3 3 1-1 3 1 3-3 1-2 3-2-3-3-1 1-3-1-3 3-1z" /><circle cx="12" cy="11" r="2.5" /></svg>);
export const Helmet = ({ size }: P) => (<svg {...s(size)}><path d="M3 16a9 9 0 0 1 18 0" /><path d="M2 16h20v2H2z" /><path d="M12 7v-2M9 8l-1-2M15 8l1-2" /></svg>);
export const Gloves = ({ size }: P) => (<svg {...s(size)}><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6H8l-3-5 2-1" /></svg>);
export const Drill = ({ size }: P) => (<svg {...s(size)}><path d="M4 8h9v5H4zM13 9h4l2 2-2 2h-4M6 13v4h3v-4" /></svg>);
export const Tape = ({ size }: P) => (<svg {...s(size)}><circle cx="9" cy="12" r="5" /><circle cx="9" cy="12" r="1.5" /><path d="M9 17h9a2 2 0 0 0 0-4h-3" /></svg>);
export const Truck = ({ size }: P) => (<svg {...s(size)}><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>);
export const Tag = ({ size }: P) => (<svg {...s(size)}><path d="M3 3h8l9 9-8 8-9-9z" /><circle cx="7.5" cy="7.5" r="1.4" /></svg>);
export const Headset = ({ size }: P) => (<svg {...s(size)}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M20 19a4 4 0 0 1-4 4h-3" /></svg>);
export const Check = ({ size }: P) => (<svg {...s(size)}><path d="M20 6 9 17l-5-5" /></svg>);
export const Box = ({ size }: P) => (<svg {...s(size)}><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>);
