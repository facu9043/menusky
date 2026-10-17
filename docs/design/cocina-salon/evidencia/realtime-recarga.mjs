// Hallazgo preexistente (no es del rediseño): tras RECARGAR /kitchen con la sesión ya guardada, el tiempo
// real del mock no entrega los pedidos nuevos (el phx_join sale sin access_token). Sin recargar (entrando
// desde /login) sí llegan. Se comparó master d66b639 (build --webpack de un clon temporal en 3423, ya
// borrado) con esta rama (3422), contra el mismo mock (3421). Salida en realtime-recarga-salida.txt.
import { launch, resetMock, mockEvent, waitFor } from "./lib-staff.mjs";
const b = await launch();
for (const app of ["http://127.0.0.1:3423", "http://127.0.0.1:3422"]) for (const reload of [false, true]) {
  await resetMock();
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(`${app}/login?redirect=%2Fkitchen`);
  await p.fill("#email", "cocina@demo.test"); await p.fill("#password", "demo-1234"); await p.click("#lg-submit");
  await p.waitForURL((u) => u.pathname === "/kitchen", { timeout: 20000 });
  if (reload) await p.goto(`${app}/kitchen`);
  await p.waitForTimeout(2500);
  await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 2 }] });
  const r = await waitFor(async () => (await p.getByText("Provoleta").count()) > 0, 5000);
  console.log(app.endsWith("3423") ? "master" : "rama  ", reload ? "con recarga" : "sin recarga", r);
  await ctx.close();
}
await b.close();
