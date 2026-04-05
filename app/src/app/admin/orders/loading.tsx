import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton-pulse rounded" style={{ width: "8rem", height: "1.5rem" }} />
        <div className="skeleton-pulse rounded mt-2" style={{ width: "22rem", height: "0.875rem" }} />
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <SkeletonCard height="3.5rem" />
        <SkeletonCard height="3.5rem" />
        <SkeletonCard height="3.5rem" />
        <SkeletonCard height="3.5rem" />
      </div>
      <SkeletonTable rows={10} cols={10} />
    </div>
  );
}
