import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton-pulse rounded" style={{ width: "12rem", height: "1.5rem" }} />
        <div className="skeleton-pulse rounded mt-2" style={{ width: "16rem", height: "0.875rem" }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
