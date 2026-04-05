import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
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
        <Sidebar customerName={customerName} />
        <main className="flex-1 ml-56 min-h-screen" style={{ background: "var(--background)" }}>
          <div className="max-w-6xl mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
