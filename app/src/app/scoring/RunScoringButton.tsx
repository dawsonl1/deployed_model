"use client";

import { useState } from "react";

export default function RunScoringButton() {
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
        setMessage(data.message || "Scoring triggered successfully.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to trigger scoring.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Check your connection.");
    }
  }

  return (
    <div className="card p-4">
      <p className="metric-label">Manual Trigger</p>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Retrain models and score all orders via GitHub Actions.
      </p>
      <button
        onClick={triggerScoring}
        disabled={status === "loading"}
        className="btn btn-primary w-full"
      >
        {status === "loading" ? "Triggering..." : "Run Scoring Now"}
      </button>
      {message && (
        <p
          className="text-xs mt-2"
          style={{ color: status === "error" ? "var(--danger)" : "var(--success)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
