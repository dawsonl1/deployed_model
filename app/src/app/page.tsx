import Link from "next/link";

export default function Home() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fraud Detection Pipeline</h1>
        <p className="page-desc">
          An ML pipeline that trains multiple fraud detection models nightly, selects the
          best performer, and scores all orders. Explore the tools below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <Link href="/select-customer" className="card card-hover p-5 block">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Get Started
          </p>
          <h2 className="font-semibold mt-1">Select Customer</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Choose a customer to browse orders, place new ones, and view their dashboard.
          </p>
        </Link>
        <Link href="/warehouse/priority" className="card card-hover p-5 block">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--danger)" }}>
            Fraud Review
          </p>
          <h2 className="font-semibold mt-1">Priority Queue</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Orders ranked by predicted fraud probability. Review before fulfillment.
          </p>
        </Link>
        <Link href="/scoring" className="card card-hover p-5 block">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--success)" }}>
            ML Pipeline
          </p>
          <h2 className="font-semibold mt-1">Models & Scoring</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            View champion model, training history, and trigger a new scoring run.
          </p>
        </Link>
        <Link href="/place-order" className="card card-hover p-5 block">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--warning)" }}>
            Transactions
          </p>
          <h2 className="font-semibold mt-1">Place Order</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Create a new order for the selected customer and add it to the pipeline.
          </p>
        </Link>
      </div>
    </div>
  );
}
