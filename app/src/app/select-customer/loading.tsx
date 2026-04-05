import { SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton-pulse rounded" style={{ width: "11rem", height: "1.5rem" }} />
        <div className="skeleton-pulse rounded mt-2" style={{ width: "22rem", height: "0.875rem" }} />
      </div>
      <div className="skeleton-pulse rounded-lg mb-5" style={{ width: "20rem", height: "2.25rem" }} />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
