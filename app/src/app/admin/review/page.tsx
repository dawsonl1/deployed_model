import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; section?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const section = params.section || "pending";
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();

  // Get champion info (accuracy on seed data)
  const { data: champion } = await supabase
    .from("model_registry")
    .select("model_name, f1, pr_auc, roc_auc, trained_at")
    .eq("is_champion", true)
    .limit(1);
  const champ = champion?.[0] ?? null;
  const lastTrainedAt = champ?.trained_at ?? null;

  // Count ALL training pool orders (fulfilled + labeled) — this includes seed data
  const { count: totalPoolCount } = await supabase
    .from("orders")
    .select("order_id", { count: "exact", head: true })
    .eq("fulfilled", true)
    .eq("is_fraud_known", true);

  // Count known fraud in training pool
  const { count: fraudCount } = await supabase
    .from("orders")
    .select("order_id", { count: "exact", head: true })
    .eq("fulfilled", true)
    .eq("is_fraud_known", true)
    .eq("is_fraud", true);

  // Count app-reviewed orders (have predictions + fulfilled + labeled)
  const { data: reviewedPredictions } = await supabase
    .from("order_predictions_fraud")
    .select(`
      order_id,
      predicted_fraud,
      prediction_timestamp,
      orders!inner ( fulfilled, is_fraud_known, is_fraud )
    `);

  const reviewedPool = reviewedPredictions?.filter(
    (p: any) => p.orders.fulfilled && p.orders.is_fraud_known
  ) ?? [];

  const pendingOrders = reviewedPool.filter((p: any) => {
    if (!lastTrainedAt) return true;
    return new Date(p.prediction_timestamp) > new Date(lastTrainedAt);
  });

  const reviewedCorrect = reviewedPool.filter(
    (p: any) => p.predicted_fraud === p.orders.is_fraud
  ).length;

  // Paginated query for the selected section
  let sectionData: any[] = [];
  let sectionTotal = 0;

  if (section === "pending") {
    // Pending = app-reviewed orders not yet in a training run
    // These have predictions, are fulfilled+labeled, and prediction_timestamp > last trained
    const allPending = reviewedPool.filter((p: any) => {
      if (!lastTrainedAt) return true;
      return new Date(p.prediction_timestamp) > new Date(lastTrainedAt);
    });
    sectionTotal = allPending.length;
    // Get full details for the page slice
    const pendingIds = allPending.slice(offset, offset + perPage).map((p: any) => p.order_id);
    if (pendingIds.length > 0) {
      const { data } = await supabase
        .from("order_predictions_fraud")
        .select(`
          order_id, fraud_probability, predicted_fraud, model_name, prediction_timestamp,
          orders!inner ( order_datetime, order_total, payment_method, ip_country, is_fraud, is_fraud_known, fulfilled, customer_id, customers!inner ( full_name ) )
        `)
        .in("order_id", pendingIds)
        .order("fraud_probability", { ascending: false });
      sectionData = data ?? [];
    }
  } else {
    // All training data (fulfilled + labeled), paginated directly from orders
    const { data, count } = await supabase
      .from("orders")
      .select(`
        order_id, order_datetime, order_total, payment_method, ip_country,
        is_fraud, is_fraud_known, fulfilled,
        customer_id, customers!inner ( full_name )
      `, { count: "exact" })
      .eq("fulfilled", true)
      .eq("is_fraud_known", true)
      .order("order_id", { ascending: false })
      .range(offset, offset + perPage - 1);
    sectionData = data ?? [];
    sectionTotal = count ?? 0;
  }

  const totalPages = Math.ceil(sectionTotal / perPage);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">Training Pool</h1>
        </div>
        <p className="page-desc">
          All data used to train the fraud detection model. Includes the original 5,000
          seed orders plus any new orders reviewed through the Fraud Review Queue.
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <div>
            <p className="metric-label">Total Training Data</p>
            <p className="text-lg font-bold">{(totalPoolCount ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
          <div>
            <p className="metric-label">Known Fraud</p>
            <p className="text-lg font-bold">{fraudCount ?? 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Pending Inclusion</p>
            <p className="text-lg font-bold">{pendingOrders.length}</p>
          </div>
        </div>
        {champ && (
          <div className="card p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
            <div>
              <p className="metric-label">Champion F1</p>
              <p className="text-lg font-bold">{parseFloat(champ.f1).toFixed(4)}</p>
            </div>
          </div>
        )}
        {champ && (
          <div className="card p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
            <div>
              <p className="metric-label">Champion PR-AUC</p>
              <p className="text-lg font-bold">{parseFloat(champ.pr_auc).toFixed(4)}</p>
            </div>
          </div>
        )}
        {reviewedPool.length > 0 && (
          <div className="card p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--muted)" }} />
            <div>
              <p className="metric-label">Review Accuracy</p>
              <p className="text-lg font-bold">{Math.round(reviewedCorrect / reviewedPool.length * 100)}%</p>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>{reviewedPool.length} reviewed</p>
            </div>
          </div>
        )}
      </div>

      {lastTrainedAt && (
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          Last training run: <LocalDate date={lastTrainedAt} showTime />
          {champ && <> &middot; Champion: {champ.model_name}</>}
        </p>
      )}

      {/* Section tabs */}
      <div className="flex gap-2 mb-4">
        <a
          href="?section=pending"
          className="btn btn-sm"
          style={section === "pending"
            ? { background: "var(--accent)", color: "#fff" }
            : { background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          Pending Inclusion ({pendingOrders.length})
        </a>
        <a
          href="?section=all"
          className="btn btn-sm"
          style={section === "all"
            ? { background: "var(--accent)", color: "#fff" }
            : { background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          All Training Data ({(totalPoolCount ?? 0).toLocaleString()})
        </a>
      </div>

      {/* Table */}
      {section === "pending" ? (
        // Pending section — shows predictions alongside actual
        sectionData.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Payment</th>
                  <th className="text-left">Country</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Actual</th>
                  <th className="text-center">Predicted</th>
                  <th className="text-right">Prob</th>
                  <th className="text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.map((p: any) => {
                  const order = p.orders;
                  const match = order.is_fraud === p.predicted_fraud;
                  const prob = parseFloat(p.fraud_probability);
                  return (
                    <tr key={p.order_id}>
                      <td className="font-medium">#{p.order_id}</td>
                      <td>{order.customers?.full_name}</td>
                      <td style={{ color: "var(--muted)" }}><LocalDate date={order.order_datetime} /></td>
                      <td className="capitalize">{order.payment_method}</td>
                      <td>{order.ip_country}</td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>${parseFloat(order.order_total).toFixed(2)}</td>
                      <td className="text-center">
                        {order.is_fraud ? <span className="badge badge-danger">Fraud</span> : <span className="badge badge-success">Legit</span>}
                      </td>
                      <td className="text-center">
                        {p.predicted_fraud ? <span className="badge badge-danger">Fraud</span> : <span className="badge badge-success">OK</span>}
                      </td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: prob > 0.5 ? "var(--danger)" : prob > 0.3 ? "var(--warning)" : "var(--success)", fontWeight: 600 }}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        {match ? <span style={{ color: "var(--success)", fontSize: "1.1rem" }}>&#10003;</span> : <span style={{ color: "var(--danger)", fontSize: "1.1rem" }}>&#10007;</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
            No orders pending inclusion. All reviewed orders have been included in a training run.
          </div>
        )
      ) : (
        // All training data section — orders only (no predictions for seed data)
        sectionData.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Payment</th>
                  <th className="text-left">Country</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Fraud Label</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.map((o: any) => (
                  <tr key={o.order_id}>
                    <td className="font-medium">#{o.order_id}</td>
                    <td>{o.customers?.full_name}</td>
                    <td style={{ color: "var(--muted)" }}><LocalDate date={o.order_datetime} /></td>
                    <td className="capitalize">{o.payment_method}</td>
                    <td>{o.ip_country}</td>
                    <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>${parseFloat(o.order_total).toFixed(2)}</td>
                    <td className="text-center">
                      {o.is_fraud ? <span className="badge badge-danger">Fraud</span> : <span className="badge badge-success">Legit</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
            No training data found.
          </div>
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <a
            href={page > 1 ? `?section=${section}&page=${page - 1}` : undefined}
            className={`btn btn-outline btn-sm ${page <= 1 ? "opacity-30 pointer-events-none" : ""}`}
          >
            Previous
          </a>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page} of {totalPages} ({sectionTotal.toLocaleString()} orders)
          </span>
          <a
            href={page < totalPages ? `?section=${section}&page=${page + 1}` : undefined}
            className={`btn btn-outline btn-sm ${page >= totalPages ? "opacity-30 pointer-events-none" : ""}`}
          >
            Next
          </a>
        </div>
      )}
    </div>
  );
}
