// Genera las 3 propuestas de mascota de MenuSky a partir de una sola
// descripción: los SVG de docs/design/mascota/ y los componentes TSX de
// components/brand/mascot/. Dibujo 100 % propio: coordenadas escritas a
// mano, sin imágenes, sin calcos, sin fuentes (el texto de la gorra es un
// trazo dibujado letra por letra).
//
// Uso (desde la raíz del repo): node docs/design/mascota/generar-mascotas.mjs
import { writeFileSync, mkdirSync } from "node:fs";

// Paleta: mismos HEX que los tokens --ms-* (app/(landing)/landing.css).
const P = "#2b1710"; // patty: contorno, delantal
const C = "#ffc21a"; // cheddar: cuerpo
const MU = "#e3a008"; // mustard
const T = "#d7261e"; // tomato: gorra
const K = "#a8141b"; // ketchup: visera
const L = "#4c9a2a"; // lettuce
const TO = "#f4d9a6"; // toasted: pan de la hamburguesa
const BUN = "#fff5e1"; // bun
const PA = "#fffdf8"; // paper: letras de la gorra
// Excepción documentada: el verde claro del isotipo tal como está en
// components/landing/brand/Logo.tsx (no figura en la tabla de tokens).
const ISO_GREEN = "#7CCB4E";

// ---------------------------------------------------------------------------
// Letras de la gorra: trazo simple, caja de 9 de alto (línea base y = 9).
// Solo comandos absolutos M/L/C/Q (pares x,y) para poder desplazarlas.
const GLYPHS = {
  Y: { w: 6, d: "M0 0L3 4.5L6 0M3 4.5L3 9" },
  o: { w: 5, d: "M2.5 3C5.3 3 5.3 9 2.5 9C-.3 9-.3 3 2.5 3Z" },
  M: { w: 7.4, d: "M0 9L0 0L3.7 5.6L7.4 0L7.4 9" },
  e: { w: 5, d: "M.3 6.1L5 6.1C5 2.5 0 2.4 0 6C0 9.6 4.2 9.7 5 8" },
  n: { w: 5, d: "M0 9L0 3M0 5.6C0 2.4 5 2.4 5 5.6L5 9" },
  u: { w: 5, d: "M0 3L0 6.4C0 9.6 5 9.6 5 6.4M5 3L5 9" },
  S: { w: 5.8, d: "M5.4 1.6C4.4-.6 .1-.4 .2 2.3C.4 4.8 5.8 4.2 5.8 6.8C5.8 9.8 1 9.8 0 7.5" },
  k: { w: 5, d: "M0 0L0 9M4.8 3L.3 6.5M1.9 5.3L5 9" },
  y: { w: 5.2, d: "M0 3L2.6 8.6M5.2 3L1.9 11.4" },
};
const HEART_W = 7;
const HEART = "M3.5 8.6C-1 5.2-.2 1 2 1C3 1 3.5 1.9 3.5 2.6C3.5 1.9 4 1 5 1C7.2 1 8 5.2 3.5 8.6Z";
const GAP = 1.7;
const SPACE = 3;

const fmt = (n) => {
  const s = (Math.round(n * 10) / 10).toString();
  return s.replace(/^(-?)0\./, "$1.");
};
function shift(d, dx, dy) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (num) => fmt(parseFloat(num) + (i++ % 2 === 0 ? dx : dy)));
}

// Devuelve { text, heart } en coordenadas locales centradas en x = 0,
// con la línea base en y = 0.
function capText() {
  const parts = ["Y", "o", " ", "♥", " ", "M", "e", "n", "u", "S", "k", "y"];
  let width = 0;
  for (const ch of parts) {
    width += ch === " " ? SPACE : (ch === "♥" ? HEART_W : GLYPHS[ch].w) + GAP;
  }
  width -= GAP;
  let x = -width / 2;
  let text = "";
  let heart = "";
  for (const ch of parts) {
    if (ch === " ") {
      x += SPACE;
      continue;
    }
    if (ch === "♥") {
      heart = shift(HEART, x, -9);
      x += HEART_W + GAP;
      continue;
    }
    text += shift(GLYPHS[ch].d, x, -9);
    x += GLYPHS[ch].w + GAP;
  }
  return { text, heart };
}
const CAP_TEXT = capText();

// ---------------------------------------------------------------------------
// Piezas comunes. Todas heredan el contorno grueso del grupo padre.

// Gorra roja con "Yo ♥ MenuSky": (0,0) = centro del borde inferior de la copa.
// La visera apunta a la derecha, hacia el formulario.
function cap(x, y, rot) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
<path d="M28 0C50-5 72-2 77 6C67 12 45 11 26 8Z" fill="${K}"/>
<path d="M-47 5C-47-43 47-43 47 5Z" fill="${T}"/>
<circle cy="-31" r="4.5" fill="${K}" stroke-width="3.5"/>
<path d="${CAP_TEXT.text}" fill="none" stroke="${PA}" stroke-width="1.5"/>
<path d="${CAP_TEXT.heart}" fill="${C}" stroke="none"/>
</g>`;
}

// Isotipo de MenuSky (mismos trazos que Isotype de Logo.tsx, viewBox 48).
function isotype(cx, cy, s) {
  const o = -24;
  return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(${o} ${o})" stroke="none">
<rect width="48" height="48" rx="12" fill="${T}"/>
<path d="M11 24c0-7.4 5.8-12.5 13-12.5S37 16.6 37 24Z" fill="${C}"/>
<path d="M17.6 18.9l2.8-1.4M23 15.6h3M28.2 17.7l2.8 1.4" stroke="${BUN}" stroke-width="1.7"/>
<path d="M10.5 27.2q2.25-2.4 4.5 0t4.5 0 4.5 0 4.5 0 4.5 0 4.5 0" fill="none" stroke="${ISO_GREEN}" stroke-width="2.6"/>
<rect x="10" y="30" width="28" height="5.2" rx="2.6" fill="${P}"/>
<rect x="11.5" y="36.6" width="25" height="4.4" rx="2.2" fill="${C}"/>
</g>`;
}

// Hamburguesa sostenida: (0,0) = centro, ~56 x 44. bite = mordida en el pan.
function burger(x, y, rot, s, bite = false) {
  const top = bite
    ? "M-25-6C-25-24-8-29 4-28C2-24 6-19 11-20C13-17 18-15 22-16C24-13 25-10 25-6Z"
    : "M-25-6C-25-28 25-28 25-6Z";
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke-width="3.5">
<rect x="-24" y="8" width="48" height="11" rx="5.5" fill="${TO}"/>
<rect x="-27" y="0" width="54" height="9" rx="4.5" fill="${P}"/>
<path d="M-26-2L26-2L23 4L17 0L10 7L3 0L-9 6L-15 0L-25 3Z" fill="${C}"/>
<path d="M-27-4Q-22.5-9-18-4T-9-4T0-4T9-4T18-4T27-4" fill="none" stroke-width="8"/>
<path d="M-27-4Q-22.5-9-18-4T-9-4T0-4T9-4T18-4T27-4" fill="none" stroke="${L}" stroke-width="3.5"/>
<path d="${top}" fill="${TO}"/>
<path d="M-12-15l3-1.5M-2-20h3.4M8-14l3 1.4" stroke="${MU}" stroke-width="2.4"/>
</g>`;
}

// Brazo: contorno grueso + relleno, de (x1,y1) a (x2,y2) con control (cx,cy).
function arm(d, fill) {
  return `<path d="${d}" fill="none" stroke-width="14"/>
<path d="${d}" fill="none" stroke="${fill}" stroke-width="6"/>`;
}

const OPEN = (viewW, viewH) =>
  `<g fill="none" stroke="${P}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">`;

// ---------------------------------------------------------------------------
// Propuesta 1: "Brioche", el pan de la casa. Cuerpo ancho y redondo (la
// cúpula del isotipo hecha personaje), semillas de sésamo, ojos de grano
// oscuros sin blanco, mejillas tomate. Sostiene la hamburguesa con las dos
// manos frente al delantal.
const p1 = `${OPEN()}
<ellipse cx="78" cy="221" rx="17" ry="8" fill="${MU}"/>
<ellipse cx="122" cy="221" rx="17" ry="8" fill="${MU}"/>
<path d="M34 168C30 110 62 70 100 70C138 70 170 110 166 168C164 200 138 214 100 214C62 214 36 200 34 168Z" fill="${C}"/>
<path d="M44 126l4-5M155 121l-3-5M50 150l5-2M151 146l-5-2M146 92l-4-4" stroke="${BUN}" stroke-width="4"/>
<path d="M60 142L140 142L150 196C134 210 66 210 50 196Z" fill="${P}"/>
<path d="M64 141C68 131 132 131 136 141" stroke-width="4"/>
${isotype(100, 191, 0.5)}
${arm("M44 150Q52 166 70 162", C)}
${arm("M156 150Q148 166 130 162", C)}
<g class="m-eyes" stroke="none">
<ellipse cx="82" cy="106" rx="6" ry="8" fill="${P}"/>
<ellipse cx="118" cy="106" rx="6" ry="8" fill="${P}"/>
<circle cx="84" cy="102.5" r="2.2" fill="${PA}"/>
<circle cx="120" cy="102.5" r="2.2" fill="${PA}"/>
</g>
<ellipse cx="66" cy="121" rx="7" ry="4" fill="${T}" stroke="none"/>
<ellipse cx="134" cy="121" rx="7" ry="4" fill="${T}" stroke="none"/>
<path class="m-ok" d="M90 118Q100 134 110 118Z" fill="${P}" stroke-width="3.5"/>
<path class="m-oops" opacity="0" d="M90 126Q95 120 100 125T110 124" stroke-width="3.5"/>
${burger(100, 160, -4, 0.95)}
<circle cx="70" cy="162" r="8" fill="${C}" stroke-width="4"/>
<circle cx="130" cy="162" r="8" fill="${C}" stroke-width="4"/>
${cap(100, 84, -5)}
</g>`;

// Propuesta 2: pollito cocinero. Cuerpo en forma de pera, pico mostaza,
// ojos cerrados de felicidad (arcos), copete que asoma por detrás de la
// gorra, cola de tres plumas. Da un mordisco a la hamburguesa.
const p2 = `${OPEN()}
<rect x="68" y="214" width="22" height="10" rx="5" fill="${MU}"/>
<rect x="110" y="214" width="22" height="10" rx="5" fill="${MU}"/>
<path d="M50 172L26 160L36 178L22 186L48 192Z" fill="${C}"/>
<path d="M64 84C50 84 42 74 46 64C50 70 54 72 58 72C52 66 52 56 58 50C60 60 64 66 70 70Z" fill="${C}"/>
<path d="M100 70C132 70 148 96 142 124C158 142 162 172 152 194C142 214 122 220 100 220C78 220 58 214 48 194C38 172 42 142 58 124C52 96 68 70 100 70Z" fill="${C}"/>
<path d="M64 150L136 150L150 194C134 214 66 214 50 194Z" fill="${P}"/>
<path d="M72 150C74 136 126 136 128 150" stroke-width="4"/>
${isotype(100, 186, 0.52)}
<path d="M58 140C44 150 44 168 58 174C64 162 66 150 58 140Z" fill="${C}"/>
<path class="m-eyes" d="M78 104Q85 95 92 104M108 104Q115 95 122 104" stroke-width="4.5"/>
<g class="m-ok" stroke="none">
<ellipse cx="72" cy="118" rx="7" ry="4" fill="${T}"/>
<ellipse cx="128" cy="118" rx="7" ry="4" fill="${T}"/>
</g>
<path class="m-oops" opacity="0" d="M142 88C137 97 137 103 142 103C147 103 147 97 142 88Z" fill="${BUN}" stroke-width="3"/>
<path d="M94 122L108 120L101 131Z" fill="${MU}" stroke-width="4"/>
<path d="M88 114Q100 105 114 114L101 121Z" fill="${MU}" stroke-width="4"/>
${burger(136, 138, -14, 0.82, true)}
<path d="M146 162C162 158 166 140 156 134C148 132 140 142 136 152Z" fill="${C}"/>
${cap(100, 82, -4)}
</g>`;

// Propuesta 3: el pomo de mostaza. Un frasco aplastable amarillo; el
// delantal es la etiqueta del frasco y el pico asoma por arriba de la
// gorra. Ojos rectangulares con párpado plano (canchero), brillo de
// plástico. Muestra la hamburguesa con el brazo extendido hacia el formulario.
const p3 = `${OPEN()}
<rect x="66" y="218" width="24" height="12" rx="6" fill="${MU}"/>
<rect x="110" y="218" width="24" height="12" rx="6" fill="${MU}"/>
<path d="M96 60L100 46L104 60Z" fill="${T}" stroke-width="4"/>
<path d="M58 112C58 96 74 86 100 86C126 86 142 96 142 112L146 206C146 218 136 224 124 224L76 224C64 224 54 218 54 206Z" fill="${C}"/>
<path d="M66 116L65 138" stroke="${BUN}" stroke-width="5"/>
<path d="M57 148L143 148L146 206C146 218 136 224 124 224L76 224C64 224 54 218 54 206Z" fill="${P}"/>
${isotype(100, 188, 0.68)}
${arm("M56 160Q38 170 50 184", C)}
<circle cx="52" cy="184" r="7" fill="${C}" stroke-width="4"/>
${arm("M144 160Q160 158 166 146", C)}
<g class="m-eyes">
<rect x="78" y="108" width="9" height="14" rx="4.5" fill="${P}" stroke="none"/>
<rect x="113" y="108" width="9" height="14" rx="4.5" fill="${P}" stroke="none"/>
<path d="M75 110L90 108M110 108L125 110" stroke-width="4"/>
</g>
<path class="m-ok" d="M86 129L114 129Q112 143 100 143Q88 143 86 129Z" fill="${P}" stroke-width="3.5"/>
<path class="m-oops" opacity="0" d="M89 138Q100 128 111 138" stroke-width="3.5"/>
${burger(166, 128, 6, 0.8)}
<circle cx="166" cy="146" r="7.5" fill="${C}" stroke-width="4"/>
${cap(100, 96, 3)}
</g>`;

const VARIANTS = [
  { n: 1, name: "Brioche", body: p1 },
  { n: 2, name: "Pollito", body: p2 },
  { n: 3, name: "Pomo", body: p3 },
];

const VIEWBOX = "0 0 200 240";

function compact(s) {
  return s.replace(/\n/g, "").replace(/>\s+</g, "><");
}

// SVG estático (documentación y revisión del Director).
for (const v of VARIANTS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="400" height="480">${compact(v.body)}</svg>\n`;
  writeFileSync(new URL(`./propuesta-${v.n}.svg`, import.meta.url), svg);
}

// Componentes TSX (Server Components: el SVG viaja en el HTML, no en el JS).
const toJsx = (s) =>
  s
    .replace(/\bclass=/g, "className=")
    .replace(/\bstroke-(width|linecap|linejoin)=/g, (_, p) => "stroke" + p[0].toUpperCase() + p.slice(1) + "=");

const outDir = new URL("../../../components/brand/mascot/", import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const v of VARIANTS) {
  const tsx = `// ARCHIVO GENERADO por docs/design/mascota/generar-mascotas.mjs: no editar a mano.
// Mascota de MenuSky, propuesta ${v.n} ("${v.name}"). Diseño original del equipo, SVG propio.
// Decorativa: aria-hidden. Clases para animación CSS (app/login/login.css):
// m (raíz, movimiento ocioso), m-eyes, m-ok / m-oops (cara normal / de error).

export function Mascot${v.name}({ className }: { className?: string }) {
  return (
    <svg
      viewBox="${VIEWBOX}"
      aria-hidden="true"
      focusable="false"
      className={\`m m--${v.n} \${className ?? ""}\`}
    >
      ${toJsx(compact(v.body)).replace(/></g, ">\n      <")}
    </svg>
  );
}
`;
  writeFileSync(new URL(`./Mascot${v.name}.tsx`, outDir), tsx);
}
console.log("ok");
