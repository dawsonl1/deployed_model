import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .eq("order_id", parseInt(id));

  // If a customer is selected, scope to their orders only
  if (customerId) {
    query = query.eq("customer_id", parseInt(customerId));
  }

  const { data: order } = await query.single();

  if (!order) {
    return <p style={{ color: "var(--muted)" }}>Order not found.</p>;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("order_item_id, quantity, unit_price, line_total, product_id")
    .eq("order_id", parseInt(id));

  const productIds = items?.map((i) => i.product_id) ?? [];
  const products = productIds.length > 0
    ? (await supabase.from("products").select("product_id, product_name").in("product_id", productIds)).data
    : [];

  const productMap = new Map(products?.map((p) => [p.product_id, p.product_name]));

  return (
    <div>
      <div className="page-header">
        <Link href="/orders" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
          &larr; Back to orders
        </Link>
        <h1 className="page-title mt-1">Order #{id}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="card p-4">
          <p className="metric-label">Status</p>
          <p className="mt-1">
            {order.fulfilled
              ? <span className="badge badge-success">Fulfilled</span>
              : <span className="badge badge-warning">Pending</span>}
          </p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Date</p>
          <p className="text-sm font-semibold mt-1"><LocalDate date={order.order_datetime} /></p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Payment</p>
          <p className="text-sm font-semibold mt-1 capitalize">{order.payment_method}</p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Device</p>
          <p className="text-sm font-semibold mt-1 capitalize">{order.device_type}</p>
        </div>
        <div className="card p-4">
          <p className="metric-label">Total</p>
          <p className="metric-value text-lg">${parseFloat(order.order_total).toFixed(2)}</p>
        </div>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
        Line Items
      </h2>

      <div className="card overflow-hidden mb-5">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Product</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.order_item_id}>
                <td className="font-medium">{productMap.get(item.product_id) ?? `Product #${item.product_id}`}</td>
                <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>${parseFloat(item.unit_price).toFixed(2)}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right font-medium" style={{ fontFamily: "var(--font-mono)" }}>${parseFloat(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 max-w-xs space-y-1 text-sm">
        <div className="flex justify-between" style={{ color: "var(--muted)" }}>
          <span>Subtotal</span>
          <span>${parseFloat(order.order_subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between" style={{ color: "var(--muted)" }}>
          <span>Shipping</span>
          <span>${parseFloat(order.shipping_fee).toFixed(2)}</span>
        </div>
        <div className="flex justify-between" style={{ color: "var(--muted)" }}>
          <span>Tax</span>
          <span>${parseFloat(order.tax_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <span>Total</span>
          <span>${parseFloat(order.order_total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
