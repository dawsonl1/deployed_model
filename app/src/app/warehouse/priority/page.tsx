import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";
import ScoringTrigger from "./ScoringTrigger";
import { fulfillAndReport } from "./actions";
import ReviewButtons from "./ReviewButtons";

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
        ip_country,
        fulfilled,
        is_fraud_known,
        customer_id,
        customers!inner (
          full_name
        )
      )
    `)
    .order("fraud_probability", { ascending: false });

  // Split into actionable vs already reviewed
  const needsReview = scoredOrders?.filter(
    (p: any) => !p.orders.fulfilled && !p.orders.is_fraud_known
  ) ?? [];
  const alreadyReviewed = scoredOrders?.filter(
    (p: any) => p.orders.fulfilled && p.orders.is_fraud_known
  ) ?? [];

  // Get unfulfilled orders WITHOUT predictions (unscored)
  const { data: allUnfulfilled } = await supabase
    .from("orders")
    .select(`
      order_id,
      order_datetime,
      order_total,
      payment_method,
      device_type,
      ip_country,
      customer_id,
      customers!inner (
        full_name
      )
    `)
    .eq("fulfilled", false)
    .order("order_datetime", { ascending: false });

  const scoredIds = new Set(scoredOrders?.map((p: any) => p.order_id) ?? []);
  const unscoredOrders = allUnfulfilled?.filter((o: any) => !scoredIds.has(o.order_id)) ?? [];

  // Stats
  const highRisk = needsReview.filter((p: any) => parseFloat(p.fraud_probability) > 0.5).length;
  const medRisk = needsReview.filter((p: any) => {
    const prob = parseFloat(p.fraud_probability);
    return prob > 0.3 && prob <= 0.5;
  }).length;

  // Training pool accuracy
  const correct = alreadyReviewed.filter((p: any) => p.orders.is_fraud_known && (p.orders.fulfilled) && (Boolean(p.predicted_fraud) === Boolean(p.orders.is_fraud))).length;
  const reviewedTotal = alreadyReviewed.length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fraud Review Queue</h1>
        <p className="page-desc">
          Review unfulfilled orders ranked by fraud probability. Label each as fraud or
          legitimate — reviewed orders enter the training pool for the next nightly retrain.
        </p>
      </div>

      {/* Scoring trigger */}
      <div className="mb-5">
        <ScoringTrigger unscoredCount={unscoredOrders.length} />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
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
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <div>
            <p className="metric-label">To Review</p>
            <p className="text-lg font-bold">{needsReview.length}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <div>
            <p className="metric-label">Reviewed</p>
            <p className="text-lg font-bold">
              {reviewedTotal}
              {reviewedTotal > 0 && (
                <span className="text-xs font-normal ml-1" style={{ color: "var(--muted)" }}>
                  ({Math.round(correct / reviewedTotal * 100)}% match)
                </span>
              )}
            </p>
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
                  <th className="text-left">Country</th>
                  <th className="text-right">Total</th>
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
                    <td>{o.ip_country}</td>
                    <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                      ${parseFloat(o.order_total).toFixed(2)}
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

      {/* Needs review — scored but not yet labeled */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--danger)" }}>
          Needs Review — Ranked by Fraud Probability ({needsReview.length})
        </h2>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-center w-14">Rank</th>
                <th className="text-left">Order</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Date</th>
                <th className="text-left">Payment</th>
                <th className="text-left">Country</th>
                <th className="text-right">Total</th>
                <th className="text-right">Fraud Prob</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsReview.map((p: any, index: number) => {
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
                    <td className="capitalize">{order?.payment_method}</td>
                    <td>{order?.ip_country}</td>
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
                      <ReviewButtons orderId={p.order_id} onReport={fulfillAndReport} />
                    </td>
                  </tr>
                );
              })}
              {needsReview.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8" style={{ color: "var(--muted)" }}>
                    No orders to review. {unscoredOrders.length > 0 ? "Run scoring first." : "All caught up."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recently reviewed — training pool */}
      {alreadyReviewed.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--success)" }}>
            Reviewed — In Training Pool ({alreadyReviewed.length})
          </h2>
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
                {alreadyReviewed.slice(0, 20).map((p: any) => {
                  const order = p.orders;
                  const match = Boolean(order.is_fraud) === Boolean(p.predicted_fraud);
                  return (
                    <tr key={p.order_id}>
                      <td className="font-medium">#{p.order_id}</td>
                      <td>{order?.customers?.full_name}</td>
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
          {alreadyReviewed.length > 20 && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Showing 20 of {alreadyReviewed.length} reviewed orders.
            </p>
          )}

          {needsReview.length > 0 && (
            <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
              Last scored: <LocalDate date={needsReview[0].prediction_timestamp} showTime />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
