// Utilidades del paso 4b (Frontend). No son parte de la app. Reusan ../carta-4a/lib.mjs.
import { MOCK, mockState } from "../carta-4a/lib.mjs";

export const H = { apikey: "mock-anon-key", "content-type": "application/json" };
export const RID_A = "11111111-1111-4111-8111-111111111111";
export const RID_B = "22222222-2222-4222-8222-222222222222";
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function until(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return Date.now() - t0;
    await wait(100);
  }
  return false;
}

/** Fallas del proxy (../carta-4a/fault-proxy.mjs): categories, tables, calls, theme, delay. */
export async function fault(body) {
  await fetch(`${MOCK}/__fault`, { method: "POST", body: JSON.stringify(body) });
}
export const NO_FAULTS = { categories: false, tables: false, calls: false, theme: false, menuItemsWrite: false, delay: 0 };

export async function token(email) {
  const r = await fetch(`${MOCK}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password: "demo-1234" }),
  });
  return (await r.json()).access_token;
}

async function rest(tok, method, pathAndQuery, body) {
  const r = await fetch(`${MOCK}/rest/v1/${pathAndQuery}`, {
    method,
    headers: { ...H, Authorization: `Bearer ${tok}`, Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${pathAndQuery} ${r.status} ${await r.text()}`);
  return r.json().catch(() => null);
}

/**
 * Deja el restaurante B (admin-b@demo.test) vacío SOLO para la prueba, con las mismas
 * escrituras que haría su admin (sin tocar el comportamiento del mock). Borrar sus mesas
 * borra sus pedidos (cascada); después se pueden borrar sus categorías y platos.
 * opts.tables: mesas nuevas a crear (etiquetas) después de vaciar.
 */
export async function emptyRestaurantB({ menu = true, tables = [] } = {}) {
  const tok = await token("admin-b@demo.test");
  for (const t of (await mockState()).tables.filter((x) => x.restaurant_id === RID_B)) {
    await rest(tok, "DELETE", `tables?id=eq.${t.id}`);
  }
  if (menu) await rest(tok, "DELETE", `categories?restaurant_id=eq.${RID_B}`);
  let i = 0;
  for (const label of tables) {
    await rest(tok, "POST", "tables", { restaurant_id: RID_B, label, qr_token: `b-prueba-${Date.now()}-${i++}` });
  }
}

export async function setAvailability(email, name, value) {
  const tok = await token(email);
  await rest(tok, "PATCH", `menu_items?name=eq.${encodeURIComponent(name)}`, { is_available: value });
}

/** Sin scroll horizontal (CA-13.6). */
export async function noHScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}
