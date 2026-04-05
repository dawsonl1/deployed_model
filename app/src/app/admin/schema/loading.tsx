import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton-pulse rounded" style={{ width: "12rem", height: "1.5rem" }} />
        <div className="skeleton-pulse rounded mt-2" style={{ width: "26rem", height: "0.875rem" }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} height="4.5rem" />
        ))}
      </div>
    </div>
  );
}
