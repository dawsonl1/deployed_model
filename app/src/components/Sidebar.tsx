"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const customerLinks = [
  { href: "/select-customer", label: "Select Customer" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/place-order", label: "New Order" },
  { href: "/orders", label: "Order History" },
];

const adminLinks = [
  { href: "/admin/place-order", label: "Place Order (Any)" },
  { href: "/admin/orders", label: "All Orders" },
  { href: "/warehouse/priority", label: "Fraud Review Queue" },
  { href: "/admin/review", label: "Training Pool" },
  { href: "/scoring", label: "Models & Scoring" },
  { href: "/admin/schema", label: "Database Schema" },
];

export default function Sidebar({ customerName }: { customerName: string | null }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/warehouse") || pathname.startsWith("/scoring");

  function isActive(href: string) {
    if (href === "/orders" && pathname.startsWith("/orders")) return true;
    return pathname === href;
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r fixed h-full overflow-y-auto"
      style={{ background: "var(--nav-bg)", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--nav-accent)" }}
          >
            FD
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--nav-text-active)" }}>
            Fraud Detection
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-5">
        {/* Customer section */}
        <div>
          <p
            className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            Customer
          </p>
          <div className="space-y-0.5">
            {customerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link block"
                style={isActive(link.href) ? { color: "var(--nav-text-active)", background: "rgba(255,255,255,0.08)" } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin section */}
        <div>
          <p
            className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            Admin
          </p>
          <div className="space-y-0.5">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link block"
                style={isActive(link.href) ? { color: "var(--nav-text-active)", background: "rgba(255,255,255,0.08)" } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Active customer indicator */}
      <div className="px-3 py-4 mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {customerName ? (
          <Link href="/select-customer" className="block">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--muted)" }}>
              Acting as
            </p>
            <p className="text-sm font-medium truncate" style={{ color: "var(--nav-text-active)" }}>
              {customerName}
            </p>
          </Link>
        ) : (
          <Link href="/select-customer" className="nav-link block text-center">
            Select a customer
          </Link>
        )}
      </div>
    </aside>
  );
}
