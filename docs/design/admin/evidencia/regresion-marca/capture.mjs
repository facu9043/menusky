// Regresión visual de marca (CA-RNF.1 d) y conteo de fuentes (CA-RNF.1 c).
// Sin dependencias: Chrome headless + CDP crudo por WebSocket (Node >= 22).
//
// Uso (contra `next build && next start -H 127.0.0.1 -p <puerto>`):
//   node capture.mjs <baseUrl> <carpetaSalida> <etiqueta>     -> capturas + fuentes.json
//   node capture.mjs --diff <carpetaA> <carpetaB>              -> diff numérico de píxeles
//
// Capturas: landing (1440x900 y 360x640, pantalla y página completa) y login
// (1440x900 y 360x640, en reposo y con error de red simulado). Todo con
// prefers-reduced-motion: reduce (el 3D de la landing no carga y no hay
// animaciones a mitad de camino). El error del login se provoca cortando las
// peticiones a *.supabase.co con Fetch.failRequest (sin red real).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CDP_PORT = Number(process.env.CDP_PORT || 3421);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Espera a que las imágenes visibles terminen de cargar y decodificar (si no,
// una foto a medio decodificar da diferencias de píxeles entre corridas).
const IMGS_READY = `Promise.all([...document.images].filter((i) => { const b = i.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width > 0; }).map((i) => (i.complete ? i.decode() : new Promise((ok) => { i.addEventListener("load", ok, { once: true }); i.addEventListener("error", ok, { once: true }); }).then(() => i.decode())).catch(() => {}))).then(() => true)`;

async function startChrome() {
  const profile = join(tmpdir(), `ms-cdp-${process.pid}`);
  const proc = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "--font-render-hinting=none",
    "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return { proc, profile, ws: (await r.json()).webSocketDebuggerUrl };
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome no respondió por CDP");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const m = { id: ++id, method, params };
      if (sessionId) m.sessionId = sessionId;
      pending.set(m.id, { res, rej });
      ws.send(JSON.stringify(m));
    });
  return new Promise((ok) => (ws.onopen = () => ok({ ws, send, on: (f) => listeners.push(f) })));
}

async function newPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");
  await s("Network.enable");
  await s("Network.setCacheDisabled", { cacheDisabled: true });
  await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  return { targetId, sessionId, s };
}

async function evalJs(s, expression) {
  const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function capture(baseUrl, outDir, label) {
  mkdirSync(outDir, { recursive: true });
  const chrome = await startChrome();
  const cdp = await connect(chrome.ws);
  const fonts = {};
  const shots = [];
  try {
    const cases = [
      { name: "landing", path: "/", w: 1440, h: 900, full: true },
      { name: "landing", path: "/", w: 360, h: 640, full: true },
      { name: "login", path: "/login", w: 1440, h: 900 },
      { name: "login", path: "/login", w: 360, h: 640 },
      { name: "login-error", path: "/login", w: 1440, h: 900, error: true },
      { name: "login-error", path: "/login", w: 360, h: 640, error: true },
    ];
    for (const c of cases) {
      const p = await newPage(cdp);
      const reqs = new Map();
      cdp.on((m) => {
        if (m.sessionId !== p.sessionId) return;
        if (m.method === "Network.responseReceived") reqs.set(m.params.requestId, { url: m.params.response.url, type: m.params.type });
        if (m.method === "Network.loadingFinished" && reqs.has(m.params.requestId)) reqs.get(m.params.requestId).bytes = m.params.encodedDataLength;
        if (m.method === "Fetch.requestPaused") p.s("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "ConnectionRefused" }).catch(() => {});
      });
      if (c.error) await p.s("Fetch.enable", { patterns: [{ urlPattern: "*supabase.co*" }] });
      await p.s("Emulation.setDeviceMetricsOverride", { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: c.w < 768 });
      await p.s("Page.navigate", { url: baseUrl + c.path });
      await evalJs(p.s, `new Promise(r => { const go = () => r(true); if (document.readyState === "complete") go(); else addEventListener("load", go); })`);
      await evalJs(p.s, "document.fonts.ready.then(() => true)");
      await evalJs(p.s, IMGS_READY);
      await sleep(1500);
      if (c.error) {
        await evalJs(p.s, `(() => {
          const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
          set(document.getElementById("email"), "equipo@ejemplo.com");
          set(document.getElementById("password"), "contrasena-de-prueba");
          document.querySelector(".lg-form").requestSubmit();
          return true;
        })()`);
        for (let i = 0; i < 40; i++) {
          const has = await evalJs(p.s, `!!document.querySelector(".lg-alert span")`);
          if (has) break;
          await sleep(250);
        }
        await sleep(1200);
      }
      const tag = `${c.name}-${c.w}x${c.h}`;
      const shot = await p.s("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(outDir, `${tag}-${label}.png`), Buffer.from(shot.data, "base64"));
      shots.push(`${tag}-${label}.png`);
      if (c.full) {
        // Página completa por tramos del alto de la pantalla: captureBeyondViewport
        // no pinta las secciones con content-visibility: auto, así que se
        // desplaza y se captura cada tramo tal como lo vería la persona.
        const total = await evalJs(p.s, "document.documentElement.scrollHeight");
        let n = 1;
        for (let y = c.h; y < total; y += c.h, n++) {
          await evalJs(p.s, `(async () => { scrollTo(0, ${y}); await new Promise(r => setTimeout(r, 400)); return true; })()`);
          await evalJs(p.s, IMGS_READY);
          await sleep(500);
          const seg = await p.s("Page.captureScreenshot", { format: "png" });
          const f = `${tag}-tramo${String(n).padStart(2, "0")}-${label}.png`;
          writeFileSync(join(outDir, f), Buffer.from(seg.data, "base64"));
          shots.push(f);
        }
      }
      if (!c.error) {
        fonts[tag] = [...reqs.values()].filter((r) => r.type === "Font").map((r) => ({ file: r.url.replace(baseUrl, ""), bytes: r.bytes }));
      }
      await cdp.send("Target.closeTarget", { targetId: p.targetId });
    }
  } finally {
    cdp.ws.close();
    chrome.proc.kill();
    await sleep(800);
    try { rmSync(chrome.profile, { recursive: true, force: true }); } catch {}
  }
  writeFileSync(join(outDir, `fuentes-${label}.json`), JSON.stringify(fonts, null, 2) + "\n");
  console.log(JSON.stringify({ shots, fonts }, null, 2));
}

async function diff(dirA, dirB) {
  const a = readdirSync(dirA).filter((f) => f.endsWith(".png"));
  const b = readdirSync(dirB).filter((f) => f.endsWith(".png"));
  const key = (f) => f.replace(/-(antes|despues)\.png$/, "");
  const chrome = await startChrome();
  const cdp = await connect(chrome.ws);
  const results = [];
  try {
    const p = await newPage(cdp);
    for (const fa of a) {
      const fb = b.find((x) => key(x) === key(fa));
      if (!fb) { results.push({ captura: key(fa), error: "sin par" }); continue; }
      const da = readFileSync(resolve(dirA, fa)).toString("base64");
      const db = readFileSync(resolve(dirB, fb)).toString("base64");
      const r = await evalJs(p.s, `(async () => {
        const load = (b64) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = "data:image/png;base64," + b64; });
        const [ia, ib] = await Promise.all([load(${JSON.stringify(da)}), load(${JSON.stringify(db)})]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
        const px = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
        const A = px(ia), B = px(ib);
        let diffPx = 0, maxDelta = 0;
        for (let i = 0; i < A.length; i += 4) {
          const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]), Math.abs(A[i + 3] - B[i + 3]));
          if (d > 0) { diffPx++; if (d > maxDelta) maxDelta = d; }
        }
        return { width: ia.width, height: ia.height, pixels: A.length / 4, diffPx, maxDelta };
      })()`);
      results.push({ captura: key(fa), ...r });
    }
    await cdp.send("Target.closeTarget", { targetId: p.targetId });
  } finally {
    cdp.ws.close();
    chrome.proc.kill();
    await sleep(800);
    try { rmSync(chrome.profile, { recursive: true, force: true }); } catch {}
  }
  for (const r of results) console.log(JSON.stringify(r));
}

if (process.argv[2] === "--diff") await diff(process.argv[3], process.argv[4]);
else await capture(process.argv[2], process.argv[3], process.argv[4]);
