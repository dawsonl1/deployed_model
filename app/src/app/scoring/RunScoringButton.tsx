"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function RunScoringButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "triggering" | "waiting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialMetricsRef = useRef(0);

  const cleanup = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollingRef.current = null;
    timerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // Fetch initial state on mount
  useEffect(() => {
    fetch("/api/training-status")
      .then((r) => r.json())
      .then((data) => {
        initialMetricsRef.current = data.totalMetricsRows;
      })
      .catch(() => {});
  }, []);

  async function triggerTraining() {
    setPhase("triggering");
    setMessage("");
    setElapsed(0);

    // Snapshot current metrics count
    try {
      const statusRes = await fetch("/api/training-status");
      const status = await statusRes.json();
      initialMetricsRef.current = status.totalMetricsRows;
    } catch {}

    try {
      const res = await fetch("/api/trigger-training", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setMessage(data.error || "Failed to trigger training.");
        return;
      }

      setPhase("waiting");
      setMessage("Full pipeline running — training all models...");

      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Poll for new metrics (8 models = 8 new rows in metrics_log)
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch("/api/training-status");
          const status = await statusRes.json();

          if (status.totalMetricsRows > initialMetricsRef.current) {
            cleanup();
            const newModels = status.totalMetricsRows - initialMetricsRef.current;
            setPhase("done");
            setMessage(
              `Training complete. ${newModels} models evaluated. Champion: ${status.championName ?? "unknown"}.`
            );
            router.refresh();
          }
        } catch {}
      }, 15000);

      // Timeout after 8 minutes (training takes longer than inference)
      setTimeout(() => {
        if (pollingRef.current) {
          cleanup();
          setPhase("error");
          setMessage("Pipeline is taking longer than expected. Check GitHub Actions for status.");
        }
      }, 480000);
    } catch {
      setPhase("error");
      setMessage("Network error. Check your connection.");
    }
  }

  return (
    <div className="card p-4">
      <p className="metric-label">Full Pipeline</p>

      {phase === "idle" && (
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Retrain all 8 models, select champion, and score unfulfilled orders.
        </p>
      )}

      {phase === "triggering" && (
        <p className="text-xs mb-3" style={{ color: "var(--accent)" }}>
          Sending request to GitHub Actions...
        </p>
      )}

      {phase === "waiting" && (
        <p className="text-xs mb-3" style={{ color: "var(--accent)" }}>
          Training models... {elapsed}s elapsed. Page will auto-refresh when done.
        </p>
      )}

      {phase === "done" && (
        <p className="text-xs mb-3" style={{ color: "var(--success)" }}>
          {message}
        </p>
      )}

      {phase === "error" && (
        <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
          {message}
        </p>
      )}

      <button
        onClick={triggerTraining}
        disabled={phase === "triggering" || phase === "waiting"}
        className="btn btn-primary w-full"
      >
        {phase === "triggering"
          ? "Sending..."
          : phase === "waiting"
          ? `Training (${elapsed}s)`
          : "Run Full Pipeline"}
      </button>
    </div>
  );
}
