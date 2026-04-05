import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    .select("order_id, order_datetime, order_total, is_fraud")
    .eq("customer_id", parseInt(customerId))
    .order("order_datetime", { ascending: false });

  const totalOrders = orders?.length ?? 0;
  const totalSpend = orders?.reduce((sum, o) => sum + parseFloat(o.order_total), 0) ?? 0;
  const recentOrders = orders?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customer Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">Customer</p>
          <p className="font-semibold">{customer.full_name}</p>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">Total Spend</p>
          <p className="text-2xl font-bold">${totalSpend.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="text-left px-4 py-2">Order ID</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.order_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">
                    <Link href={`/orders/${o.order_id}`} className="text-blue-600 hover:underline">
                      #{o.order_id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{new Date(o.order_datetime).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">${parseFloat(o.order_total).toFixed(2)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
