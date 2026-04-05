"use client";

import { useState } from "react";

type Metric = {
  log_id: number;
  model_name: string;
  trained_at: string;
  f1: string;
  pr_auc: string;
  roc_auc: string;
  row_count_train: number;
};

type SortKey = "model_name" | "f1" | "pr_auc" | "roc_auc" | "row_count_train";

const columns: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "model_name", label: "Model", align: "left" },
  { key: "f1", label: "F1", align: "right" },
  { key: "pr_auc", label: "PR-AUC", align: "right" },
  { key: "roc_auc", label: "ROC-AUC", align: "right" },
  { key: "row_count_train", label: "Train Rows", align: "right" },
];

function groupByBatch(metrics: Metric[]): Map<string, Metric[]> {
  const groups = new Map<string, Metric[]>();
  for (const m of metrics) {
    const key = m.trained_at;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return groups;
}

const BATCHES_PER_PAGE = 3;

export default function MetricsTable({ metrics }: { metrics: Metric[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("pr_auc");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "model_name");
    }
  }

  const batches = groupByBatch(metrics);
  const sortedBatchKeys = [...batches.keys()].sort((a, b) => b.localeCompare(a));
  const totalPages = Math.ceil(sortedBatchKeys.length / BATCHES_PER_PAGE);
  const visibleKeys = sortedBatchKeys.slice(page * BATCHES_PER_PAGE, (page + 1) * BATCHES_PER_PAGE);

  function sortBatch(batch: Metric[]): Metric[] {
    return [...batch].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (["f1", "pr_auc", "roc_auc"].includes(sortKey)) {
        aVal = parseFloat(aVal as string);
        bVal = parseFloat(bVal as string);
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  return (
    <div className="space-y-4">
      {visibleKeys.map((batchKey) => {
        const batch = sortBatch(batches.get(batchKey)!);
        const batchDate = new Date(batchKey).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

        return (
          <div key={batchKey}>
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }} suppressHydrationWarning>
              Run: {batchDate}
            </p>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`cursor-pointer select-none ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                        style={{ transition: "background 0.1s" }}
                      >
                        {col.label}
                        {sortKey === col.key && (
                          <span className="ml-1 opacity-60">{sortAsc ? "▲" : "▼"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batch.map((m, i) => (
                    <tr
                      key={m.log_id}
                      style={i === 0 ? { background: "var(--success-soft)" } : undefined}
                    >
                      <td className="font-medium">
                        {m.model_name}
                        {i === 0 && (
                          <span className="badge badge-success ml-2">best</span>
                        )}
                      </td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        {parseFloat(m.f1).toFixed(4)}
                      </td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        {parseFloat(m.pr_auc).toFixed(4)}
                      </td>
                      <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        {parseFloat(m.roc_auc).toFixed(4)}
                      </td>
                      <td className="text-right">{m.row_count_train}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="btn btn-outline btn-sm"
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="btn btn-outline btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
