import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QuantityStepper from "@/components/QuantityStepper";

async function submitAdminOrder(formData: FormData) {
  "use server";
  const customerId = formData.get("customer_id") as string;
  if (!customerId) return;

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

  const paymentMethod = (formData.get("payment_method") as string) || "card";
  const deviceType = (formData.get("device_type") as string) || "desktop";
  const ipCountry = (formData.get("ip_country") as string) || "US";

  const { data: order } = await supabase
    .from("orders")
    .insert({
      customer_id: parseInt(customerId),
      order_datetime: new Date().toISOString(),
      payment_method: paymentMethod,
      device_type: deviceType,
      ip_country: ipCountry,
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

  redirect(`/admin/place-order?success=1&order_id=${order?.order_id ?? ""}`);
}

export default async function AdminPlaceOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string; order_id?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const success = params.success === "1";
  const newOrderId = params.order_id || "";

  const supabase = await createClient();

  // Load customers for selector
  let customerQuery = supabase
    .from("customers")
    .select("customer_id, full_name, email")
    .order("full_name")
    .limit(250);

  const { data: customers } = await customerQuery;

  // Load products
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
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">Place Order on Behalf of Customer</h1>
        </div>
        <p className="page-desc">
          Create an order for any customer. Choose the customer, set order parameters,
          and select products below.
        </p>
      </div>

      {success && (
        <div
          className="card p-3 mb-5 text-sm font-medium"
          style={{ background: "var(--success-soft)", color: "var(--success)", borderColor: "var(--success)" }}
        >
          Order placed successfully.{newOrderId && <> Order ID: <strong>#{newOrderId}</strong></>}
        </div>
      )}

      <form action={submitAdminOrder}>
        {/* Customer + Order Params */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Customer
            </p>
            <select name="customer_id" required className="input w-full">
              <option value="">Select a customer...</option>
              {customers?.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Order Parameters
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>Payment</label>
                <select name="payment_method" className="input w-full">
                  <option value="card">Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>Device</label>
                <select name="device_type" className="input w-full">
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--muted)" }}>Country</label>
                <select name="ip_country" className="input w-full">
                  <option value="US">US</option>
                  <option value="CA">CA</option>
                  <option value="GB">GB</option>
                  <option value="NG">NG</option>
                  <option value="IN">IN</option>
                  <option value="BR">BR</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
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
                        <QuantityStepper name="quantity" />
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
