import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; order_id?: string }>;
}) {
  const params = await searchParams;
  const success = params.success === "1";
  const newOrderId = params.order_id || "";
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("order_id, order_datetime, order_total, payment_method, fulfilled")
    .eq("customer_id", parseInt(customerId))
    .order("order_datetime", { ascending: false });

  return (
    <div>
      {success && (
        <div
          className="card p-3 mb-5 text-sm font-medium"
          style={{ background: "var(--success-soft)", color: "var(--success)", borderColor: "var(--success)" }}
        >
          Order placed successfully.{newOrderId && <> Order ID: <strong>#{newOrderId}</strong></>}
        </div>
      )}
      <div className="page-header">
        <h1 className="page-title">Order History</h1>
        <p className="page-desc">All orders placed by this customer, newest first.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Date</th>
              <th className="text-left">Payment</th>
              <th className="text-center">Status</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.order_id}>
                <td>
                  <Link href={`/orders/${o.order_id}`} style={{ color: "var(--accent)" }} className="font-medium">
                    #{o.order_id}
                  </Link>
                </td>
                <td style={{ color: "var(--muted)" }}><LocalDate date={o.order_datetime} /></td>
                <td className="capitalize">{o.payment_method}</td>
                <td className="text-center">
                  {o.fulfilled
                    ? <span className="badge badge-success">Fulfilled</span>
                    : <span className="badge badge-warning">Pending</span>}
                </td>
                <td className="text-right font-medium">${parseFloat(o.order_total).toFixed(2)}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr><td colSpan={5} className="text-center py-8" style={{ color: "var(--muted)" }}>No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
