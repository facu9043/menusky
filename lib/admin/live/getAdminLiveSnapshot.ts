import { createClient } from "@/lib/supabase/server";
import { loadAdminLiveSnapshot } from "@/lib/admin/live/load";
import type { AdminLiveSnapshot } from "@/lib/admin/live/types";

export async function getAdminLiveSnapshot(restaurantId: string): Promise<AdminLiveSnapshot> {
  const supabase = await createClient();
  return loadAdminLiveSnapshot(supabase, restaurantId);
}
