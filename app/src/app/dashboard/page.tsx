import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("customer_id", parseInt(customerId))
    .single();

  if (!customer) redirect("/select-customer");

  const { data: orders } = await supabase
    .from("orders")
    .select("order_id, order_datetime, order_total, fulfilled")
    .eq("customer_id", parseInt(customerId))
    .order("order_datetime", { ascending: false });

  const totalOrders = orders?.length ?? 0;
  const totalSpend = orders?.reduce((sum, o) => sum + parseFloat(o.order_total), 0) ?? 0;
  const avgOrder = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const recentOrders = orders?.slice(0, 5) ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{customer.full_name}</h1>
        <p className="page-desc">{customer.email}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="metric-label">Total Orders</p>
          <p className="metric-value">{totalOrders}</p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Total Spend</p>
          <p className="metric-value">${totalSpend.toFixed(0)}</p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Avg Order</p>
          <p className="metric-value">${avgOrder.toFixed(0)}</p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Segment</p>
          <p className="text-lg font-semibold mt-1">{customer.customer_segment ?? "—"}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{customer.loyalty_tier ?? "—"} tier</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Recent Orders
        </h2>
        <Link href="/orders" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
          View all &rarr;
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Date</th>
              <th className="text-center">Status</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.order_id}>
                <td>
                  <Link href={`/orders/${o.order_id}`} style={{ color: "var(--accent)" }} className="font-medium">
                    #{o.order_id}
                  </Link>
                </td>
                <td style={{ color: "var(--muted)" }}><LocalDate date={o.order_datetime} /></td>
                <td className="text-center">
                  {o.fulfilled
                    ? <span className="badge badge-success">Fulfilled</span>
                    : <span className="badge badge-warning">Pending</span>}
                </td>
                <td className="text-right font-medium">${parseFloat(o.order_total).toFixed(2)}</td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8" style={{ color: "var(--muted)" }}>No orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
