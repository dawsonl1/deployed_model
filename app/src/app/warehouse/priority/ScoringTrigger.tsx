"use client";

import { useState } from "react";

export default function ScoringTrigger({ unscoredCount }: { unscoredCount: number }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function triggerScoring() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/trigger-scoring", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Pipeline triggered. Predictions will appear in a few minutes.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to trigger scoring.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  return (
    <div
      className="card p-4 flex items-center justify-between gap-4"
      style={{
        borderColor: unscoredCount > 0 ? "var(--warning)" : "var(--border)",
        background: unscoredCount > 0 ? "var(--warning-soft)" : "var(--surface)",
      }}
    >
      <div>
        <p className="text-sm font-semibold">
          {unscoredCount > 0
            ? `${unscoredCount} order${unscoredCount > 1 ? "s" : ""} awaiting scoring`
            : "All orders are scored"}
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {unscoredCount > 0
            ? "Run the pipeline to generate fraud predictions for new orders."
            : "Predictions are up to date."}
        </p>
        {message && (
          <p className="text-xs mt-1" style={{ color: status === "error" ? "var(--danger)" : "var(--success)" }}>
            {message}
          </p>
        )}
      </div>
      <button
        onClick={triggerScoring}
        disabled={status === "loading"}
        className={`btn btn-sm shrink-0 ${unscoredCount > 0 ? "btn-primary" : "btn-outline"}`}
      >
        {status === "loading" ? "Triggering..." : "Run Scoring"}
      </button>
    </div>
  );
}
