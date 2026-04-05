import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "@/components/LocalDate";
import Link from "next/link";

export default async function PriorityQueuePage() {
  const supabase = await createClient();

  const { data: predictions } = await supabase
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
        customer_id,
        customers!inner (
          full_name
        )
      )
    `)
    .order("fraud_probability", { ascending: false })
    .limit(50);

  const highRisk = predictions?.filter((p: any) => parseFloat(p.fraud_probability) > 0.5).length ?? 0;
  const medRisk = predictions?.filter((p: any) => {
    const prob = parseFloat(p.fraud_probability);
    return prob > 0.3 && prob <= 0.5;
  }).length ?? 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fraud Risk Priority Queue</h1>
        <p className="page-desc">
          Orders ranked by predicted fraud probability. High-risk orders should be
          manually reviewed before fulfillment.
        </p>
      </div>

      {predictions && predictions.length > 0 && (
        <div className="flex gap-3 mb-5">
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
              <p className="metric-label">Total Scored</p>
              <p className="text-lg font-bold">{predictions.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Date</th>
              <th className="text-right">Total</th>
              <th className="text-right">Fraud Prob</th>
              <th className="text-center">Status</th>
              <th className="text-left">Model</th>
            </tr>
          </thead>
          <tbody>
            {predictions?.map((p: any) => {
              const prob = parseFloat(p.fraud_probability);
              const order = p.orders;
              return (
                <tr key={p.order_id}>
                  <td className="font-medium">#{p.order_id}</td>
                  <td>{order?.customers?.full_name}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {order ? <LocalDate date={order.order_datetime} /> : ""}
                  </td>
                  <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                    ${order ? parseFloat(order.order_total).toFixed(2) : "—"}
                  </td>
                  <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: prob > 0.5 ? "var(--danger)" : prob > 0.3 ? "var(--warning)" : "var(--success)", fontWeight: 600 }}>
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
            {(!predictions || predictions.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: "var(--muted)" }}>
                  No predictions yet.{" "}
                  <Link href="/scoring" style={{ color: "var(--accent)" }}>Run scoring</Link>{" "}
                  to generate predictions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {predictions && predictions.length > 0 && (
        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
          Last scored: <LocalDate date={predictions[0].prediction_timestamp} showTime />
        </p>
      )}
    </div>
  );
}
