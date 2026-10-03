// QA login 01: criterios verificables leyendo el repo (sin navegador).
// Correr desde la raiz del repo: node docs/qa/scripts/login/01-static.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { check, summary } from "./lib.mjs";

const rd = (f) => readFileSync(f, "utf8");
const form = rd("components/auth/LoginForm.tsx");
const stripC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const css = stripC(rd("app/login/login.css")); // sin comentarios: los comentarios nombran lo prohibido
const cssRaw = rd("app/login/login.css");
const page = rd("app/login/page.tsx");
const svg = stripC(rd("components/brand/mascot/MascotPomo.tsx"));
const idx = rd("components/brand/mascot/index.tsx");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const git = (c) => execSync("git " + c, { encoding: "utf8" });

// CA-1.2
check("CA-1.2 sin manejadores de arrastre ni estado on", !/onPointerDown|onPointerMove|setPointerCapture/.test(form) && !/const \[on,/.test(form), "0 coincidencias");
check("CA-1.2 sin 'cadena'/'luz'/role=button", !/cadena|Tirá de la/i.test(form) && !/role="button"/.test(form) && !/aria-label="[^"]*(luz)/i.test(form), "0 coincidencias");
// CA-2.6 / CA-6.14
check("CA-2.6 sin toast ni sonner en LoginForm", !/toast|sonner/i.test(form), (form.match(/toast|sonner/gi) || []).length + " coincidencias");
check("CA-6.14 sin aria-live; 1 role=alert", !/aria-live/.test(form) && (form.match(/role="alert"/g) || []).length === 1 && !/role="status"/.test(form), { alert: (form.match(/role="alert"/g) || []).length });
// CA-5.1 / 5.2
const transProps = [...css.matchAll(/transition(?:-property)?:\s*([^;]+);/g)].map((m) => m[1]);
check("CA-5.1 transiciones solo transform", transProps.filter((t) => !/^none/.test(t.trim())).every((t) => /^transform\b/.test(t.trim())), transProps);
const anims = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
const badKey = anims.filter(([, , body]) => /(width|height|top|left|margin|box-shadow|filter|background-position)\s*:/.test(body)).map((a) => a[1]);
check("CA-5.1 keyframes sin width/height/top/left/margin/box-shadow/filter/background-position", badKey.length === 0, { keyframes: anims.map((a) => a[1]), malos: badKey });
const f2 = (css + form + svg).match(/blur\(|backdrop-filter|drop-shadow|<filter|feGaussianBlur|feDropShadow/g) || [];
check("CA-5.2 sin blur/backdrop-filter/drop-shadow", f2.length === 0, f2);
// CA-5.6 / 10.11 / 10.4
const diffPkg = git("diff efbbfd5 --stat -- package.json package-lock.json").trim();
check("CA-5.6/9.9 package.json y lock sin cambios (vs efbbfd5)", diffPkg === "", diffPkg || "diff vacio");
const jsAnim = [...(form + svg + page + css + readdirSync("components/brand/mascot").map((f) => rd("components/brand/mascot/" + f)).join("") + rd("app/login/layout.tsx")).matchAll(/requestAnimationFrame|setInterval|setTimeout|mousemove|pointermove|onKeyDown|onKeyUp|onInput/g)].map((m) => m[0]);
check("CA-10.11.1/10.4 rAF/setInterval/mousemove/onKey*: solo el setTimeout de seguridad de 10 s", jsAnim.length === 1 && jsAnim[0] === "setTimeout", jsAnim);
check("CA-10.10a setTimeout solo es la red de seguridad (clearTimeout, 10_000)", /SUCCESS_SAFETY_MS = 10_000/.test(form) && (form.match(/setTimeout/g) || []).length === 1, "1 setTimeout, 10_000 ms; la navegacion (router.push) no espera");
const pushIdx = form.indexOf("router.push(destination)");
check("CA-10.10 setSucceeded(true) justo antes de router.push, sin await entre medio", /setSucceeded\(true\);\s*router\.push\(destination\);/.test(form), "orden verificado en handleSubmit");
// CA-3.12
const appFiles = [...walk("app"), ...walk("components")].filter((f) => /\.(tsx?|css)$/.test(f));
const hits = appFiles.filter((f) => /Brioche|Pollito|MascotVariant|mascota=|variant === [12]/.test(rd(f)));
check("CA-3.12c 0 Brioche/Pollito/MascotVariant/mascota=/variant===1|2 en app/** y components/**", hits.length === 0, hits);
check("CA-3.12a page.tsx sin searchParams.mascota ni BORRADOR", !/mascota|BORRADOR|MascotVariant/.test(page), "page.tsx lee solo redirect");
check("CA-3.12b components/brand/mascot solo Pomo", readdirSync("components/brand/mascot").sort().join() === "MascotPomo.tsx,index.tsx", readdirSync("components/brand/mascot"));
check("CA-3.12d docs/design/mascota conserva historial", ["mascota.md", "generar-mascotas.mjs"].every((f) => existsSync("docs/design/mascota/" + f)) && readdirSync("docs/design/mascota").some((f) => f.endsWith(".png")) && readdirSync("docs/design/mascota").some((f) => f.endsWith(".svg")), readdirSync("docs/design/mascota").length + " archivos");
// CA-3.8
const imp = appFiles.filter((f) => /components\/brand\/mascot|brand\/mascot/.test(rd(f))).map((f) => f.replace(/\\/g, "/"));
check("CA-3.8 mascota importada solo desde app/login (y su propio dir)", imp.every((f) => f.startsWith("app/login/") || f.startsWith("components/brand/mascot/")), imp);
// CA-3.2 / 3.5 (sobre el SVG del TSX)
const forb = svg.match(/<image|href=|url\(|<script|<foreignObject|<text|<filter|<fe[A-Z]|<title|<desc|font-family|xlink/g) || [];
check("CA-3.2/3.5 SVG sin image/href/url()/script/foreignObject/text/filter/title", forb.length === 0, forb);
const nodes = (svg.match(/<(svg|g|path|circle|ellipse|rect|line|polyline|polygon|use|defs|clipPath|mask|linearGradient|radialGradient|stop)\b/g) || []).length;
check("CA-3.5 <= 120 elementos SVG", nodes <= 120, { elementos: nodes });
check("CA-3.6 SVG aria-hidden y sin title ni focusable", /aria-hidden="true"/.test(svg) && !/<title|tabIndex|tabindex/.test(svg), "aria-hidden=true");
// CA-3.13 sin nombre
check("CA-3.13 sin nombre 'Pomo' en pantalla/aria", !/Pomo/.test(form + page) && !/aria-label|alt=/.test(svg), "LoginForm/page sin 'Pomo'; SVG sin aria-label/alt");
// CA-2.1 paleta: colores literales en el CSS
const allowed = new Set(["#fff5e1", "#fffdf8", "#f4d9a6", "#8a5a3b", "#ffc21a", "#e3a008", "#d7261e", "#a8141b", "#4c9a2a", "#2e6b1a", "#2b1710", "#6a4a3c", "#ffcd3f", "#7ccb4e"]);
const hexes = [...new Set([...(css + svg).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()))];
check("CA-2.1/3.3 colores literales dentro de la paleta (+ #ffcd3f, #7ccb4e declarados)", hexes.every((h) => allowed.has(h)), { fuera: hexes.filter((h) => !allowed.has(h)), usados: hexes.length });
const land = rd("app/(landing)/landing.css");
const tok = [...css.matchAll(/--ms-([\w-]+):\s*(#[0-9a-fA-F]{6}|rgba?\([^)]*\))/g)];
const mism = tok.filter(([, n, v]) => { const m = land.match(new RegExp(`--ms-${n}:\\s*(#[0-9a-fA-F]{6}|rgba?\\([^)]*\\))`)); return !m || m[1].toLowerCase() !== v.toLowerCase(); }).map((m) => m[1]);
check("CA-2.1 tokens --ms-* del login == landing.css", mism.length === 0, { tokens: tok.length, distintos: mism });
check("CA-2.1 naranja E8590C y fondo 170f0c ausentes", !/e8590c|170f0c/i.test(css + form + svg), "0 coincidencias");
// CA-4.8
const protectedPaths = "lib proxy.ts supabase app/api app/globals.css app/(landing) components/landing components/ui/sonner.tsx app/layout.tsx";
const d = git(`diff efbbfd5 HEAD --stat -- ${protectedPaths.split(" ").map((p) => `"${p}"`).join(" ")}`).trim();
check("CA-4.8/2.4 sin cambios en lib, proxy, supabase, api, globals, landing, Logo, sonner, layout (vs efbbfd5)", d === "", d || "diff vacio");
const files = git("diff efbbfd5 HEAD --name-only").trim().split("\n");
check("Alcance del diff (informativo)", true, files.filter((f) => !f.startsWith("docs/")));
// CA-5.6 mascota/landing
check("CA-3.8/CA-2.4 Logo.tsx intacto", git("diff efbbfd5 HEAD --stat -- components/landing/brand/Logo.tsx").trim() === "", "sin diff");
// CA-3.5 peso
const bytes = Buffer.byteLength(svg);
const svgInner = svg.slice(svg.indexOf("<svg"));
check("CA-3.5 peso de MascotPomo.tsx (aprox. SVG)", bytes <= 12288 && gzipSync(Buffer.from(svgInner)).length <= 4096, { bytes, gzip: gzipSync(Buffer.from(svgInner)).length });
// RNF-S2
check("RNF-S2 sin placeholder/defaultValue con credenciales", !/placeholder=|defaultValue=/.test(form), "sin placeholder ni defaultValue");
// CA-4.6/4.9/11.1
check("CA-4.6 atributos de campos", /type="email"/.test(form) && /autoComplete="email"/.test(form) && /autoComplete="current-password"/.test(form) && (form.match(/required/g) || []).length >= 2, "ok");
check("CA-12.1 enlace al inicio sin prefetch", /href="\/" prefetch=\{false\}[^>]*aria-label="MenuSky, ir al inicio"/.test(form), "ok");
check("CA-12.2 sin enlaces externos/redes", !/https?:\/\//.test(form) && !/instagram|linkedin|wa\.me|mailto/i.test(form), "ok");
summary();
