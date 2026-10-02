// RNF-A1, A6: axe-core (WCAG 2.0/2.1/2.2 A + AA + best-practice) at 3 viewports; sections are scrolled into view first (content-visibility)
import { launch, BASE, VIEWPORTS, check } from "./lib.mjs";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs";

const br = await launch({ headless: true });
const all = {};
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  for (const mode of ["default", "reduced"]) {
    const ctx = await br.newContext({ viewport: vp, reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 250) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
    await page.waitForTimeout(1500);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    const v = res.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, help: x.help, sample: x.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(0, 2).join(" ").slice(0, 200)) }));
    const incomplete = res.incomplete.map((x) => ({ id: x.id, n: x.nodes.length, sample: x.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
    all[`${name}-${mode}`] = { passes: res.passes.length, violations: v, incomplete };
    const serious = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    check(`RNF-A6 axe ${name}/${mode}: 0 críticos y 0 serios`, serious.length === 0, { critical_serious: serious, otherViolations: v.filter((x) => !serious.includes(x)).map((x) => x.id + "(" + x.impact + "):" + x.n), passes: res.passes.length });
    const cc = res.passes.find((p) => p.id === "color-contrast");
    console.log(`${name}/${mode} color-contrast nodes checked: ${cc ? cc.nodes.length : 0}; incomplete: ${JSON.stringify(incomplete.map((i) => i.id + ":" + i.n))}`);
    await ctx.close();
  }
}
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/axe.json", JSON.stringify(all, null, 1));
await br.close();
