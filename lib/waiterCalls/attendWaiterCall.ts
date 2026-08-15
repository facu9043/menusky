import { createClient } from "@/lib/supabase/client";

// Autorizado por la policy RLS "staff manage waiter_calls" (is_staff_of).
export async function attendWaiterCall(callId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("waiter_calls")
    .update({ status: "attended", attended_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw error;
}
