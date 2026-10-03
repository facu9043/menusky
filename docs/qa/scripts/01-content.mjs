// HU-1, HU-2, HU-3, HU-4, HU-5 (parcial), HU-6: content / DOM checks
import { launch, BASE, check } from "./lib.mjs";
import fs from "node:fs";

const br = await launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const reqs = [];
page.on("request", (r) => reqs.push(r.url()));
const resp = await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForTimeout(1500);
const html = await (await ctx.request.get(BASE + "/")).text();
const bodyHtmlNoScript = html.replace(/<script[\s\S]*?<\/script>/g, "");
const text = await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll("script,style,noscript").forEach((n) => n.remove()); return c.textContent; });

// CA-1.1
const tpl = ["To get started", "page.tsx", "Vercel", "Next.js", "Templates", "Create Next App", "Deploy Now", "Read our docs"];
check("CA-1.1 sin plantilla en HTML (sin scripts)", !tpl.some((t) => bodyHtmlNoScript.includes(t)), tpl.filter((t) => bodyHtmlNoScript.includes(t)));
check("CA-1.1 app/page.tsx borrado", !fs.existsSync("../../../app/page.tsx"), "exists=" + fs.existsSync("../../../app/page.tsx"));

// CA-1.3
const h1s = await page.$$eval("h1", (e) => e.map((x) => x.textContent.trim()));
check("CA-1.3 un solo h1", h1s.length === 1, h1s);
const order = await page.evaluate(() =>
  [...document.querySelectorAll("header, main > section, main section[id], footer")].map((e) => e.tagName + "#" + (e.id || ""))
);
console.log("ORDER", JSON.stringify(order));
const heads = await page.$$eval("h1,h2,h3,h4", (e) => e.map((x) => x.tagName + ": " + x.textContent.trim().replace(/\s+/g, " ").slice(0, 70)));
console.log("HEADINGS\n" + heads.join("\n"));
let prev = 0;
const jumps = [];
for (const h of heads) {
  const l = +h[1];
  if (prev && l > prev + 1) jumps.push(h);
  prev = l;
}
check("RNF-A3 jerarquía sin saltos", jumps.length === 0, jumps);

// CA-1.4 / RNF-S
const bad = reqs.filter((u) => /supabase|\/api\//.test(u));
check("CA-1.4 sin peticiones a Supabase ni /api", bad.length === 0, { total: reqs.length, bad });
const extern = reqs.filter((u) => !u.startsWith(BASE));
check("RNF-S4/S5 sin peticiones de terceros", extern.length === 0, extern);
const cookies = await ctx.cookies();
check("RNF-S4 sin cookies desde /", cookies.length === 0, cookies.map((c) => c.name));
check("RNF-S4 sin Set-Cookie", !resp.headers()["set-cookie"], resp.headers()["set-cookie"] || "none");

// CA-1.6
check("CA-1.6 aviso comensal en el pie", await page.evaluate(() => /¿Sos cliente\? Escaneá el QR de tu mesa/.test(document.querySelector("footer")?.textContent || "")), "footer");

// Links
const links = await page.$$eval("a", (a) =>
  a.map((x) => ({
    href: x.getAttribute("href"),
    text: x.textContent.trim().replace(/\s+/g, " "),
    target: x.target,
    rel: x.rel,
    aria: x.getAttribute("aria-label"),
    area: x.closest("header") ? "header" : x.closest("footer") ? "footer" : x.closest("main") ? "main" : "?",
  }))
);
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/links.json", JSON.stringify(links, null, 1));
const WA = "https://wa.me/5493624105311?text=Hola%2C%20vi%20MenuSky%20y%20quiero%20pedir%20una%20demo%20para%20mi%20restaurante%2C%20bar%20o%20caf%C3%A9.";
const MAIL =
  "mailto:facu785@gmail.com?subject=Quiero%20una%20demo%20de%20MenuSky&body=Hola%2C%20vi%20MenuSky%20y%20quiero%20pedir%20una%20demo.%0D%0A%0D%0ANombre%3A%0D%0ALocal%20(restaurante%2C%20bar%20o%20caf%C3%A9)%3A%0D%0ACiudad%3A%0D%0ATel%C3%A9fono%3A%0D%0A";
const demo = links.filter((l) => /Pedí una demo/i.test(l.text) || /Pedí una demo/i.test(l.aria || ""));
console.log("DEMO LINKS", JSON.stringify(demo));
check("CA-2.1 todos 'Pedí una demo' con URL exacta", demo.length >= 4 && demo.every((l) => l.href === WA), { n: demo.length, areas: demo.map((d) => d.area), mismatches: demo.filter((l) => l.href !== WA) });
const areas = new Set(demo.map((d) => d.area));
check("CA-2.1 presentes en header, main (hero+final) y footer", areas.has("header") && areas.has("main") && areas.has("footer") && demo.filter((d) => d.area === "main").length >= 2, [...areas]);
const waAll = links.filter((l) => /wa\.me/.test(l.href || ""));
check("CA-2.1 todo enlace wa.me es la URL exacta", waAll.every((l) => l.href === WA), waAll.length);
check("CA-2.4 WhatsApp target=_blank rel noopener noreferrer", waAll.every((l) => l.target === "_blank" && /noopener/.test(l.rel) && /noreferrer/.test(l.rel)), waAll.map((l) => [l.target, l.rel]));
const mails = links.filter((l) => /^mailto:/.test(l.href || ""));
check("CA-2.3 mailto exacto", mails.length >= 2 && mails.every((l) => l.href === MAIL), { n: mails.length, items: mails.map((m) => m.area + ":" + m.text) });
check("CA-2.3 texto 'Escribinos por email' en hero y CTA final", mails.filter((m) => /Escribinos por email/.test(m.text) && m.area === "main").length >= 2, mails.map((m) => m.text));
console.log("decoded mail:", decodeURIComponent(MAIL));
console.log("decoded wa:", decodeURIComponent(WA));
const emails = [...new Set(bodyHtmlNoScript.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])];
check("CA-2.5 solo un email", emails.length === 1 && emails[0] === "facu785@gmail.com", emails);
console.log("long digit strings in markup:", JSON.stringify([...new Set(bodyHtmlNoScript.match(/\+?\d[\d\s-]{8,}\d/g) || [])]));
const social = links.filter((l) => /facebook|instagram|twitter|x\.com|linkedin|tiktok|youtube/i.test(l.href || ""));
check("CA-2.5 sin redes", social.length === 0, social);
check("CA-2.5 sin formulario/inputs", (await page.$$("form, input, textarea, select")).length === 0, "count 0");
const external = links.filter((l) => /^https?:/.test(l.href || "") && !l.href.startsWith(BASE));
check("RNF-S2 externos con rel/target", external.every((l) => l.target === "_blank" && /noopener/.test(l.rel) && /noreferrer/.test(l.rel)), external.length + " externos");
const hrefs = [...new Set(links.map((l) => l.href))];
console.log("ALL HREFS", JSON.stringify(hrefs.map((h) => (h || "").slice(0, 60))));
const anchors = links.filter((l) => (l.href || "").startsWith("#"));
const ids = await page.$$eval("[id]", (e) => e.map((x) => x.id));
const badAnch = anchors.filter((l) => l.href === "#" || !ids.includes(l.href.slice(1)));
check("CA-2.6 anclas válidas, sin # vacío", badAnch.length === 0 && links.every((l) => l.href && l.href !== "#"), { anchors: [...new Set(anchors.map((a) => a.href))], bad: badAnch, empty: links.filter((l) => !l.href || l.href === "#") });
const internal = [...new Set(links.map((l) => l.href).filter((h) => h && h.startsWith("/")))];
for (const p of internal) {
  const r = await ctx.request.get(BASE + p, { maxRedirects: 0 });
  console.log("internal", p, r.status());
}
check("CA-2.6 rutas internas existentes (solo /login)", internal.every((h) => h === "/login"), internal);
check("CA-2.7 sin Registrate/Probá gratis", !/Registrate|Probá gratis/i.test(text), "ok");
check("CA-4.5 sin enlaces a /m/ ni 'Ver demo'", !links.some((l) => /\/m\//.test(l.href || "")) && !/Ver demo/i.test(text), "ok");
const ing = links.filter((l) => /^Ingresar$/.test(l.text) || l.href === "/login");
check("CA-5.1 Ingresar en header y footer -> /login", ing.some((l) => l.area === "header") && ing.some((l) => l.area === "footer") && ing.every((l) => l.href === "/login"), ing.map((l) => l.area + ":" + l.href));

// CA-3.2: text + attributes + metadata
const attrs = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("*").forEach((e) => {
    for (const a of ["alt", "title", "aria-label", "aria-description", "placeholder"]) {
      const v = e.getAttribute(a);
      if (v) out.push(a + "=" + v);
    }
  });
  document.querySelectorAll("meta[content]").forEach((m) => out.push("meta:" + (m.name || m.getAttribute("property")) + "=" + m.content));
  return out;
});
const blob = text + "\n" + attrs.join("\n");
fs.writeFileSync("out/text-and-attrs.txt", blob);
const forb = ["factura", "facturación", "facturar", "ticket fiscal", "AFIP", "pago", "pagos", "pagar", "cobrar", "cobro", "propina", "MercadoPago", "tarjeta de crédito", "tarjeta de débito", "crédito", "débito", "delivery", "envío", "a domicilio", "para llevar", "reserva", "estadística", "reporte", "inventario", "stock", "multi-local", "sucursal", "POS", "impresión", "próximamente", "pronto", "gratis", "gratuito", "precio", "El Buen Sabor", "Coca-Cola", "Lorem", "TODO", "testimonio", "Next.js", "Vercel"];
const caseSens = new Set(["POS", "AFIP", "TODO"]);
const found = [];
for (const w of forb) {
  const re = caseSens.has(w) ? new RegExp(".{0,40}\\b" + w + "\\b.{0,40}") : new RegExp(".{0,40}" + w + ".{0,40}", "i");
  const m = blob.match(re);
  if (m) found.push(w + " => " + m[0].replace(/\n/g, " "));
}
console.log("FORBIDDEN HITS:\n" + (found.join("\n") || "(ninguno)"));
// Allowed by spec: "Sin stock hoy" label; "vercel" only as host of the canonical/OG URL (menusky.vercel.app).
const real = found.filter((f) => !/^stock => .*Sin stock hoy/.test(f) && !/^Vercel => meta:og:url=https:\/\/menusky\.vercel\.app/.test(f));
check("CA-3.2 palabras prohibidas (salvo excepciones de la spec)", real.length === 0, { real, allowed: found.length - real.length });
console.log("'$' contexts:", JSON.stringify(blob.match(/.{0,25}\$.{0,25}/g)?.slice(0, 15)));
console.log("'cuenta' contexts:\n" + (blob.match(/.{0,70}\bcuenta\b.{0,70}/gi) || []).join("\n"));
console.log("digit+%/+/x metrics:", JSON.stringify(blob.match(/.{0,30}\d+\s?(%|\+|x\b).{0,20}/g)));

// CA-6 metadata
const meta = await page.evaluate(() => ({
  title: document.title,
  desc: document.querySelector("meta[name=description]")?.content,
  lang: document.documentElement.lang,
  canon: document.querySelector("link[rel=canonical]")?.href,
  robots: document.querySelector("meta[name=robots]")?.content || null,
  og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map((m) => [m.getAttribute("property"), m.content])),
  tw: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')].map((m) => [m.name, m.content])),
  icons: [...document.querySelectorAll("link[rel*=icon]")].map((l) => l.getAttribute("href")),
}));
console.log(JSON.stringify(meta, null, 1));
check("CA-6.1 title <=60 con MenuSky", meta.title.length <= 60 && /MenuSky/.test(meta.title) && !/Create Next/.test(meta.title), meta.title + " (" + meta.title.length + ")");
check("CA-6.2 description 120-160", meta.desc.length >= 120 && meta.desc.length <= 160, meta.desc.length);
check("CA-6.3 lang es-AR", meta.lang === "es-AR", meta.lang);
check("CA-6.4 canonical == https://menusky.vercel.app/ (normalizado)", new URL(meta.canon).href === "https://menusky.vercel.app/", "literal: " + meta.canon);
check("CA-6.5 OG/Twitter completos", ["og:title", "og:description", "og:image", "og:url", "og:locale"].every((k) => meta.og[k]) && meta.og["og:locale"] === "es_AR" && meta.og["og:image:width"] === "1200" && meta.og["og:image:height"] === "630" && meta.tw["twitter:card"] === "summary_large_image" && !!meta.tw["twitter:image"], meta.og["og:image"]);
check("CA-6.7 sin noindex", !meta.robots || !/noindex/i.test(meta.robots), String(meta.robots));
check("CA-6.9 sin lorem/TODO", !/lorem ipsum/i.test(bodyHtmlNoScript) && !/\bTODO\b/.test(bodyHtmlNoScript), "ok");
await br.close();
