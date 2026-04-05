import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("metrics_log")
    .select("trained_at")
    .order("trained_at", { ascending: false })
    .limit(1);

  const { data: champion } = await supabase
    .from("model_registry")
    .select("model_name, trained_at")
    .eq("is_champion", true)
    .limit(1);

  const { count: metricsCount } = await supabase
    .from("metrics_log")
    .select("log_id", { count: "exact", head: true });

  return NextResponse.json({
    lastTrainedAt: latest?.[0]?.trained_at ?? null,
    championName: champion?.[0]?.model_name ?? null,
    championTrainedAt: champion?.[0]?.trained_at ?? null,
    totalMetricsRows: metricsCount ?? 0,
  });
}
