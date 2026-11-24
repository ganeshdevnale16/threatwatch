import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="tag">Live demo target</span>
        <h1>Industrial parts, shipped fast.</h1>
        <p>
          Northwind Supply is a sample storefront used to demonstrate ThreatWatch. Every
          request you make here — including any attack traffic — is mirrored to the detection
          platform and shown on its live dashboard.
        </p>
        <Link className="btn" href="/products">
          Browse the catalogue
        </Link>
      </section>
      <section className="grid">
        <div className="card">
          <h3>Real monitoring</h3>
          <p>An edge middleware agent forwards request metadata to the detector — no payloads, no cookies.</p>
        </div>
        <div className="card">
          <h3>Four threat classes</h3>
          <p>Request floods, path scanning, injection probes and automated scraper beacons.</p>
        </div>
        <div className="card">
          <h3>Try it</h3>
          <p>
            Point the attack simulator at this URL and watch alerts appear on the dashboard in
            real time.
          </p>
        </div>
      </section>
    </>
  );
}
