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
    .select("customer_id, full_name, email, customer_segment, loyalty_tier")
    .order("full_name")
    .limit(50);

  if (query) {
    customerQuery = customerQuery.ilike("full_name", `%${query}%`);
  }

  const { data: customers } = await customerQuery;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Select Customer</h1>
        <p className="page-desc">
          Choose a customer to act as. This sets the context for orders, dashboard, and history.
        </p>
      </div>

      <form method="get" className="flex gap-2 max-w-sm mb-5">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name..."
          className="input flex-1"
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Search
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Segment</th>
              <th className="text-left">Tier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.customer_id}>
                <td className="font-medium">{c.full_name}</td>
                <td style={{ color: "var(--muted)" }}>{c.email}</td>
                <td>
                  <span className="badge badge-success">{c.customer_segment ?? "—"}</span>
                </td>
                <td>
                  <span className="badge badge-warning">{c.loyalty_tier ?? "—"}</span>
                </td>
                <td className="text-right">
                  <form action={selectCustomer}>
                    <input type="hidden" name="customer_id" value={c.customer_id} />
                    <button type="submit" className="btn btn-primary btn-sm">
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
