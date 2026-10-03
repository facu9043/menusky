import { createClient } from "@/lib/supabase/client";

// D-7 / CA-7.6: solo imágenes comunes y hasta 5 MB.
export const PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// El texto para la persona lo arma el Frontend según `reason`.
export class PhotoValidationError extends Error {
  readonly reason: "type" | "size";

  constructor(reason: "type" | "size") {
    super(reason === "type" ? "Tipo de archivo no permitido" : "El archivo es demasiado grande");
    this.name = "PhotoValidationError";
    this.reason = reason;
  }
}

const EXT_BY_TYPE: Record<(typeof PHOTO_ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateMenuItemPhoto(file: { type: string; size: number }): void {
  if (!(PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    throw new PhotoValidationError("type");
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new PhotoValidationError("size");
  }
}

export async function uploadMenuItemPhoto(itemId: string, file: File): Promise<string> {
  validateMenuItemPhoto(file);

  const supabase = createClient();

  // La extensión sale del tipo validado, no del nombre que manda el cliente.
  const ext = EXT_BY_TYPE[file.type as (typeof PHOTO_ALLOWED_TYPES)[number]];
  const path = `${itemId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("menu-photos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
  return data.publicUrl;
}
