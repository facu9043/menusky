// Validación de ?redirect= del login (R-1, docs/specs/login.md CA-4.11 a
// CA-4.15 y CA-4.20). Función pura y sin dependencias: se prueba con
// scripts/check-safe-redirect.mjs.
//
// Se acepta SOLO una ruta interna del propio origen. Un valor sirve si es
// string y cumple, tal cual y también decodificado una vez con porcentaje:
//   1. empieza con "/";
//   2. el segundo carácter no es "/" ni "\" (evita "//host" y "/\host");
//   3. no tiene caracteres de control (U+0000 a U+001F, U+007F) ni ninguna "\".
// Si la decodificación falla ("%" mal formado), el valor es inválido.
//
// CA-4.20 (SEC-LG-01): además se normaliza con new URL(valor, BASE). Valores
// como "/.//evil.example", "/a/..//evil.example" o "/%2e//evil.example" pasan
// 1-3 pero se normalizan a "//evil.example", que el navegador leería como
// otro host. Es inválido si el origen cambia o si el pathname normalizado
// empieza con "//" o "/\". Si es válido se devuelve la forma normalizada
// (pathname + search + hash), no el texto crudo.
//
// BASE es un origen fijo y ficticio: solo sirve para resolver la ruta
// relativa; no depende de window, así la función sigue siendo pura y corre
// igual en Node. El destino final lo resuelve router.push sobre el origen real.
//
// Inválido => null: el login lo ignora en silencio y usa el destino por rol.

const BASE = "http://localhost";

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

function normalize(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  const path = url.pathname;
  if (path.charAt(0) !== "/" || path.charAt(1) === "/" || path.charAt(1) === "\\") {
    return null;
  }
  const normalized = path + url.search + url.hash;
  // La forma normalizada también tiene que cumplir CA-4.11 (tal cual y
  // decodificada), por si la normalización dejara al descubierto algo nuevo.
  if (!isInternalPath(normalized)) return null;
  try {
    return isInternalPath(decodeURIComponent(normalized)) ? normalized : null;
  } catch {
    return null;
  }
}

export function safeRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !isInternalPath(value)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!isInternalPath(decoded)) return null;
  return normalize(value);
}
