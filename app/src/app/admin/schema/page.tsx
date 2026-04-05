import { createClient } from "@/lib/supabase/server";

export default async function SchemaPage() {
  const supabase = await createClient();

  // Get all tables by querying information_schema
  const { data: tables } = await supabase
    .rpc("get_schema_info")
    .select("*");

  // Fallback: query each known table's structure directly
  const knownTables = [
    "customers", "products", "orders", "order_items",
    "shipments", "product_reviews", "order_predictions_fraud",
    "metrics_log", "model_registry",
  ];

  const tableInfo: { name: string; columns: any[]; rowCount: number }[] = [];

  for (const table of knownTables) {
    // Get columns via a dummy query
    const { data: sample } = await supabase
      .from(table)
      .select("*")
      .limit(1);

    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    const columns = sample && sample.length > 0
      ? Object.keys(sample[0]).map((col) => ({
          name: col,
          type: typeof sample[0][col],
          sample: sample[0][col],
        }))
      : [];

    tableInfo.push({
      name: table,
      columns,
      rowCount: count ?? 0,
    });
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">Admin</span>
          <h1 className="page-title">Database Schema</h1>
        </div>
        <p className="page-desc">
          All tables in the Supabase database with column names, inferred types,
          and row counts. Useful for verifying the schema matches the pipeline and app code.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {tableInfo.map((t) => (
          <a key={t.name} href={`#${t.name}`} className="card card-hover p-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {t.name}
            </p>
            <p className="text-lg font-bold mt-1">{t.rowCount.toLocaleString()}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{t.columns.length} columns</p>
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {tableInfo.map((t) => (
          <div key={t.name} id={t.name}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              {t.name}
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--muted)" }}>
                ({t.rowCount.toLocaleString()} rows)
              </span>
            </h2>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Column</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Sample Value</th>
                  </tr>
                </thead>
                <tbody>
                  {t.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="font-medium" style={{ fontFamily: "var(--font-mono)" }}>{col.name}</td>
                      <td style={{ color: "var(--muted)" }}>{col.type}</td>
                      <td className="truncate max-w-xs" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {col.sample === null ? <span style={{ opacity: 0.4 }}>null</span> : String(col.sample).slice(0, 60)}
                      </td>
                    </tr>
                  ))}
                  {t.columns.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4" style={{ color: "var(--muted)" }}>
                        Empty table — no columns to infer
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
