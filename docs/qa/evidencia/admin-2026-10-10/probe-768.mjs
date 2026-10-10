// QA-AD-03: mide las pildoras de Carta en 768x1024 tactil y que color de fondo tiene el contenedor principal (CA-5.1).
import { launch, login, APP, resetMock } from "../../../design/admin/evidencia/carta-4a/lib.mjs";
await resetMock();
const b = await launch();
const c = await b.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true });
const p = await c.newPage();
await login(p, "admin@demo.test", "/admin/menu");
console.log("pointer coarse:", await p.evaluate(() => matchMedia("(pointer: coarse)").matches), "| hover none:", await p.evaluate(() => matchMedia("(hover: none)").matches));
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".adm-pill")].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 22), Math.round(r.width), Math.round(r.height), getComputedStyle(e).minHeight]; }))));
console.log(JSON.stringify(await p.evaluate(() => { const o = []; let e = document.querySelector("main"); while (e) { o.push([e.tagName + "." + [...e.classList].join("."), getComputedStyle(e).backgroundColor]); e = e.parentElement; } return o; })));
await b.close();
