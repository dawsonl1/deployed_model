import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function submitOrder(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();

  // Parse line items from form
  const productIds = formData.getAll("product_id") as string[];
  const quantities = formData.getAll("quantity") as string[];

  const lineItems: { product_id: number; quantity: number; unit_price: number; line_total: number }[] = [];

  for (let i = 0; i < productIds.length; i++) {
    const pid = parseInt(productIds[i]);
    const qty = parseInt(quantities[i]);
    if (!pid || !qty || qty <= 0) continue;

    const { data: product } = await supabase
      .from("products")
      .select("price")
      .eq("product_id", pid)
      .single();

    if (product) {
      lineItems.push({
        product_id: pid,
        quantity: qty,
        unit_price: parseFloat(product.price),
        line_total: parseFloat(product.price) * qty,
      });
    }
  }

  if (lineItems.length === 0) return;

  const subtotal = lineItems.reduce((s, li) => s + li.line_total, 0);
  const shippingFee = 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingFee + tax;

  const { data: order } = await supabase
    .from("orders")
    .insert({
      customer_id: parseInt(customerId),
      order_datetime: new Date().toISOString(),
      payment_method: "card",
      device_type: "desktop",
      ip_country: "US",
      promo_used: false,
      order_subtotal: parseFloat(subtotal.toFixed(2)),
      shipping_fee: parseFloat(shippingFee.toFixed(2)),
      tax_amount: parseFloat(tax.toFixed(2)),
      order_total: parseFloat(total.toFixed(2)),
      risk_score: 0,
      is_fraud: false,
    })
    .select("order_id")
    .single();

  if (order) {
    const items = lineItems.map((li) => ({
      order_id: order.order_id,
      product_id: li.product_id,
      quantity: li.quantity,
      unit_price: li.unit_price,
      line_total: li.line_total,
    }));
    await supabase.from("order_items").insert(items);
  }

  redirect("/orders");
}

export default async function PlaceOrderPage() {
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("product_id, product_name, category, price")
    .eq("is_active", true)
    .order("category")
    .order("product_name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Place Order</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Select products and quantities below. The order will be placed for the currently selected customer.
      </p>

      <form action={submitOrder}>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="text-left px-4 py-2">Product</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-right px-4 py-2">Price</th>
                <th className="text-right px-4 py-2 w-24">Qty</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p) => (
                <tr key={p.product_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">
                    {p.product_name}
                    <input type="hidden" name="product_id" value={p.product_id} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2 text-right">${parseFloat(p.price).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      name="quantity"
                      defaultValue={0}
                      min={0}
                      max={99}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-right bg-white dark:bg-gray-900"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
        >
          Place Order
        </button>
      </form>
    </div>
  );
}
