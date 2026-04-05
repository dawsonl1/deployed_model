"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ScoringTrigger({ unscoredCount }: { unscoredCount: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "triggering" | "waiting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialUnscoredRef = useRef(unscoredCount);

  const cleanup = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollingRef.current = null;
    timerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  async function triggerScoring() {
    setPhase("triggering");
    setMessage("");
    setElapsed(0);
    initialUnscoredRef.current = unscoredCount;

    try {
      const res = await fetch("/api/trigger-scoring", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setMessage(data.error || "Failed to trigger scoring.");
        return;
      }

      // Pipeline triggered — start polling
      setPhase("waiting");
      setMessage("Pipeline running on GitHub Actions...");

      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Poll for completion every 10s
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch("/api/scoring-status");
          const status = await statusRes.json();

          // If unscored count dropped, scoring is done
          if (status.unscoredUnfulfilled < initialUnscoredRef.current) {
            cleanup();
            setPhase("done");
            const scored = initialUnscoredRef.current - status.unscoredUnfulfilled;
            setMessage(`Scoring complete. ${scored} order${scored !== 1 ? "s" : ""} scored.`);
            // Refresh page data
            router.refresh();
          }
        } catch {
          // Ignore polling errors, keep trying
        }
      }, 10000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (pollingRef.current) {
          cleanup();
          setPhase("error");
          setMessage("Pipeline is taking longer than expected. Check GitHub Actions for status.");
        }
      }, 300000);

    } catch {
      setPhase("error");
      setMessage("Network error. Check your connection.");
    }
  }

  const hasUnscored = unscoredCount > 0;

  return (
    <div
      className="card p-4 flex items-center justify-between gap-4"
      style={{
        borderColor: hasUnscored ? "var(--warning)" : "var(--border)",
        background: hasUnscored ? "var(--warning-soft)" : "var(--surface)",
      }}
    >
      <div>
        <p className="text-sm font-semibold">
          {hasUnscored
            ? `${unscoredCount} order${unscoredCount > 1 ? "s" : ""} awaiting scoring`
            : "All orders are scored"}
        </p>

        {phase === "idle" && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {hasUnscored
              ? "Run the pipeline to generate fraud predictions for new orders."
              : "Predictions are up to date."}
          </p>
        )}

        {phase === "triggering" && (
          <p className="text-xs" style={{ color: "var(--accent)" }}>
            Sending request to GitHub Actions...
          </p>
        )}

        {phase === "waiting" && (
          <p className="text-xs" style={{ color: "var(--accent)" }}>
            Pipeline running... {elapsed}s elapsed. Page will auto-refresh when done.
          </p>
        )}

        {phase === "done" && (
          <p className="text-xs" style={{ color: "var(--success)" }}>
            {message}
          </p>
        )}

        {phase === "error" && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {message}
          </p>
        )}
      </div>

      <button
        onClick={triggerScoring}
        disabled={phase === "triggering" || phase === "waiting"}
        className={`btn btn-sm shrink-0 ${hasUnscored && phase === "idle" ? "btn-primary" : "btn-outline"}`}
      >
        {phase === "triggering" ? "Sending..." :
         phase === "waiting" ? `Running (${elapsed}s)` :
         "Run Scoring"}
      </button>
    </div>
  );
}
