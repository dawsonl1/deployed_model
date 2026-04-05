"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function reportFraudStatus(formData: FormData) {
  const orderId = formData.get("order_id") as string;
  const isFraud = formData.get("is_fraud") === "true";

  if (!orderId) return;

  const supabase = await createClient();

  await supabase
    .from("orders")
    .update({
      is_fraud: isFraud,
      is_fraud_known: true,
    })
    .eq("order_id", parseInt(orderId));

  revalidatePath("/admin/review");
  revalidatePath("/warehouse/priority");
}

export async function fulfillOrder(formData: FormData) {
  const orderId = formData.get("order_id") as string;

  if (!orderId) return;

  const supabase = await createClient();

  await supabase
    .from("orders")
    .update({ fulfilled: true })
    .eq("order_id", parseInt(orderId));

  revalidatePath("/admin/review");
  revalidatePath("/warehouse/priority");
}

export async function fulfillAndReport(formData: FormData) {
  const orderId = formData.get("order_id") as string;
  const isFraud = formData.get("is_fraud") === "true";

  if (!orderId) return;

  const supabase = await createClient();

  await supabase
    .from("orders")
    .update({
      is_fraud: isFraud,
      is_fraud_known: true,
      fulfilled: true,
    })
    .eq("order_id", parseInt(orderId));

  revalidatePath("/admin/review");
  revalidatePath("/warehouse/priority");
  revalidatePath("/scoring");
}
