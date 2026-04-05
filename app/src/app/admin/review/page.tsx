import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";
import { reportFraudStatus, fulfillOrder, fulfillAndReport } from "./actions";

export default async function ReviewPage() {
  const supabase = await createClient();

  // Unfulfilled orders with predictions (ready for review)
  const { data: scoredUnfulfilled } = await supabase
    .from("order_predictions_fraud")
    .select(`
      order_id,
      fraud_probability,
      predicted_fraud,
      model_name,
      orders!inner (
        order_datetime,
        order_total,
        payment_method,
        device_type,
        is_fraud,
        is_fraud_known,
        fulfilled,
        customer_id,
        customers!inner ( full_name )
      )
    `)
    .order("fraud_probability", { ascending: false });

  const needsReview = scoredUnfulfilled?.filter(
    (p: any) => !p.orders.fulfilled
  ) ?? [];

  const needsFraudLabel = needsReview.filter((p: any) => !p.orders.is_fraud_known);
  const labeledNotFulfilled = needsReview.filter((p: any) => p.orders.is_fraud_known && !p.orders.fulfilled);

  // Orders that have been fulfilled + labeled (ready for training)
  // These were recently reviewed (have predictions, meaning they came through the app)
  const { data: recentlyFulfilled } = await supabase
    .from("order_predictions_fraud")
    .select(`
      order_id,
      fraud_probability,
      predicted_fraud,
      orders!inner (
        order_datetime,
        order_total,
        is_fraud,
        is_fraud_known,
        fulfilled,
        customer_id,
        customers!inner ( full_name )
      )
    `)
    .order("fraud_probability", { ascending: false });

  const readyForTraining = recentlyFulfilled?.filter(
    (p: any) => p.orders.fulfilled && p.orders.is_fraud_known
  ) ?? [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">Order Review & Reporting</h1>
        </div>
        <p className="page-desc">
          Report whether orders were actually fraudulent. Once reported and fulfilled,
          they enter the training pool for the next nightly retrain.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
          <div>
            <p className="metric-label">Needs Label</p>
            <p className="text-lg font-bold">{needsFraudLabel.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Labeled, Unfulfilled</p>
            <p className="text-lg font-bold">{labeledNotFulfilled.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <div>
            <p className="metric-label">In Training Pool</p>
            <p className="text-lg font-bold">{readyForTraining.length}</p>
          </div>
        </div>
      </div>

      {/* Needs fraud label */}
      {needsFraudLabel.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--danger)" }}>
            Needs Fraud Determination ({needsFraudLabel.length})
          </h2>
          <div className="card overflow-hidden" style={{ borderColor: "var(--danger)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Predicted</th>
                  <th className="text-center">Report</th>
                </tr>
              </thead>
              <tbody>
                {needsFraudLabel.map((p: any) => {
                  const prob = parseFloat(p.fraud_probability);
                  const order = p.orders;
                  return (
                    <tr key={p.order_id}>
                      <td className="font-medium">#{p.order_id}</td>
                      <td>{order.customers?.full_name}</td>
                      <td style={{ color: "var(--muted)" }}><LocalDate date={order.order_datetime} /></td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        ${parseFloat(order.order_total).toFixed(2)}
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
                        <div className="flex items-center justify-center gap-1">
                          <form action={fulfillAndReport}>
                            <input type="hidden" name="order_id" value={p.order_id} />
                            <input type="hidden" name="is_fraud" value="true" />
                            <button type="submit" className="btn btn-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
                              Fraud
                            </button>
                          </form>
                          <form action={fulfillAndReport}>
                            <input type="hidden" name="order_id" value={p.order_id} />
                            <input type="hidden" name="is_fraud" value="false" />
                            <button type="submit" className="btn btn-sm" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid var(--success)" }}>
                              Legit
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labeled but not fulfilled */}
      {labeledNotFulfilled.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--warning)" }}>
            Labeled — Awaiting Fulfillment ({labeledNotFulfilled.length})
          </h2>
          <div className="card overflow-hidden" style={{ borderColor: "var(--warning)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Actual</th>
                  <th className="text-center">Predicted</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {labeledNotFulfilled.map((p: any) => {
                  const order = p.orders;
                  return (
                    <tr key={p.order_id}>
                      <td className="font-medium">#{p.order_id}</td>
                      <td>{order.customers?.full_name}</td>
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
                      <td className="text-center">
                        <form action={fulfillOrder}>
                          <input type="hidden" name="order_id" value={p.order_id} />
                          <button type="submit" className="btn btn-primary btn-sm">
                            Fulfill
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ready for training */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--success)" }}>
          In Training Pool — Added to Next Retrain ({readyForTraining.length})
        </h2>
        {readyForTraining.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Actual</th>
                  <th className="text-center">Predicted</th>
                  <th className="text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {readyForTraining.slice(0, 20).map((p: any) => {
                  const order = p.orders;
                  const match = order.is_fraud === p.predicted_fraud;
                  return (
                    <tr key={p.order_id}>
                      <td className="font-medium">#{p.order_id}</td>
                      <td>{order.customers?.full_name}</td>
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
                      <td className="text-center">
                        {match
                          ? <span style={{ color: "var(--success)" }}>&#10003;</span>
                          : <span style={{ color: "var(--danger)" }}>&#10007;</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
            No reviewed orders yet. Report fraud status above to build the training pool.
          </div>
        )}
      </div>
    </div>
  );
}
