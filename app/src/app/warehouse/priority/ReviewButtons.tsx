"use client";

import { useState, useTransition } from "react";

export default function ReviewButtons({
  orderId,
  onReport,
}: {
  orderId: number;
  onReport: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [reported, setReported] = useState<"fraud" | "legit" | null>(null);

  function handleClick(isFraud: boolean) {
    const fd = new FormData();
    fd.set("order_id", String(orderId));
    fd.set("is_fraud", String(isFraud));
    setReported(isFraud ? "fraud" : "legit");
    startTransition(() => onReport(fd));
  }

  if (reported) {
    return (
      <span
        className="text-xs font-semibold px-2 py-1 rounded"
        style={{
          color: reported === "fraud" ? "var(--danger)" : "var(--success)",
          background: reported === "fraud" ? "var(--danger-soft)" : "var(--success-soft)",
        }}
      >
        {isPending ? "Saving..." : reported === "fraud" ? "Marked Fraud" : "Marked Legit"}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => handleClick(true)}
        disabled={isPending}
        className="review-btn review-btn-fraud"
      >
        Fraud
      </button>
      <button
        onClick={() => handleClick(false)}
        disabled={isPending}
        className="review-btn review-btn-legit"
      >
        Legit
      </button>
    </div>
  );
}
