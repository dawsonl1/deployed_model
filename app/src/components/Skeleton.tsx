"use client";

export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="skeleton-pulse rounded"
      style={{ width, height: "0.875rem" }}
    />
  );
}

export function SkeletonBlock({ height = "2rem", width = "100%" }: { height?: string; width?: string }) {
  return (
    <div
      className="skeleton-pulse rounded-lg"
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ height = "5rem" }: { height?: string }) {
  return (
    <div className="card skeleton-pulse" style={{ height }} />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><SkeletonLine width="60%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><SkeletonLine width={c === 0 ? "40%" : "70%"} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
