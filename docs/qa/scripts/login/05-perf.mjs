// QA login 05: rendimiento (HU-9, CA-10.11): peso por CDP sin cache, CLS, costo en reposo (normal vs reduced-motion), traza de Layout/Paint, tope de 90 s.
// Correr desde la raiz con el servidor en QA_BASE:  node docs/qa/scripts/login/05-perf.mjs [fases: weight,cls,idle,trace,cap]
// Aviso: headless en una PC de pocos nucleos; los % son orientativos (no reemplazan la medicion en el Celeron con el Administrador de tareas).
import { launch, check, summary, sleep, BASE } from "./lib.mjs";
const phases = (process.argv[2] || "weight,cls,idle,trace,cap").split(",");
const LOGIN = BASE + "/login";
const b = await launch(9344);
const cpu = async () => Object.fromEntries((await b.send("SystemInfo.getProcessInfo")).processInfo.map((p) => [p.type + ":" + p.id, p.cpuTime]));
const pick = (m) => Object.fromEntries(m.metrics.filter((x) => ["ScriptDuration", "TaskDuration", "LayoutCount", "LayoutDuration", "RecalcStyleCount", "Frames"].includes(x.name)).map((x) => [x.name, x.value]));
function diffCpu(a, c, secs) {
  const out = {}; for (const k of Object.keys(c)) out[k] = +(((c[k] - (a[k] ?? 0)) / secs) * 100).toFixed(2);
  const rend = Object.entries(out).filter(([k]) => k.startsWith("renderer")).sort((x, y) => y[1] - x[1])[0];
  const gpu = Object.entries(out).find(([k]) => k.startsWith("GPU"));
  return { renderer: rend?.[1], gpu: gpu?.[1] };
}

try {
  if (phases.includes("weight")) {
    for (const [w, h, mobile] of [[1440, 900, false], [360, 640, true]]) {
      const p = await b.newPage();
      const reqs = new Map();
      p.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0 }));
      p.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
      await p.send("Network.enable"); await p.send("Network.setCacheDisabled", { cacheDisabled: true });
      await p.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
      await p.goto(LOGIN); await sleep(4000);
      const list = [...reqs.values()];
      const sum = (f) => +(list.filter(f).reduce((a, r) => a + r.bytes, 0) / 1024).toFixed(1);
      const total = sum(() => true);
      const types = {}; for (const r of list) types[r.type] = (types[r.type] || 0) + 1;
      const ext = list.filter((r) => new URL(r.url).origin !== new URL(BASE).origin);
      console.log(`[${w}x${h}] otros:`, list.filter((r) => r.type === "Other").map((r) => r.url.replace(BASE, "") + " " + r.bytes + "B"));
      console.log(`[${w}x${h}] ${list.length} peticiones; por tipo: ${JSON.stringify(types)}; KB: doc ${sum((r) => r.type === "Document")}, JS ${sum((r) => r.type === "Script")}, CSS ${sum((r) => r.type === "Stylesheet")}, fuentes ${sum((r) => r.type === "Font")}, otros ${sum((r) => !["Document", "Script", "Stylesheet", "Font"].includes(r.type))}`);
      check(`CA-9.2 [${w}x${h}] peso total transferido (HTML+JS+CSS+fuentes, sin cache) <= 380 KB`, total <= 380, { total_kb: total, fuentes: list.filter((r) => r.type === "Font").map((r) => r.url.split("/").pop() + " " + (r.bytes / 1024).toFixed(1) + "KB") });
      check(`CA-9.3/3.2/RNF-S5 [${w}x${h}] 0 imagenes, 0 peticiones a terceros, 0 peticiones por la mascota (el unico 'Other' es /icon.svg, el favicon de la app)`, !list.some((r) => r.type === "Image") && ext.length === 0 && !list.some((r) => /mascot|pomo/i.test(r.url) || (/\.svg/i.test(r.url) && !/\/icon\.svg/.test(r.url))), { imagenes: list.filter((r) => r.type === "Image").length, externos: ext.map((r) => r.url) });
      check(`CA-2.3 [${w}x${h}] fuentes: solo las de next/font del propio origen`, list.filter((r) => r.type === "Font").every((r) => r.url.startsWith(BASE + "/_next/static/media/")), list.filter((r) => r.type === "Font").length + " fuentes");
      await p.close();
    }
  }
  if (phases.includes("cls")) {
    for (const [w, h, rate] of [[1440, 900, 1], [360, 640, 1], [360, 640, 4], [320, 568, 4]]) {
      const p = await b.newPage();
      await p.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 1024 });
      await p.send("Emulation.setCPUThrottlingRate", { rate }); await p.send("Network.enable"); await p.send("Network.setCacheDisabled", { cacheDisabled: true });
      await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__cls = 0; window.__sh = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__sh.push(+e.value.toFixed(4)); } }).observe({ type: 'layout-shift', buffered: true });` });
      await p.goto(LOGIN); await sleep(4000);
      const r = await p.eval(`({ cls: +window.__cls.toFixed(4), shifts: window.__sh })`);
      check(`CA-5.8 CLS en la carga ${w}x${h} CPU ${rate}x <= 0,05`, r.cls <= 0.05, r);
      await p.close();
    }
  }
  const measure = async (reduced, rate, secsList) => {
    const p = await b.newPage();
    await p.send("Performance.enable", { timeDomain: "timeTicks" });
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
    await p.send("Emulation.setCPUThrottlingRate", { rate });
    await p.goto(LOGIN); await sleep(3000);
    const anims = await p.eval(`document.getAnimations().length`); const vis = await p.eval(`document.visibilityState + '/' + document.hasFocus()`);
    const m0 = pick(await p.send("Performance.getMetrics")); const c0 = await cpu(); const out = { reduced, rate, anims_3s: anims, visibilidad_y_foco: vis };
    let last = 0;
    for (const s of secsList) { await sleep((s - last) * 1000); last = s; const m = pick(await p.send("Performance.getMetrics")); const c = await cpu();
      out["w" + s] = { ScriptMs: +((m.ScriptDuration - m0.ScriptDuration) * 1000).toFixed(2), TaskMs: +((m.TaskDuration - m0.TaskDuration) * 1000).toFixed(1), Layout: m.LayoutCount - m0.LayoutCount, RecalcStyle: m.RecalcStyleCount - m0.RecalcStyleCount, Frames: m.Frames - m0.Frames, ...diffCpu(c0, c, s) }; }
    await p.close(); return out;
  };
  if (phases.includes("idle")) {
    const warm = await b.newPage(); await warm.goto(LOGIN); await sleep(3000); await warm.close();
    const R = {};
    const RATES = (process.env.QA_RATES || "1,4").split(",").map(Number);
    for (const [red, rate] of [[false, 1], [true, 1], [false, 4], [true, 4]].filter(([, r]) => RATES.includes(r))) { R[`${red ? "red" : "norm"}${rate}`] = await measure(red, rate, rate === 1 ? [10, 30] : [10]); console.log(JSON.stringify(R[`${red ? "red" : "norm"}${rate}`])); }
    const n = R.norm1, r = R.red1;
    check("CA-10.11.1 scripting ~0: ScriptDuration <= 10 ms en 10 s (normal, 1x)", n.w10.ScriptMs <= 10, { n10: n.w10.ScriptMs, n30: n.w30.ScriptMs, reduced10: r.w10.ScriptMs });
    check("CA-10.11.2 sin layout en reposo: LayoutCount no crece en 10 s ni en 30 s", n.w10.Layout === 0 && n.w30.Layout === 0, { w10: n.w10.Layout, w30: n.w30.Layout, recalcStyle10: n.w10.RecalcStyle });
    check("CA-10.11.4 CPU renderizador (headless) <= 3 % absoluto y <= +2 puntos vs reduced-motion (30 s)", n.w30.renderer <= 3 && n.w30.renderer - r.w30.renderer <= 2, { normal: n.w30.renderer, reduced: r.w30.renderer, dif: +(n.w30.renderer - r.w30.renderer).toFixed(2) });
    check("CA-10.11.4 CPU proceso GPU (headless/SwiftShader) <= 3 % absoluto y <= +2 puntos vs reduced-motion (30 s)", (n.w30.gpu ?? 0) <= 3 && (n.w30.gpu ?? 0) - (r.w30.gpu ?? 0) <= 2, { normal: n.w30.gpu, reduced: r.w30.gpu, dif: +((n.w30.gpu ?? 0) - (r.w30.gpu ?? 0)).toFixed(2), w10: { n: n.w10.gpu, r: r.w10.gpu } });
    if (R.norm4) {
      // Con CPU 4x el % de proceso 'renderer' sale ~25-38 % TAMBIEN con reduced-motion (pagina estatica): es un artefacto de la emulacion de throttling en esta PC, no de la pagina. Se usa el trabajo del hilo principal de la pagina (TaskDuration), que si es de la pagina.
      const nm = R.norm4.w10.TaskMs / 10000 * 100, rm = R.red4.w10.TaskMs / 10000 * 100;
      check("CA-10.11.5 CPU 4x (10 s): hilo principal de la pagina <= 8 % de un nucleo (proxy; el % de proceso queda contaminado por el throttling, ver informe)", nm <= 8, { hiloPrincipal_normal_pct: +nm.toFixed(2), hiloPrincipal_reduced_pct: +rm.toFixed(2), procesoRenderer_normal_pct_NO_CONFIABLE: R.norm4.w10.renderer, procesoRenderer_reduced_pct_NO_CONFIABLE: R.red4.w10.renderer });
    }
    check("CA-8.1 con reduced-motion 0 animaciones en reposo", r.anims_3s === 0 && (!R.red4 || R.red4.anims_3s === 0), { r: r.anims_3s });
  }
  if (phases.includes("gpu")) {
    // CA-10.11.4/6 repetido: normal vs reduced, ventanas de 10 s tras 5 s de calentamiento, 3 repeticiones (dispersion entre corridas)
    const out = [];
    for (let rep = 0; rep < 3; rep++) for (const reduced of [false, true]) {
      const p = await b.newPage();
      await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
      await p.goto(LOGIN); await sleep(5000);
      const vis = await p.eval(`document.visibilityState + '/' + document.hasFocus()`);
      const w = []; for (let k = 0; k < 3; k++) { const c0 = await cpu(); await sleep(10000); const d = diffCpu(c0, await cpu(), 10); w.push([d.renderer, d.gpu]); }
      const avg = (i) => +(w.reduce((a, x) => a + (x[i] ?? 0), 0) / w.length).toFixed(2);
      const row = { rep, reduced, vis, ventanas10s_renderer_gpu: w, prom_renderer: avg(0), prom_gpu: avg(1) }; out.push(row); console.log(JSON.stringify(row));
      await p.close(); await sleep(1500);
    }
    const g = (r) => out.filter((x) => x.reduced === r);
    const mean = (a, k) => +(a.reduce((s2, x) => s2 + x[k], 0) / a.length).toFixed(2);
    const nR = mean(g(false), "prom_renderer"), rR = mean(g(true), "prom_renderer"), nG = mean(g(false), "prom_gpu"), rG = mean(g(true), "prom_gpu");
    console.log(JSON.stringify({ resumen: { renderer_normal: nR, renderer_reduced: rR, dif_renderer: +(nR - rR).toFixed(2), gpu_normal: nG, gpu_reduced: rG, dif_gpu: +(nG - rG).toFixed(2) } }));
    process.exit(0);
  }
  if (phases.includes("idle4x")) {
    // CPU 4x con un Chrome nuevo por muestra (el proceso 'renderer' con mas CPU de otra pestana contamina la medicion en el mismo navegador)
    await b.close();
    for (const reduced of [false, true, false, true]) {
      const bb = await launch(9348);
      const c = async () => (await bb.send("SystemInfo.getProcessInfo")).processInfo.map((p) => ({ k: p.type + ":" + p.id, t: p.cpuTime }));
      const p = await bb.newPage();
      await p.send("Performance.enable", { timeDomain: "timeTicks" });
      await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
      await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await p.goto(LOGIN); await sleep(5000);
      const m0 = pick(await p.send("Performance.getMetrics")); const c0 = await c();
      await sleep(10000);
      const m1 = pick(await p.send("Performance.getMetrics")); const c1 = await c();
      const det = c1.map((x) => { const y = c0.find((z) => z.k === x.k); return x.k + "=" + (((x.t - (y?.t ?? 0)) / 10) * 100).toFixed(1) + "%"; });
      console.log(JSON.stringify({ reduced, rate: 4, mainThreadTaskMs10s: +((m1.TaskDuration - m0.TaskDuration) * 1000).toFixed(1), scriptMs: +((m1.ScriptDuration - m0.ScriptDuration) * 1000).toFixed(2), layout: m1.LayoutCount - m0.LayoutCount, procesos: det }));
      await bb.close();
    }
    process.exit(0);
  }
  if (phases.includes("trace")) {
    for (const [reduced, rate] of [[false, 1], [false, 4]]) {
      const p = await b.newPage();
      await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
      await p.send("Emulation.setCPUThrottlingRate", { rate });
      await p.goto(LOGIN); await sleep(3000);
      const stage = await p.eval(`(() => { const r = document.querySelector('.lg-stage').getBoundingClientRect(); return [r.x, r.y, r.right, r.bottom].map(Math.round); })()`);
      const events = [];
      const off = b.on((m) => { if (m.method === "Tracing.dataCollected") events.push(...m.params.value); });
      const done = new Promise((r) => { const o = b.on((m) => { if (m.method === "Tracing.tracingComplete") { o(); r(); } }); });
      await b.send("Tracing.start", { transferMode: "ReportEvents", traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "blink.animations", "cc", "benchmark"] } });
      await sleep(10000); await b.send("Tracing.end"); await done; off();
      const compThreads = events.filter((e) => e.name === "thread_name" && e.args.name === "Compositor").map((e) => e.pid + ":" + e.tid);
      const rt = {}; for (const e of events) if (e.name === "RunTask" && compThreads.includes(e.pid + ":" + e.tid)) rt[e.pid] = (rt[e.pid] || 0) + 1;
      const pagePid = +Object.entries(rt).sort((a, b) => b[1] - a[1])[0][0];
      const main = new Set(events.filter((e) => e.name === "thread_name" && e.args.name === "CrRendererMain" && e.pid === pagePid).map((e) => e.pid + ":" + e.tid));
      const onMain = (e) => main.has(e.pid + ":" + e.tid);
      const cnt = (n) => events.filter((e) => e.name === n && onMain(e) && e.ph !== "E").length;
      const long = events.filter((e) => e.name === "RunTask" && onMain(e) && e.dur > 50000).length;
      const taskMs = events.filter((e) => e.name === "RunTask" && onMain(e)).reduce((a, e) => a + (e.dur || 0), 0) / 1000;
      const paints = events.filter((e) => e.name === "Paint" && onMain(e));
      const clips = paints.map((e) => e.args?.data?.clip).filter(Boolean).map((q) => [Math.min(q[0], q[6]), Math.min(q[1], q[3]), Math.max(q[2], q[4]), Math.max(q[5], q[7])]);
      const union = clips.reduce((u, c) => u ? [Math.min(u[0], c[0]), Math.min(u[1], c[1]), Math.max(u[2], c[2]), Math.max(u[3], c[3])] : c, null);
      const failed = events.filter((e) => e.name === "Animation" && e.args?.data?.compositeFailed).map((e) => e.args.data.compositeFailed);
      const res = { rate, mainTaskMs: +taskMs.toFixed(1), longTasks: long, Layout: cnt("Layout"), UpdateLayoutTree: cnt("UpdateLayoutTree"), Paint: paints.length, paintUnion: union && union.map(Math.round), mascota: stage, FireAnimationFrame: cnt("FireAnimationFrame"), TimerFire: cnt("TimerFire"), FunctionCall: cnt("FunctionCall"), compositeFailed: failed };
      const inside = !union || (union[0] >= stage[0] - 2 && union[1] >= stage[1] - 2 && union[2] <= stage[2] + 2 && union[3] <= stage[3] + 2);
      check(`CA-10.11 traza 10 s en reposo CPU ${rate}x: 0 Layout, 0 FireAnimationFrame, 0 TimerFire, 0 tareas largas, repintado solo dentro del recuadro de la mascota`, res.Layout === 0 && res.FireAnimationFrame === 0 && res.TimerFire === 0 && res.longTasks === 0 && inside && failed.length === 0, res);
      await p.close();
    }
  }
  if (phases.includes("cap")) {
    // CA-9.7: pasados los ~90 s el idle se detiene y el CPU cae a ~0
    const p = await b.newPage();
    await p.send("Performance.enable", { timeDomain: "timeTicks" });
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.goto(LOGIN); await sleep(94000);
    const n = await p.eval(`document.getAnimations().length`);
    const m0 = pick(await p.send("Performance.getMetrics")); const c0 = await cpu();
    await sleep(30000);
    const m1 = pick(await p.send("Performance.getMetrics")); const c1 = await cpu();
    const d = diffCpu(c0, c1, 30);
    check("CA-9.7 a ~94-124 s: 0 animaciones y CPU renderizador <= 1 %, GPU <= 1 %, 0 Layout (headless)", n === 0 && (d.renderer ?? 0) <= 1 && (d.gpu ?? 0) <= 1 && m1.LayoutCount === m0.LayoutCount, { animaciones: n, ...d, frames: m1.Frames - m0.Frames, layout: m1.LayoutCount - m0.LayoutCount });
    await p.close();
  }
} finally {
  summary();
  await b.close();
}
