import { createClient } from "@/lib/supabase/server";
import RunScoringButton from "./RunScoringButton";
import MetricsTable from "./MetricsTable";
import { LocalDate } from "@/components/LocalDate";

export default async function ScoringPage() {
  const supabase = await createClient();

  const { data: champion } = await supabase
    .from("model_registry")
    .select("*")
    .eq("is_champion", true)
    .single();

  const { data: recentMetrics } = await supabase
    .from("metrics_log")
    .select("*")
    .order("trained_at", { ascending: false })
    .limit(200);

  const { count: predictionCount } = await supabase
    .from("order_predictions_fraud")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Models & Scoring</h1>
        <p className="page-desc">
          The pipeline trains 8 candidate models nightly, selects the best by PR-AUC,
          and scores all orders. You can also trigger a run manually.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Champion */}
        <div className="card p-5 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--success)" }}>
            Current Champion
          </p>
          {champion ? (
            <>
              <p className="text-lg font-bold">{champion.model_name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                v{champion.model_version} &middot; Trained <LocalDate date={champion.trained_at} showTime />
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="metric-label">F1 Score</p>
                  <p className="metric-value">{parseFloat(champion.f1).toFixed(4)}</p>
                </div>
                <div>
                  <p className="metric-label">PR-AUC</p>
                  <p className="metric-value">{parseFloat(champion.pr_auc).toFixed(4)}</p>
                </div>
                <div>
                  <p className="metric-label">ROC-AUC</p>
                  <p className="metric-value">{parseFloat(champion.roc_auc).toFixed(4)}</p>
                </div>
              </div>
              {champion.notes && (
                <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>{champion.notes}</p>
              )}
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>No champion yet. Run the pipeline to train models.</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <RunScoringButton />
          <div className="card p-4">
            <p className="metric-label">Orders Scored</p>
            <p className="metric-value">{predictionCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Training History */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
          Training History
        </h2>
        {recentMetrics && recentMetrics.length > 0 ? (
          <MetricsTable metrics={recentMetrics} />
        ) : (
          <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
            No training runs yet.
          </div>
        )}
      </div>
    </div>
  );
}
