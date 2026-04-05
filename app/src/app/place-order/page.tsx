import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function submitOrder(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();

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
      is_fraud_known: false,
      fulfilled: false,
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

  // Group by category
  const categories = new Map<string, typeof products>();
  products?.forEach((p) => {
    if (!categories.has(p.category)) categories.set(p.category, []);
    categories.get(p.category)!.push(p);
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Place Order</h1>
        <p className="page-desc">
          Select products and quantities. Shipping ($9.99) and tax (8%) are added automatically.
        </p>
      </div>

      <form action={submitOrder}>
        {[...categories.entries()].map(([category, items]) => (
          <div key={category} className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              {category}
            </h2>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Product</th>
                    <th className="text-right">Price</th>
                    <th className="text-right w-20">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((p) => (
                    <tr key={p.product_id}>
                      <td className="font-medium">
                        {p.product_name}
                        <input type="hidden" name="product_id" value={p.product_id} />
                      </td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        ${parseFloat(p.price).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          name="quantity"
                          defaultValue={0}
                          min={0}
                          max={99}
                          className="input w-16 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <button type="submit" className="btn btn-primary">
          Place Order
        </button>
      </form>
    </div>
  );
}
