// QA login: cliente CDP minimo (sin dependencias) + simulador de Supabase.
// Uso: QA_BASE=http://127.0.0.1:3230 node <script>.mjs   (rutas relativas, SEC-L-06)
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const BASE = process.env.QA_BASE || "http://127.0.0.1:3230";
const CHROME = process.env.QA_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const results = [];
export function check(id, ok, evidence) {
  results.push({ id, ok });
  const ev = typeof evidence === "string" ? evidence : JSON.stringify(evidence);
  console.log(`${ok ? "PASA  " : "FALLA "} ${id} :: ${ev}`);
}
export function summary() {
  const f = results.filter((r) => !r.ok).length;
  console.log(`\nTOTAL ${results.length} | PASA ${results.length - f} | FALLA ${f}`);
}

export async function launch(port = 9340) {
  const dir = mkdtempSync(join(tmpdir(), "lt-qa-chrome-"));
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--headless=new",
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
    "about:blank"], { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 60; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(250); } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method) for (const l of listeners) l(m);
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const on = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };
  async function newPage() {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const page = {
      sessionId, targetId, send: s,
      on: (method, fn) => on((m) => { if (m.sessionId === sessionId && m.method === method) fn(m.params); }),
      async eval(expr) { const r = await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; },
      async goto(url) { const p = new Promise((r) => { const off = on((m) => { if (m.sessionId === sessionId && m.method === "Page.loadEventFired") { off(); r(); } }); }); await s("Page.navigate", { url }); await Promise.race([p, sleep(30000)]); },
      async key(key, code, vk, text) { await s("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text }); await s("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }); },
      async tab(shift = false) { await s("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 }); await s("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 }); },
      async click(sel) { const r = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`); await s("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 }); await s("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: 1 }); },
      async shot(path) { (await import("node:fs")).writeFileSync(path, Buffer.from((await s("Page.captureScreenshot", {})).data, "base64")); },
      close: () => send("Target.closeTarget", { targetId }),
    };
    await s("Page.enable"); await s("Runtime.enable");
    return page;
  }
  return { send, on, newPage, pid: proc.pid, async close() { try { await send("Browser.close"); } catch {} await sleep(500); try { proc.kill(); } catch {} try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

// ---- Supabase simulado -------------------------------------------------
const b64 = (s) => Buffer.from(s).toString("base64");
const now = () => Math.floor(Date.now() / 1000);
const jwt = (() => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "00000000-0000-0000-0000-000000000001", exp: now() + 3600, role: "authenticated", aud: "authenticated" })).toString("base64url");
  return `${h}.${p}.fake-signature`;
})();
const TOKEN = () => ({ access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now() + 3600, refresh_token: "fake-refresh",
  user: { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "qa@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } });
const MARK = "<!doctype html><title>MARKER</title><p id=marker>marker</p>";

// opts: kind = invalid|offline|503|429|success|nouser|hang|badjson ; role = admin|waiter|none ; staffFail = "error"|"throw"
// Devuelve { state, log }; state.kind y state.role se pueden cambiar en vivo.
export async function mockPage(p, opts = {}) {
  const state = { kind: "invalid", role: "admin", staffFail: null, ...opts };
  const log = { reqs: [], ext: [], supa: [], staff: 0 };
  const cors = [
    { name: "Access-Control-Allow-Origin", value: new URL(BASE).origin },
    { name: "Access-Control-Allow-Credentials", value: "true" },
    { name: "Access-Control-Allow-Headers", value: "*" },
    { name: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS,PATCH,DELETE" },
    { name: "Content-Type", value: "application/json" },
  ];
  await p.send("Network.enable");
  await p.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  p.on("Fetch.requestPaused", async (e) => {
    const u = new URL(e.request.url), id = e.requestId, rt = e.resourceType;
    const ful = (code, body, headers = cors) => p.send("Fetch.fulfillRequest", { requestId: id, responseCode: code, responseHeaders: headers, body: b64(body) }).catch(() => {});
    const cont = () => p.send("Fetch.continueRequest", { requestId: id }).catch(() => {});
    const fail = (r) => p.send("Fetch.failRequest", { requestId: id, errorReason: r }).catch(() => {});
    const html = [{ name: "Content-Type", value: "text/html" }];
    if (u.protocol === "data:" || u.protocol === "blob:") return cont();
    if (u.hostname === "example.supabase.co") {
      log.supa.push(e.request.method + " " + u.pathname);
      if (e.request.method === "OPTIONS") return p.send("Fetch.fulfillRequest", { requestId: id, responseCode: 204, responseHeaders: cors }).catch(() => {});
      if (u.pathname.startsWith("/auth/v1/token")) {
        const k = state.kind;
        if (k === "invalid") return ful(400, JSON.stringify({ code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" }));
        if (k === "503") return ful(503, JSON.stringify({ message: "Service Unavailable" }));
        if (k === "429") return ful(429, JSON.stringify({ code: "over_request_rate_limit", msg: "Request rate limit reached" }));
        if (k === "offline") return fail("InternetDisconnected");
        if (k === "badjson") return ful(200, "<html>not json</html>");
        if (k === "hang") return;
        if (k === "nouser") return ful(200, JSON.stringify({ access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "x" }));
        if (k === "success") return ful(200, JSON.stringify(TOKEN()));
      }
      if (u.pathname.startsWith("/rest/v1/staff_users")) {
        log.staff++;
        if (state.staffFail === "throw") return fail("InternetDisconnected");
        if (state.staffFail === "error") return ful(500, JSON.stringify({ message: "boom" }));
        if (state.role === "none") return ful(200, "null");
        return ful(200, JSON.stringify({ role: state.role }));
      }
      return fail("BlockedByClient");
    }
    if (u.origin !== new URL(BASE).origin) { log.ext.push(e.request.url); return rt === "Document" ? ful(200, MARK, html) : fail("BlockedByClient"); }
    log.reqs.push(e.request.method + " " + u.pathname + u.search);
    if (u.pathname.startsWith("/_next/") || u.pathname === "/login" || u.pathname.startsWith("/favicon") || u.pathname.endsWith(".woff2")) return cont();
    if (state.holdNav) return; // la navegacion nunca termina (red de seguridad de 10 s)
    // rutas internas de destino: pagina marcador (el servidor no llama a supabase)
    return ful(200, MARK, html);
  });
  return { state, log };
}

export async function setViewport(p, width, height, mobile) {
  await p.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: mobile ?? width < 1024 });
}
export async function setReduced(p, on) {
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: on ? "reduce" : "no-preference" }] });
}
export async function fill(p, email = "qa@example.com", pass = "x-test-123") {
  await p.eval(`document.getElementById('email').focus()`);
  await p.send("Input.insertText", { text: email });
  await p.eval(`document.getElementById('password').focus()`);
  await p.send("Input.insertText", { text: pass });
}

export async function waitFor(p, expr, ms = 5000, step = 50) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await p.eval(expr)) return Date.now() - t0; } catch {} await sleep(step); }
  return -1;
}
export async function open(b, { width = 1440, height = 900, redirect, query, reduced = false, scheme, mock = {}, init } = {}) {
  const p = await b.newPage();
  const m = await mockPage(p, mock);
  await setViewport(p, width, height);
  await setReduced(p, reduced);
  if (scheme) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }, { name: "prefers-color-scheme", value: scheme }] });
  p.cons = [];
  p.on("Runtime.consoleAPICalled", (e) => p.cons.push(e.type + ": " + e.args.map((a) => a.value ?? a.description).join(" ")));
  p.on("Runtime.exceptionThrown", (e) => p.cons.push("exception: " + (e.exceptionDetails.exception?.description || e.exceptionDetails.text)));
  p.on("Log.entryAdded", (e) => { if (e.entry.level !== "info" && e.entry.level !== "verbose") p.cons.push("log-" + e.entry.level + ": " + e.entry.text + " " + (e.entry.url || "")); });
  await p.send("Log.enable");
  if (init) await p.send("Page.addScriptToEvaluateOnNewDocument", { source: init });
  const q = query !== undefined ? query : redirect !== undefined ? "?redirect=" + encodeURIComponent(redirect) : "";
  await p.goto(BASE + "/login" + q);
  await waitFor(p, `!!document.getElementById('lg-submit')`, 10000);
  await sleep(300);
  return { p, ...m };
}
