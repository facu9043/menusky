import QRCode from "qrcode";

export function getTableUrl(qrToken: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/m/${qrToken}`;
}

export async function generateTableQrPng(qrToken: string): Promise<Buffer> {
  const url = getTableUrl(qrToken);
  return QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
  });
}
