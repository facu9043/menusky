// Verifica safeRedirect (components/auth/safeRedirect.ts) contra la tabla de
// casos de docs/specs/login.md, CA-4.12 (válidos), CA-4.13 (inválidos) y
// CA-4.20 (normalización con new URL, SEC-LG-01).
// Sin dependencias: Node >= 23.6 importa el .ts directamente (type stripping).
// Uso: node scripts/check-safe-redirect.mjs   (sale con código 1 si algo falla)
// Node avisa MODULE_TYPELESS_PACKAGE_JSON al importar el .ts (package.json no
// declara "type"); es solo un aviso. Para ocultarlo:
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-safe-redirect.mjs
import { safeRedirect } from "../components/auth/safeRedirect.ts";

// [valor recibido por LoginForm, resultado esperado, descripción]
const cases = [
  // CA-4.12: válidos (se usan tal cual)
  ["/admin", "/admin", "ruta interna"],
  ["/kitchen?x=1", "/kitchen?x=1", "ruta con query"],
  ["/admin/menu/abc", "/admin/menu/abc", "ruta anidada"],
  ["/floor", "/floor", "ruta interna"],
  ["/", "/", "raíz"],
  // CA-4.13: inválidos (null => destino por rol)
  ["https://evil.example", null, "URL absoluta https"],
  ["http://evil.example", null, "URL absoluta http"],
  ["//evil.example", null, "esquema relativo //"],
  ["///evil.example", null, "empieza con //"],
  ["/\\evil.example", null, "empieza con /\\"],
  ["\\\\evil.example", null, "empieza con \\\\"],
  ["\\/evil.example", null, "empieza con \\/"],
  ["/\\/evil.example", null, "lleva \\"],
  ["javascript:alert(1)", null, "esquema javascript:"],
  ["data:text/html,x", null, "esquema data:"],
  [" /admin", null, "espacio inicial"],
  ["\t/admin", null, "tabulación inicial"],
  ["/\t/evil.example", null, "tabulación tras la barra"],
  ["/\n/evil.example", null, "salto de línea tras la barra"],
  ["/\r/evil.example", null, "retorno de carro tras la barra"],
  ["/admin\u007f", null, "DEL (U+007F)"],
  ["/%2F%2Fevil.example", null, "decodificado queda //evil.example"],
  ["/%2f%2fevil.example", null, "idem en minúsculas"],
  ["/%5Cevil.example", null, "decodificado queda /\\evil.example"],
  ["/%0A/evil.example", null, "decodificado lleva un control"],
  ["/%09/evil.example", null, "decodificado lleva una tabulación"],
  ["/%", null, "% mal formado"],
  ["/%E0%A4%A", null, "% mal formado (UTF-8 truncado)"],
  ["evil.example", null, "sin barra inicial"],
  ["admin", null, "sin barra inicial"],
  ["", null, "vacío"],
  [["/admin", "//evil.example"], null, "valor múltiple (array)"],
  [null, null, "sin ?redirect="],
  [undefined, null, "undefined"],
  // CA-4.20 (SEC-LG-01): new URL los normaliza a //evil.example
  ["/.//evil.example", null, "punto: normaliza a //"],
  ["/a/..//evil.example", null, "dos puntos: normaliza a //"],
  ["/%2e//evil.example", null, "%2e: normaliza a //"],
  ["/%2E%2E//evil.example", null, "%2E%2E: normaliza a //"],
  ["/./%2F/evil.example", null, "punto + %2F: decodificado //"],
  // CA-4.20: válido, se devuelve la forma normalizada
  ["/admin/../kitchen", "/kitchen", "normaliza a /kitchen"],
];

// JSON.stringify no escapa U+007F ni existe para undefined: se muestra a mano.
const show = (v) =>
  v === undefined ? "undefined" : JSON.stringify(v).replace(/\u007f/g, "\\u007f");

let fail = 0;
for (const [input, expected, why] of cases) {
  const got = safeRedirect(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${show(input).padEnd(28)} -> ${show(got).padEnd(17)} (${why})`,
  );
}
console.log(`\n${cases.length - fail}/${cases.length} casos OK`);
process.exit(fail ? 1 : 0);
