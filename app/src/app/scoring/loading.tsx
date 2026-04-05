import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton-pulse rounded" style={{ width: "12rem", height: "1.5rem" }} />
        <div className="skeleton-pulse rounded mt-2" style={{ width: "26rem", height: "0.875rem" }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <SkeletonCard height="10rem" />
        <SkeletonCard height="10rem" />
        <div className="space-y-3">
          <SkeletonCard height="4.5rem" />
          <SkeletonCard height="4.5rem" />
        </div>
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
