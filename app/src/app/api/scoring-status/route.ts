import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get the latest prediction timestamp and count of unfulfilled unscored orders
  const { data: latest } = await supabase
    .from("order_predictions_fraud")
    .select("prediction_timestamp")
    .order("prediction_timestamp", { ascending: false })
    .limit(1);

  const { count: unscoredCount } = await supabase
    .from("orders")
    .select("order_id", { count: "exact", head: true })
    .eq("fulfilled", false);

  // Check how many unfulfilled orders have predictions
  const { data: allUnfulfilled } = await supabase
    .from("orders")
    .select("order_id")
    .eq("fulfilled", false);

  const unfulfilled_ids = allUnfulfilled?.map((o) => o.order_id) ?? [];

  let scoredUnfulfilledCount = 0;
  if (unfulfilled_ids.length > 0) {
    const { count } = await supabase
      .from("order_predictions_fraud")
      .select("order_id", { count: "exact", head: true })
      .in("order_id", unfulfilled_ids);
    scoredUnfulfilledCount = count ?? 0;
  }

  return NextResponse.json({
    lastScoredAt: latest?.[0]?.prediction_timestamp ?? null,
    totalUnfulfilled: unscoredCount ?? 0,
    scoredUnfulfilled: scoredUnfulfilledCount,
    unscoredUnfulfilled: (unscoredCount ?? 0) - scoredUnfulfilledCount,
  });
}
