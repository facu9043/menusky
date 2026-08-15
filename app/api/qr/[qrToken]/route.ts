import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTableQrPng } from "@/lib/qr";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrToken: string }> }
) {
  const { qrToken } = await params;

  const supabase = await createClient();
  const { data: table } = await supabase
    .from("tables")
    .select("label")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  const png = await generateTableQrPng(qrToken);
  const filename = `qr-${table.label.toLowerCase().replace(/\s+/g, "-")}.png`;

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
