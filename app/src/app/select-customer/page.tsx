import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function selectCustomer(formData: FormData) {
  "use server";
  const customerId = formData.get("customer_id") as string;
  if (!customerId) return;
  const cookieStore = await cookies();
  cookieStore.set("customer_id", customerId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/dashboard");
}

export default async function SelectCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const supabase = await createClient();

  let customerQuery = supabase
    .from("customers")
    .select("customer_id, full_name, email")
    .order("full_name")
    .limit(50);

  if (query) {
    customerQuery = customerQuery.ilike("full_name", `%${query}%`);
  }

  const { data: customers } = await customerQuery;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Select Customer</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Choose a customer to act as. No authentication required.
      </p>

      <form method="get" className="flex gap-2 max-w-md">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-medium"
        >
          Search
        </button>
      </form>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.customer_id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2">{c.customer_id}</td>
                <td className="px-4 py-2">{c.full_name}</td>
                <td className="px-4 py-2 text-gray-500">{c.email}</td>
                <td className="px-4 py-2">
                  <form action={selectCustomer}>
                    <input type="hidden" name="customer_id" value={c.customer_id} />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                    >
                      Select
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
