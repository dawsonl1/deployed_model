import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fraud Detection Pipeline</h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
        This app consumes predictions from a nightly ML pipeline that trains
        multiple fraud detection models, selects the best performer, and scores
        all orders. Use the navigation above to explore.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        <Link
          href="/select-customer"
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
        >
          <h2 className="font-semibold mb-1">Select Customer</h2>
          <p className="text-sm text-gray-500">Choose a customer to act as</p>
        </Link>
        <Link
          href="/warehouse/priority"
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
        >
          <h2 className="font-semibold mb-1">Priority Queue</h2>
          <p className="text-sm text-gray-500">Orders ranked by fraud risk</p>
        </Link>
        <Link
          href="/scoring"
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
        >
          <h2 className="font-semibold mb-1">Run Scoring</h2>
          <p className="text-sm text-gray-500">Trigger model inference</p>
        </Link>
      </div>
    </div>
  );
}
