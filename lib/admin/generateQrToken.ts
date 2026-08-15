const ACCENTS: Record<string, string> = {
  a: "áàäâ",
  e: "éèëê",
  i: "íìïî",
  o: "óòöô",
  u: "úùüû",
  n: "ñ",
};

function stripAccents(value: string): string {
  let result = value;
  for (const [plain, accented] of Object.entries(ACCENTS)) {
    for (const char of accented) {
      result = result.split(char).join(plain);
    }
  }
  return result;
}

// Genera un slug legible + sufijo random para usar como qr_token
// (ej: "mesa-5-a1b2c3"). No es un UUID a propósito: hace la URL del QR más
// corta y más fácil de reconocer si hay que debuguear a mano.
export function generateQrToken(label: string): string {
  const slug = stripAccents(label.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || "mesa"}-${suffix}`;
}
