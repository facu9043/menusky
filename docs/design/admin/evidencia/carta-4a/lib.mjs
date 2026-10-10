// Utilidades de las pruebas de la parte 4a (Frontend). No son parte de la app.
// Playwright se toma de una carpeta externa (TOOLS_DIR, con playwright y
// @axe-core/playwright instalados); la app no suma dependencias.
import { createRequire } from "node:module";
import path from "node:path";

const TOOLS = process.env.TOOLS_DIR;
if (!TOOLS) throw new Error("Falta TOOLS_DIR (carpeta con node_modules/playwright)");
const req = createRequire(path.join(TOOLS, "package.json"));
export const { chromium } = req("playwright");
export const AxeBuilder = req("@axe-core/playwright").default;

export const APP = process.env.APP_URL ?? "http://127.0.0.1:3432";
export const MOCK = process.env.MOCK_URL ?? "http://127.0.0.1:3431";

export async function resetMock() {
  const r = await fetch(`${MOCK}/__mock/reset`, { method: "POST" });
  if (!r.ok) throw new Error(`reset ${r.status}`);
}
export async function mockState() {
  return (await fetch(`${MOCK}/__mock/state`)).json();
}
export async function mockEvent(body) {
  const r = await fetch(`${MOCK}/__mock/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

export async function launch() {
  return chromium.launch({ channel: "chrome", headless: true });
}

export async function login(page, email = "admin@demo.test", redirect = "/admin/menu") {
  await page.goto(`${APP}/login?redirect=${encodeURIComponent(redirect)}`);
  await page.fill("#email", email);
  await page.fill("#password", "demo-1234");
  await page.click("#lg-submit");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

let failures = 0;
const lines = [];
export function check(id, ok, detail = "") {
  const line = `${ok ? "OK  " : "FAIL"} ${id}${detail ? ` | ${detail}` : ""}`;
  lines.push(line);
  console.log(line);
  if (!ok) failures++;
}
export function note(text) {
  lines.push(`     ${text}`);
  console.log(`     ${text}`);
}
export function summary() {
  const s = `\n${lines.filter((l) => l.startsWith("OK")).length} OK, ${failures} FAIL`;
  console.log(s);
  return failures;
}
