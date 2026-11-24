import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Northwind Supply",
  description: "Industrial parts & tooling — sample site monitored by ThreatWatch",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="wrap">
            <span className="brand">
              Northwind<b>·</b>Supply
            </span>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/products">Products</Link>
              <Link href="/api/products">API</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site">
          <div className="wrap">
            © Northwind Supply (demo). Traffic to this site is monitored by ThreatWatch.
          </div>
        </footer>
      </body>
    </html>
  );
}
