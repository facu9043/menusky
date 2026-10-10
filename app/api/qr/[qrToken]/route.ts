import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTableQrPng } from "@/lib/qr";
import { getTableByToken } from "@/lib/tables/getTableByToken";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrToken: string }> }
) {
  const { qrToken } = await params;

  const supabase = await createClient();
  const table = await getTableByToken(supabase, qrToken);

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
