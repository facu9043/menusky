// Validación de ?redirect= del login (R-1, docs/specs/login.md CA-4.11 a CA-4.15).
// Función pura y sin dependencias: se prueba con scripts/check-safe-redirect.mjs.
//
// Se acepta SOLO una ruta interna del propio origen. Un valor sirve si es
// string y cumple, tal cual y también decodificado una vez con porcentaje:
//   1. empieza con "/";
//   2. el segundo carácter no es "/" ni "\" (evita "//host" y "/\host");
//   3. no tiene caracteres de control (U+0000 a U+001F, U+007F) ni ninguna "\".
// Si la decodificación falla ("%" mal formado), el valor es inválido.
// Inválido => null: el login lo ignora en silencio y usa el destino por rol.

function isInternalPath(value: string): boolean {
  if (value.charAt(0) !== "/") return false;
  const second = value.charAt(1);
  if (second === "/" || second === "\\") return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c /* \ */) return false;
  }
  return true;
}

export function safeRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !isInternalPath(value)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  return isInternalPath(decoded) ? value : null;
}
