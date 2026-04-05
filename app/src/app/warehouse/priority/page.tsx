import { createClient } from "@/lib/supabase/server";

export default async function PriorityQueuePage() {
  const supabase = await createClient();

  // Get fraud predictions joined with orders and customers
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fraud Risk Priority Queue</h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
        Orders ranked by predicted fraud probability. The ML pipeline scores all
        orders nightly using the best-performing model. High-probability orders
        should be reviewed before fulfillment.
      </p>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th className="text-left px-4 py-2">Order</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">Fraud Prob</th>
              <th className="text-center px-4 py-2">Predicted</th>
              <th className="text-left px-4 py-2">Model</th>
            </tr>
          </thead>
          <tbody>
            {predictions?.map((p: any) => {
              const prob = parseFloat(p.fraud_probability);
              const order = p.orders;
              return (
                <tr key={p.order_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 font-medium">#{p.order_id}</td>
                  <td className="px-4 py-2">{order?.customers?.full_name}</td>
                  <td className="px-4 py-2">{order ? new Date(order.order_datetime).toLocaleDateString() : ""}</td>
                  <td className="px-4 py-2 text-right">${order ? parseFloat(order.order_total).toFixed(2) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={prob > 0.5 ? "text-red-600 font-semibold" : prob > 0.3 ? "text-amber-600" : "text-green-600"}>
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {p.predicted_fraud ? (
                      <span className="inline-block px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Fraud</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{p.model_name}</td>
                </tr>
              );
            })}
            {(!predictions || predictions.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No predictions yet. Run scoring to generate predictions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {predictions && predictions.length > 0 && (
        <p className="text-xs text-gray-400">
          Last scored: {new Date(predictions[0].prediction_timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
