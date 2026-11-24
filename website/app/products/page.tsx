import { Bolt2, Drill, Gloves, Helmet, Tape, Wrench } from "@/components/icons";

const PRODUCTS = [
  { sku: "NB-1001", name: "Hex Bolt M8×40 — Box of 100", price: "$12.40", stock: "In stock", cat: "Fasteners", Icon: Bolt2 },
  { sku: "NB-1002", name: "Stainless Washer M8 — Box of 200", price: "$8.10", stock: "In stock", cat: "Fasteners", Icon: Bolt2 },
  { sku: "NB-2050", name: "Cordless Impact Driver, 18V", price: "$139.00", stock: "In stock", cat: "Power Tools", Icon: Drill },
  { sku: "NB-2051", name: "Driver Battery Pack, 4.0Ah", price: "$54.00", stock: "Low stock", cat: "Power Tools", Icon: Drill },
  { sku: "NB-2210", name: "Adjustable Wrench, 250mm", price: "$18.60", stock: "In stock", cat: "Hand Tools", Icon: Wrench },
  { sku: "NB-3300", name: "Anti-Fog Safety Goggles (10pk)", price: "$29.90", stock: "In stock", cat: "Safety", Icon: Helmet },
  { sku: "NB-4120", name: "Heavy-Duty Nitrile Gloves (100)", price: "$11.75", stock: "Low stock", cat: "PPE", Icon: Gloves },
  { sku: "NB-5050", name: "Industrial Duct Tape, 48mm", price: "$6.20", stock: "In stock", cat: "Adhesives", Icon: Tape },
];

export default function Products() {
  return (
    <div className="wrap pagewrap">
      <div className="crumb">Home / Catalogue</div>
      <h1>Catalogue</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        {PRODUCTS.length} of 50,000+ lines shown. The JSON feed is at <code>/api/products</code>.
      </p>
      <div className="pgrid" style={{ marginTop: 26 }}>
        {PRODUCTS.map((p) => (
          <div className="prod" key={p.sku}>
            <div className="ph"><p.Icon size={44} /><span className="stock">{p.stock}</span></div>
            <div className="pb">
              <div className="sku">{p.sku} · {p.cat}</div>
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
  );
}
