const PRODUCTS = [
  { id: "NB-1001", name: "Hex bolt, M8×40 (box of 100)", price: "$12.40" },
  { id: "NB-1002", name: "Stainless washer, M8 (box of 200)", price: "$8.10" },
  { id: "NB-2050", name: "Cordless impact driver, 18V", price: "$139.00" },
  { id: "NB-2051", name: "Driver battery pack, 4.0Ah", price: "$54.00" },
  { id: "NB-3300", name: "Safety goggles, anti-fog (pack of 10)", price: "$29.90" },
  { id: "NB-3301", name: "Nitrile gloves, L (box of 100)", price: "$11.75" },
];

export default function Products() {
  return (
    <>
      <h1 style={{ marginTop: 32 }}>Catalogue</h1>
      <p style={{ color: "var(--muted)" }}>
        Static sample data. The JSON version is at <code>/api/products</code>.
      </p>
      <div className="grid">
        {PRODUCTS.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{p.id}</div>
            <div className="price" style={{ marginTop: 8 }}>
              {p.price}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
