import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Cart, Search, Shield, User } from "@/components/icons";

export const metadata: Metadata = {
  title: "Northwind Supply — Industrial Parts & Tooling",
  description: "Fasteners, power tools, safety gear and MRO supplies, shipped next day. Sample storefront monitored by ThreatWatch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="announce">
          Free next-day delivery on orders over <b>$75</b> · Trade accounts get <b>5% back</b> on every order
        </div>
        <header className="site">
          <div className="wrap bar">
            <Link href="/" className="brand">
              <span className="mk"><Shield size={20} /></span>
              <span className="nm">Northwind<b>.</b></span>
            </Link>
            <nav>
              <Link href="/products">Catalogue</Link>
              <Link href="/products">Power Tools</Link>
              <Link href="/products">Fasteners</Link>
              <Link href="/products">Safety</Link>
              <Link href="/api/products">API</Link>
            </nav>
            <div className="right">
              <span className="searchbox"><Search size={16} /> Search parts, SKUs…</span>
              <span className="icbtn"><User size={19} /></span>
              <span className="icbtn"><Cart size={19} /></span>
            </div>
          </div>
        </header>
        {children}
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <span className="mk"><Shield size={18} /></span>
              <span className="nm">Northwind<b>.</b></span>
            </div>
            <p style={{ color: "#8a949b", fontSize: 13.5, maxWidth: 260, margin: 0 }}>
              Industrial parts, tooling and MRO supplies for trades and manufacturers since 1998.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link href="/products">Power Tools</Link></li>
              <li><Link href="/products">Fasteners</Link></li>
              <li><Link href="/products">Safety Gear</Link></li>
              <li><Link href="/products">Adhesives</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About us</a></li>
              <li><a href="#">Trade accounts</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><a href="#">Shipping & returns</a></li>
              <li><a href="#">Order tracking</a></li>
              <li><a href="#">Bulk quotes</a></li>
              <li><a href="#">Help centre</a></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} Northwind Supply Co. (demo storefront).</span>
          <span>Traffic to this site is monitored by ThreatWatch.</span>
        </div>
      </div>
    </footer>
  );
}
