import { chromium } from "playwright";
export const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
export const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
export const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
export async function launch(opts = {}) {
  return chromium.launch({
    executablePath: opts.exe || CHROME,
    headless: opts.headless !== false,
    args: opts.args || [],
  });
}
export const VIEWPORTS = {
  mobile: { width: 360, height: 640 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};
export const results = [];
export function check(id, ok, evidence) {
  results.push({ id, ok });
  const ev = typeof evidence === "string" ? evidence : JSON.stringify(evidence);
  console.log(`${ok ? "OK   " : "FALLA"} ${id} :: ${ev}`);
}
