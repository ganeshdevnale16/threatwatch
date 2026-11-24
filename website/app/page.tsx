import Link from "next/link";
import { Bolt, Bolt2, Box, Check, Drill, Gloves, Headset, Helmet, Tag, Tape, Truck, Wrench } from "@/components/icons";

const CATEGORIES = [
  { name: "Power Tools", count: "1,240 items", Icon: Drill },
  { name: "Fasteners", count: "3,500 items", Icon: Bolt2 },
  { name: "Safety Gear", count: "860 items", Icon: Helmet },
  { name: "Hand Tools", count: "2,100 items", Icon: Wrench },
  { name: "Adhesives", count: "540 items", Icon: Tape },
  { name: "Gloves & PPE", count: "720 items", Icon: Gloves },
];

const FEATURED = [
  { sku: "NB-2050", name: "Cordless Impact Driver, 18V", price: "$139.00", stock: "In stock", Icon: Drill },
  { sku: "NB-1001", name: "Hex Bolt M8×40 — Box of 100", price: "$12.40", stock: "In stock", Icon: Bolt2 },
  { sku: "NB-3300", name: "Anti-Fog Safety Goggles (10pk)", price: "$29.90", stock: "In stock", Icon: Helmet },
  { sku: "NB-4120", name: "Heavy-Duty Nitrile Gloves (100)", price: "$11.75", stock: "Low stock", Icon: Gloves },
];

export default function Home() {
  return (
    <>
      {/* hero */}
      <section className="hero">
        <div className="wrap grid">
          <div>
            <span className="ey"><Bolt size={14} /> Trusted by 12,000+ trade accounts</span>
            <h1>Industrial parts & tooling, <span>shipped next day.</span></h1>
            <p className="lead">
              Over 50,000 SKUs of fasteners, power tools, safety equipment and MRO supplies —
              real stock, trade pricing, and delivery you can build a schedule around.
            </p>
            <div className="cta">
              <Link className="btn" href="/products"><Box size={17} /> Browse catalogue</Link>
              <Link className="btn ghost" href="/products">Open a trade account</Link>
            </div>
            <div className="stats">
              <div className="s"><b>50k+</b><span>SKUs in stock</span></div>
              <div className="s"><b>99.2%</b><span>Next-day fulfilment</span></div>
              <div className="s"><b>24/7</b><span>Trade support</span></div>
            </div>
          </div>
          <div className="heroviz">
            <div className="card">
              {FEATURED.slice(0, 3).map((p) => (
                <div className="pcard" key={p.sku}>
                  <span className="thumb"><p.Icon size={24} /></span>
                  <span>
                    <div className="nm">{p.name}</div>
                    <div className="mt">{p.sku} · {p.stock}</div>
                  </span>
                  <span className="pr">{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* categories */}
      <div className="wrap">
        <div className="cats">
          {CATEGORIES.map((c) => (
            <Link href="/products" className="cat" key={c.name}>
              <span className="ci"><c.Icon size={22} /></span>
              <div className="cn">{c.name}</div>
              <div className="cc">{c.count}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* featured products */}
      <section className="section">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>Best sellers this week</h2>
              <p>Restocked daily from our regional distribution centres.</p>
            </div>
            <Link href="/products">View all →</Link>
          </div>
          <div className="pgrid">
            {FEATURED.map((p) => (
              <div className="prod" key={p.sku}>
                <div className="ph"><p.Icon size={44} /><span className="stock">{p.stock}</span></div>
                <div className="pb">
                  <div className="sku">{p.sku}</div>
                  <div className="pn">{p.name}</div>
                  <div className="foot">
                    <span className="price">{p.price}</span>
                    <button className="add">Add to cart</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="section alt">
        <div className="wrap feats">
          <div className="feat"><span className="fi"><Truck size={22} /></span><div><h3>Next-day delivery</h3><p>Order by 6pm for free next-day dispatch on in-stock items over $75.</p></div></div>
          <div className="feat"><span className="fi"><Tag size={22} /></span><div><h3>Trade pricing</h3><p>Volume breaks and account-based pricing on every line, no negotiation needed.</p></div></div>
          <div className="feat"><span className="fi"><Headset size={22} /></span><div><h3>Specialist support</h3><p>Talk to people who know the catalogue — sizing, specs and bulk quotes.</p></div></div>
        </div>
      </section>

      {/* stat band */}
      <section className="band">
        <div className="wrap grid">
          <div><div className="n">1998</div><div className="l">Established</div></div>
          <div><div className="n">50k+</div><div className="l">Products</div></div>
          <div><div className="n">12k</div><div className="l">Trade accounts</div></div>
          <div><div className="n">8</div><div className="l">Distribution centres</div></div>
        </div>
      </section>

      {/* assurance strip (demo context) */}
      <section className="section">
        <div className="wrap" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center", textAlign: "center" }}>
          <Check size={18} />
          <span style={{ color: "var(--muted)", fontSize: 14.5 }}>
            This is a demo storefront. Every request — including attack traffic — is monitored in real time by <b style={{ color: "var(--green-dark)" }}>ThreatWatch</b>.
          </span>
        </div>
      </section>
    </>
  );
}
