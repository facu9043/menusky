// List axe "incomplete" color-contrast nodes (needs manual review) with reason, and screenshot-based contrast estimate is left to human review
import { launch, BASE } from "./lib.mjs";
import { AxeBuilder } from "@axe-core/playwright";
const br = await launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "load" });
await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 250) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
await page.waitForTimeout(1000);
const res = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
const inc = res.incomplete[0]?.nodes || [];
const byReason = {};
for (const n of inc) { const k = (n.any[0]?.data?.messageKey) || "?"; (byReason[k] ||= []).push(n.target.join(" ").slice(-60) + " :: " + (n.html.replace(/<[^>]+>/g, "").slice(0, 0))); }
console.log(Object.fromEntries(Object.entries(byReason).map(([k, v]) => [k, v.length])));
for (const [k, v] of Object.entries(byReason)) console.log(k, JSON.stringify(v.slice(0, 6), null, 0));
await br.close();
