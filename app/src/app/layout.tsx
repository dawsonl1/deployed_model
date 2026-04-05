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

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/select-customer", label: "Select Customer" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/place-order", label: "Place Order" },
  { href: "/orders", label: "Order History" },
  { href: "/warehouse/priority", label: "Priority Queue" },
  { href: "/scoring", label: "Run Scoring" },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-lg">Fraud Pipeline</span>
              <div className="flex gap-4 text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            {customerName && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Acting as: <span className="font-medium text-gray-900 dark:text-gray-100">{customerName}</span>
              </div>
            )}
          </div>
        </nav>
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
