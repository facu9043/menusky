// Utilidades de las pruebas de Cocina y Salón (Frontend, fase cocina-salón). No son parte de la app.
// Reutiliza launch/login/check de las pruebas del admin (TOOLS_DIR, APP_URL, MOCK_URL).
export { launch, login, check, note, summary, APP, MOCK, resetMock, mockEvent, mockState, AxeBuilder } from "../../admin/evidencia/carta-4a/lib.mjs";
import { MOCK } from "../../admin/evidencia/carta-4a/lib.mjs";

const ANON = "mock-anon-key";

/** Token de sesión del mock para hablar con PostgREST como ese usuario (solo para armar escenarios). */
export async function tokenFor(email) {
  const r = await fetch(`${MOCK}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "demo-1234" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`login mock ${email}: ${JSON.stringify(j)}`);
  return j.access_token;
}

export async function rest(token, method, pathAndQuery, body) {
  const r = await fetch(`${MOCK}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: ANON,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}

/** Cuenta los avisos sonoros (playChime crea un oscilador por aviso) sin tocar la app. */
export const CHIME_COUNTER = () => {
  window.__chimes = 0;
  const C = window.AudioContext;
  if (C) {
    const orig = C.prototype.createOscillator;
    C.prototype.createOscillator = function (...a) {
      window.__chimes++;
      return orig.apply(this, a);
    };
  }
};

export async function waitFor(fn, timeout = 6000, step = 150) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return { ok: true, ms: Date.now() - t0 };
    if (Date.now() - t0 > timeout) return { ok: false, ms: Date.now() - t0 };
    await new Promise((r) => setTimeout(r, step));
  }
}

export const toastText = (page) =>
  page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.textContent.trim()).join(" | "));
