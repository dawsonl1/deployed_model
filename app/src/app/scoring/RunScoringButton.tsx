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
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 max-w-lg space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Manually trigger the pipeline to retrain models and score all orders.
        This calls the Render deploy hook.
      </p>
      <button
        onClick={triggerScoring}
        disabled={status === "loading"}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "loading" ? "Running..." : "Run Scoring Now"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
