import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();

  // Get latest training run timestamp
  const { data: latestTraining } = await supabase
    .from("metrics_log")
    .select("trained_at")
    .order("trained_at", { ascending: false })
    .limit(1);

  const lastTrainedAt = latestTraining?.[0]?.trained_at ?? null;

  // Get all reviewed orders with predictions
  const { data: reviewed, count: totalCount } = await supabase
    .from("order_predictions_fraud")
    .select(`
      order_id,
      fraud_probability,
      predicted_fraud,
      model_name,
      prediction_timestamp,
      orders!inner (
        order_datetime,
        order_total,
        payment_method,
        ip_country,
        is_fraud,
        is_fraud_known,
        fulfilled,
        customer_id,
        customers!inner ( full_name )
      )
    `, { count: "exact" })
    .order("prediction_timestamp", { ascending: false })
    .range(offset, offset + perPage - 1);

  const trainingPool = reviewed?.filter(
    (p: any) => p.orders.fulfilled && p.orders.is_fraud_known
  ) ?? [];

  // Split into pending inclusion vs already trained on
  const pending = trainingPool.filter((p: any) => {
    if (!lastTrainedAt) return true; // no training run yet = all pending
    // Order was reviewed after the last training run
    return new Date(p.prediction_timestamp) > new Date(lastTrainedAt);
  });

  const trained = trainingPool.filter((p: any) => {
    if (!lastTrainedAt) return false;
    return new Date(p.prediction_timestamp) <= new Date(lastTrainedAt);
  });

  // Accuracy stats
  const allCorrect = trainingPool.filter(
    (p: any) => p.predicted_fraud === p.orders.is_fraud
  ).length;
  const totalPool = trainingPool.length;
  const totalPages = Math.ceil((totalCount ?? 0) / perPage);

  function renderRow(p: any) {
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
        <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
          ${parseFloat(order.order_total).toFixed(2)}
        </td>
        <td className="text-center">
          {order.is_fraud
            ? <span className="badge badge-danger">Fraud</span>
            : <span className="badge badge-success">Legit</span>}
        </td>
        <td className="text-center">
          {p.predicted_fraud
            ? <span className="badge badge-danger">Fraud</span>
            : <span className="badge badge-success">OK</span>}
        </td>
        <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
          <span style={{
            color: prob > 0.5 ? "var(--danger)" : prob > 0.3 ? "var(--warning)" : "var(--success)",
            fontWeight: 600,
          }}>
            {(prob * 100).toFixed(1)}%
          </span>
        </td>
        <td className="text-center">
          {match
            ? <span style={{ color: "var(--success)", fontSize: "1.1rem" }}>&#10003;</span>
            : <span style={{ color: "var(--danger)", fontSize: "1.1rem" }}>&#10007;</span>}
        </td>
      </tr>
    );
  }

  const tableHead = (
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
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">Training Pool</h1>
        </div>
        <p className="page-desc">
          Orders reviewed through the Fraud Review Queue. Pending orders will be included
          in the next nightly retrain. Already-trained orders have been used in at least one
          model training run.
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Pending Inclusion</p>
            <p className="text-lg font-bold">{pending.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <div>
            <p className="metric-label">Already Trained On</p>
            <p className="text-lg font-bold">{trained.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <div>
            <p className="metric-label">Total in Pool</p>
            <p className="text-lg font-bold">{totalCount ?? 0}</p>
          </div>
        </div>
        {totalPool > 0 && (
          <div className="card p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--muted)" }} />
            <div>
              <p className="metric-label">Model Accuracy</p>
              <p className="text-lg font-bold">{Math.round(allCorrect / totalPool * 100)}%</p>
            </div>
          </div>
        )}
      </div>

      {lastTrainedAt && (
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          Last training run: <LocalDate date={lastTrainedAt} showTime />
        </p>
      )}

      {/* Pending inclusion */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--warning)" }}>
            Pending — Will be included in next retrain ({pending.length})
          </h2>
          <div className="card overflow-hidden" style={{ borderColor: "var(--warning)" }}>
            <table className="data-table">
              {tableHead}
              <tbody>
                {pending.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Already trained on */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--success)" }}>
          Already Trained On ({trained.length})
        </h2>
        {trained.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="data-table">
              {tableHead}
              <tbody>
                {trained.map(renderRow)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
            {pending.length > 0
              ? "These orders will move here after the next nightly retrain."
              : "No reviewed orders yet. Use the Fraud Review Queue to label orders."}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <a
            href={page > 1 ? `?page=${page - 1}` : undefined}
            className={`btn btn-outline btn-sm ${page <= 1 ? "opacity-30 pointer-events-none" : ""}`}
          >
            Previous
          </a>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page} of {totalPages}
          </span>
          <a
            href={page < totalPages ? `?page=${page + 1}` : undefined}
            className={`btn btn-outline btn-sm ${page >= totalPages ? "opacity-30 pointer-events-none" : ""}`}
          >
            Next
          </a>
        </div>
      )}
    </div>
  );
}
