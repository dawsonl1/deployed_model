import { createClient } from "@/lib/supabase/server";
import RunScoringButton from "./RunScoringButton";
import MetricsTable from "./MetricsTable";

export default async function ScoringPage() {
  const supabase = await createClient();

  // Get current champion
  const { data: champion } = await supabase
    .from("model_registry")
    .select("*")
    .eq("is_champion", true)
    .single();

  // Get recent metrics log
  const { data: recentMetrics } = await supabase
    .from("metrics_log")
    .select("*")
    .order("trained_at", { ascending: false })
    .limit(20);

  // Get prediction count
  const { count: predictionCount } = await supabase
    .from("order_predictions_fraud")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scoring & Pipeline Status</h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
        The ML pipeline runs nightly on Render. It trains all candidate models,
        selects the best performer as champion, and scores all orders.
      </p>

      <RunScoringButton />

      {/* Champion Model */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Current Champion</h2>
        {champion ? (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 max-w-lg">
            <p className="font-semibold text-lg">{champion.model_name}</p>
            <p className="text-sm text-gray-500">v{champion.model_version} &middot; Trained {new Date(champion.trained_at).toLocaleString()}</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-500">F1</p>
                <p className="font-mono font-semibold">{parseFloat(champion.f1).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PR-AUC</p>
                <p className="font-mono font-semibold">{parseFloat(champion.pr_auc).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ROC-AUC</p>
                <p className="font-mono font-semibold">{parseFloat(champion.roc_auc).toFixed(4)}</p>
              </div>
            </div>
            {champion.notes && <p className="text-xs text-gray-400 mt-2">{champion.notes}</p>}
          </div>
        ) : (
          <p className="text-gray-500">No champion model yet. Run the pipeline to train models.</p>
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Orders with predictions: {predictionCount ?? 0}
      </div>

      {/* Recent Training Runs */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Recent Training Runs</h2>
        {recentMetrics && recentMetrics.length > 0 ? (
          <MetricsTable metrics={recentMetrics} />
        ) : (
          <p className="text-gray-500">No training runs yet.</p>
        )}
      </div>
    </div>
  );
}
