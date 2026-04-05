import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const filter = params.filter || "all";
  const search = params.q || "";
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();

  // Get latest training timestamp
  const { data: latestTraining } = await supabase
    .from("metrics_log")
    .select("trained_at")
    .order("trained_at", { ascending: false })
    .limit(1);
  const lastTrainedAt = latestTraining?.[0]?.trained_at ?? null;

  // Build query
  let query = supabase
    .from("orders")
    .select(`
      order_id,
      order_datetime,
      order_total,
      payment_method,
      device_type,
      ip_country,
      is_fraud,
      is_fraud_known,
      fulfilled,
      customer_id,
      customers!inner ( full_name )
    `, { count: "exact" })
    .order("order_id", { ascending: false });

  // Apply filters
  if (filter === "fulfilled") query = query.eq("fulfilled", true);
  if (filter === "unfulfilled") query = query.eq("fulfilled", false);
  if (filter === "fraud") query = query.eq("is_fraud", true).eq("is_fraud_known", true);
  if (filter === "labeled") query = query.eq("is_fraud_known", true);
  if (filter === "unlabeled") query = query.eq("is_fraud_known", false);

  // Search by order ID
  if (search) {
    const searchNum = parseInt(search);
    if (!isNaN(searchNum)) {
      query = query.eq("order_id", searchNum);
    }
  }

  const { data: orders, count: totalCount } = await query.range(offset, offset + perPage - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / perPage);

  // Summary stats (one query each, cached by Supabase)
  const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const { count: fulfilledCount } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("fulfilled", true);
  const { count: unfulfilledCount } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("fulfilled", false);
  const { count: knownFraudCount } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("is_fraud", true).eq("is_fraud_known", true);

  const filters = [
    { key: "all", label: "All", count: totalOrders },
    { key: "fulfilled", label: "Fulfilled", count: fulfilledCount },
    { key: "unfulfilled", label: "Unfulfilled", count: unfulfilledCount },
    { key: "fraud", label: "Known Fraud", count: knownFraudCount },
    { key: "labeled", label: "Labeled", count: null },
    { key: "unlabeled", label: "Unlabeled", count: null },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">All Orders</h1>
        </div>
        <p className="page-desc">
          Browse all orders in the database — seed data and new orders.
          Filter by status to understand the training and inference pools.
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <div>
            <p className="metric-label">Total</p>
            <p className="text-lg font-bold">{totalOrders ?? 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <div>
            <p className="metric-label">Fulfilled</p>
            <p className="text-lg font-bold">{fulfilledCount ?? 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Unfulfilled</p>
            <p className="text-lg font-bold">{unfulfilledCount ?? 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
          <div>
            <p className="metric-label">Known Fraud</p>
            <p className="text-lg font-bold">{knownFraudCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`?filter=${f.key}${search ? `&q=${search}` : ""}`}
            className="btn btn-sm"
            style={filter === f.key
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            {f.label}
            {f.count !== null && (
              <span className="ml-1 opacity-60">{f.count}</span>
            )}
          </a>
        ))}
        <form method="get" className="flex gap-1 ml-auto">
          <input type="hidden" name="filter" value={filter} />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by order ID..."
            className="input text-xs w-40"
          />
          <button type="submit" className="btn btn-primary btn-sm">Go</button>
        </form>
      </div>

      {lastTrainedAt && (
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Last training run: <LocalDate date={lastTrainedAt} showTime /> &middot;
          Training data = fulfilled + labeled orders
        </p>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Date</th>
              <th className="text-left">Payment</th>
              <th className="text-left">Device</th>
              <th className="text-left">Country</th>
              <th className="text-right">Total</th>
              <th className="text-center">Fulfilled</th>
              <th className="text-center">Fraud Label</th>
              <th className="text-center">Role</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o: any) => {
              const isSeed = o.fulfilled && o.is_fraud_known;
              const isTrainingData = o.fulfilled && o.is_fraud_known;
              const isInferenceTarget = !o.fulfilled;

              return (
                <tr key={o.order_id}>
                  <td className="font-medium">#{o.order_id}</td>
                  <td>{o.customers?.full_name}</td>
                  <td style={{ color: "var(--muted)" }}><LocalDate date={o.order_datetime} /></td>
                  <td className="capitalize">{o.payment_method}</td>
                  <td className="capitalize">{o.device_type}</td>
                  <td>{o.ip_country}</td>
                  <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                    ${parseFloat(o.order_total).toFixed(2)}
                  </td>
                  <td className="text-center">
                    {o.fulfilled
                      ? <span className="badge badge-success">Yes</span>
                      : <span className="badge badge-warning">No</span>}
                  </td>
                  <td className="text-center">
                    {o.is_fraud_known ? (
                      o.is_fraud
                        ? <span className="badge badge-danger">Fraud</span>
                        : <span className="badge badge-success">Legit</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Unknown</span>
                    )}
                  </td>
                  <td className="text-center">
                    {isTrainingData && (
                      <span className="text-xs font-medium" style={{ color: "var(--success)" }}>Training</span>
                    )}
                    {isInferenceTarget && (
                      <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Inference</span>
                    )}
                    {!isTrainingData && !isInferenceTarget && (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={10} className="text-center py-8" style={{ color: "var(--muted)" }}>
                  No orders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <a
            href={page > 1 ? `?page=${page - 1}&filter=${filter}${search ? `&q=${search}` : ""}` : undefined}
            className={`btn btn-outline btn-sm ${page <= 1 ? "opacity-30 pointer-events-none" : ""}`}
          >
            Previous
          </a>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page} of {totalPages} ({totalCount?.toLocaleString()} orders)
          </span>
          <a
            href={page < totalPages ? `?page=${page + 1}&filter=${filter}${search ? `&q=${search}` : ""}` : undefined}
            className={`btn btn-outline btn-sm ${page >= totalPages ? "opacity-30 pointer-events-none" : ""}`}
          >
            Next
          </a>
        </div>
      )}
    </div>
  );
}
