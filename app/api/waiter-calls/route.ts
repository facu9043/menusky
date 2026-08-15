import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_REASONS = new Set(["cuenta", "consulta", "otro"]);

export async function POST(request: Request) {
  let body: { qrToken?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { qrToken, reason } = body;
  if (!qrToken || !reason || !VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Faltan datos del llamado" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id, restaurant_id")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  const { error } = await supabase.from("waiter_calls").insert({
    table_id: table.id,
    restaurant_id: table.restaurant_id,
    reason,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo avisar al mozo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
