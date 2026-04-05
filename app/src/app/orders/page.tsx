import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;
  if (!customerId) redirect("/select-customer");

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("order_id, order_datetime, order_total, payment_method, is_fraud")
    .eq("customer_id", parseInt(customerId))
    .order("order_datetime", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order History</h1>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th className="text-left px-4 py-2">Order ID</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Payment</th>
              <th className="text-right px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.order_id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2">
                  <Link href={`/orders/${o.order_id}`} className="text-blue-600 hover:underline">
                    #{o.order_id}
                  </Link>
                </td>
                <td className="px-4 py-2"><LocalDate date={o.order_datetime} /></td>
                <td className="px-4 py-2">{o.payment_method}</td>
                <td className="px-4 py-2 text-right">${parseFloat(o.order_total).toFixed(2)}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
