import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", parseInt(id))
    .single();

  if (!order) {
    return <p className="text-gray-500">Order not found.</p>;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("order_item_id, quantity, unit_price, line_total, product_id")
    .eq("order_id", parseInt(id));

  // Get product names
  const productIds = items?.map((i) => i.product_id) ?? [];
  const { data: products } = await supabase
    .from("products")
    .select("product_id, product_name")
    .in("product_id", productIds);

  const productMap = new Map(products?.map((p) => [p.product_id, p.product_name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-blue-600 hover:underline text-sm">&larr; Back to orders</Link>
        <h1 className="text-2xl font-bold">Order #{id}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Date</p>
          <p className="font-medium"><LocalDate date={order.order_datetime} /></p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Payment</p>
          <p className="font-medium">{order.payment_method}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Device</p>
          <p className="font-medium">{order.device_type}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-medium">${parseFloat(order.order_total).toFixed(2)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Line Items</h2>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="text-left px-4 py-2">Product</th>
                <th className="text-right px-4 py-2">Unit Price</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-right px-4 py-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.order_item_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{productMap.get(item.product_id) ?? `Product #${item.product_id}`}</td>
                  <td className="px-4 py-2 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">${parseFloat(item.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <p>Subtotal: ${parseFloat(order.order_subtotal).toFixed(2)}</p>
        <p>Shipping: ${parseFloat(order.shipping_fee).toFixed(2)}</p>
        <p>Tax: ${parseFloat(order.tax_amount).toFixed(2)}</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Total: ${parseFloat(order.order_total).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
