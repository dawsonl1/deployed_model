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

export default function MetricsTable({ metrics }: { metrics: Metric[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("pr_auc");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "model_name");
    }
  }

  // Group by trained_at timestamp (all models in a batch share the same timestamp)
  const batches = groupByBatch(metrics);
  // Sort batches newest first
  const sortedBatchKeys = [...batches.keys()].sort((a, b) => b.localeCompare(a));

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
      {sortedBatchKeys.map((batchKey) => {
        const batch = sortBatch(batches.get(batchKey)!);
        const batchDate = new Date(batchKey).toLocaleString();

        return (
          <div key={batchKey}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Training Run: {batchDate}
            </p>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-4 py-2 cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-800 ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {col.label}
                        {sortKey === col.key && (
                          <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batch.map((m, i) => (
                    <tr
                      key={m.log_id}
                      className={`border-t border-gray-100 dark:border-gray-800 ${
                        i === 0 ? "bg-green-50 dark:bg-green-950" : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        {m.model_name}
                        {i === 0 && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            best
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{parseFloat(m.f1).toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-mono">{parseFloat(m.pr_auc).toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-mono">{parseFloat(m.roc_auc).toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{m.row_count_train}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
