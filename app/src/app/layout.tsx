import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fraud Detection Pipeline",
  description: "ML Pipeline Dashboard",
};

const navSections = [
  {
    label: "Customer",
    links: [
      { href: "/select-customer", label: "Select" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/place-order", label: "New Order" },
      { href: "/orders", label: "History" },
    ],
  },
  {
    label: "Pipeline",
    links: [
      { href: "/warehouse/priority", label: "Fraud Queue" },
      { href: "/scoring", label: "Models & Scoring" },
    ],
  },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;

  let customerName: string | null = null;
  if (customerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("customers")
      .select("full_name")
      .eq("customer_id", parseInt(customerId))
      .single();
    customerName = data?.full_name ?? null;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex">
        {/* Sidebar Navigation */}
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
            {navSections.map((section) => (
              <div key={section.label}>
                <p
                  className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--muted)" }}
                >
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} className="nav-link block">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
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

        {/* Main Content */}
        <main className="flex-1 ml-56 min-h-screen" style={{ background: "var(--background)" }}>
          <div className="max-w-6xl mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
