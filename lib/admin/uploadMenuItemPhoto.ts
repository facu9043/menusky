import { createClient } from "@/lib/supabase/client";

export async function uploadMenuItemPhoto(itemId: string, file: File): Promise<string> {
  const supabase = createClient();

  const rawExt = file.name.split(".").pop() ?? "jpg";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${itemId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("menu-photos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
  return data.publicUrl;
}
