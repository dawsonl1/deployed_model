import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";
import ScoringTrigger from "./ScoringTrigger";

export default async function PriorityQueuePage() {
  const supabase = await createClient();

  // Get unfulfilled orders that HAVE predictions (scored)
  const { data: scoredOrders } = await supabase
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
        device_type,
        fulfilled,
        customer_id,
        customers!inner (
          full_name
        )
      )
    `)
    .order("fraud_probability", { ascending: false });

  // Filter to only unfulfilled
  const predictions = scoredOrders?.filter((p: any) => p.orders?.fulfilled === false) ?? [];

  // Get unfulfilled orders WITHOUT predictions (unscored)
  const { data: allUnfulfilled } = await supabase
    .from("orders")
    .select(`
      order_id,
      order_datetime,
      order_total,
      payment_method,
      device_type,
      customer_id,
      customers!inner (
        full_name
      )
    `)
    .eq("fulfilled", false)
    .order("order_datetime", { ascending: false });

  const scoredIds = new Set(predictions.map((p: any) => p.order_id));
  const unscoredOrders = allUnfulfilled?.filter((o: any) => !scoredIds.has(o.order_id)) ?? [];

  // Stats
  const highRisk = predictions.filter((p: any) => parseFloat(p.fraud_probability) > 0.5).length;
  const medRisk = predictions.filter((p: any) => {
    const prob = parseFloat(p.fraud_probability);
    return prob > 0.3 && prob <= 0.5;
  }).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fraud Risk Priority Queue</h1>
        <p className="page-desc">
          Unfulfilled orders only. Ranked by predicted fraud probability so high-risk
          orders can be reviewed before fulfillment.
        </p>
      </div>

      {/* Scoring trigger */}
      <div className="mb-5">
        <ScoringTrigger unscoredCount={unscoredOrders.length} />
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-5">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Unscored</p>
            <p className="text-lg font-bold">{unscoredOrders.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
          <div>
            <p className="metric-label">High Risk</p>
            <p className="text-lg font-bold">{highRisk}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
          <div>
            <p className="metric-label">Medium Risk</p>
            <p className="text-lg font-bold">{medRisk}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <div>
            <p className="metric-label">Scored</p>
            <p className="text-lg font-bold">{predictions.length}</p>
          </div>
        </div>
      </div>

      {/* Unscored orders */}
      {unscoredOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--warning)" }}>
            Awaiting Scoring ({unscoredOrders.length})
          </h2>
          <div className="card overflow-hidden" style={{ borderColor: "var(--warning)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Payment</th>
                  <th className="text-left">Device</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {unscoredOrders.slice(0, 20).map((o: any) => (
                  <tr key={o.order_id}>
                    <td className="font-medium">#{o.order_id}</td>
                    <td>{o.customers?.full_name}</td>
                    <td style={{ color: "var(--muted)" }}><LocalDate date={o.order_datetime} /></td>
                    <td className="capitalize">{o.payment_method}</td>
                    <td className="capitalize">{o.device_type}</td>
                    <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                      ${parseFloat(o.order_total).toFixed(2)}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-warning">Pending</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {unscoredOrders.length > 20 && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Showing 20 of {unscoredOrders.length} unscored orders.
            </p>
          )}
        </div>
      )}

      {/* Scored unfulfilled orders with rank */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
          Scored — Ranked by Fraud Probability
        </h2>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-center w-14">Rank</th>
                <th className="text-left">Order</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Date</th>
                <th className="text-right">Total</th>
                <th className="text-right">Fraud Prob</th>
                <th className="text-center">Predicted</th>
                <th className="text-left">Model</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p: any, index: number) => {
                const prob = parseFloat(p.fraud_probability);
                const order = p.orders;
                const rank = index + 1;
                return (
                  <tr key={p.order_id}>
                    <td className="text-center">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={{
                          background: rank <= 3 ? "var(--danger-soft)" : rank <= 10 ? "var(--warning-soft)" : "var(--surface-hover)",
                          color: rank <= 3 ? "var(--danger)" : rank <= 10 ? "var(--warning)" : "var(--muted)",
                        }}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="font-medium">#{p.order_id}</td>
                    <td>{order?.customers?.full_name}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {order ? <LocalDate date={order.order_datetime} /> : ""}
                    </td>
                    <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                      ${order ? parseFloat(order.order_total).toFixed(2) : "—"}
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
                      {p.predicted_fraud ? (
                        <span className="badge badge-danger">Fraud</span>
                      ) : (
                        <span className="badge badge-success">OK</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{p.model_name}</td>
                  </tr>
                );
              })}
              {predictions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: "var(--muted)" }}>
                    No scored unfulfilled orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {predictions.length > 0 && (
          <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
            Last scored: <LocalDate date={predictions[0].prediction_timestamp} showTime />
          </p>
        )}
      </div>
    </div>
  );
}
