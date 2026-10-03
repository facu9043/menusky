// Lado de la página del 3D del hero. Elige dónde corre la escena y le
// pasa lo que solo la página sabe (tamaño, puntero, scroll, visibilidad).
//
// - Camino normal: Web Worker + OffscreenCanvas. three se descarga,
//   evalúa y compila dentro del worker; el hilo principal no se bloquea
//   (CA-9.6: evaluar three en la página era una tarea de ~300 ms).
// - Sin OffscreenCanvas (navegadores viejos): la misma escena en la
//   página, con import() dinámico (chunk aparte).
//
// Solo importa TIPOS de scene/worker: three nunca entra en el JS inicial.
import type { BurgerApi, BurgerInit } from "./scene";
import type { WorkerIn, WorkerOut } from "./burger.worker";

type Callbacks = { onReady: () => void; onFallback: () => void };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function workerDriver(canvas: HTMLCanvasElement, init: Omit<BurgerInit, "canvas">, cb: Callbacks): BurgerApi {
  const worker = new Worker(new URL("./burger.worker.ts", import.meta.url), { type: "module" });
  const offscreen = canvas.transferControlToOffscreen();
  const send = (msg: WorkerIn, transfer: Transferable[] = []) => worker.postMessage(msg, transfer);
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    if (e.data.type === "ready") cb.onReady();
    else cb.onFallback();
  };
  worker.onerror = () => cb.onFallback();
  send({ type: "init", canvas: offscreen, ...init }, [offscreen]);
  let killTimer = 0;
  return {
    resize: (width, height) => send({ type: "resize", width, height }),
    pointer: (x, y) => send({ type: "pointer", x, y }),
    explode: (value) => send({ type: "explode", value }),
    setActive: (value) => send({ type: "active", value }),
    dispose: () => {
      if (killTimer) return;
      // Le da tiempo a liberar el contexto WebGL; si no, se corta igual.
      send({ type: "dispose" });
      killTimer = window.setTimeout(() => worker.terminate(), 1000);
    },
  };
}

/**
 * Arranca la escena sobre `canvas` y la conecta con la página.
 * Devuelve la función que la detiene y libera todo.
 */
export async function startBurger(canvas: HTMLCanvasElement, cb: Callbacks): Promise<() => void> {
  const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // Armado por scroll según dónde está el canvas en la pantalla: desarmada
  // mientras su centro está por debajo del 50% del alto de la ventana,
  // armada cuando llega cerca del borde superior. Sirve igual para
  // escritorio (hero arriba) y móvil (el 3D aparece después del texto).
  const explodeTarget = () => {
    const r = canvas.getBoundingClientRect();
    const vh = window.innerHeight;
    return smooth(clamp((r.top + r.height / 2 - vh * 0.12) / (vh * 0.36), 0, 1));
  };

  const init = {
    mobile,
    finePointer,
    dpr: window.devicePixelRatio || 1,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    explode: explodeTarget(),
  };

  let api: BurgerApi;
  if (typeof canvas.transferControlToOffscreen === "function" && typeof Worker === "function") {
    api = workerDriver(canvas, init, cb);
  } else {
    const { createBurger } = await import("./scene");
    api = createBurger({ canvas, ...init }, cb);
  }

  // Puntero (solo mouse/trackpad), normalizado a -1..1.
  const onPointer = (e: PointerEvent) => {
    api.pointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

  // Scroll: un cálculo por cuadro como máximo.
  let scrollRaf = 0;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      api.explode(explodeTarget());
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  const ro = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1].contentRect;
    if (box.width && box.height) api.resize(box.width, box.height);
  });
  ro.observe(canvas);

  // Dibuja solo en pantalla y con la pestaña visible.
  let onScreen = false;
  const sync = () => api.setActive(onScreen && !document.hidden);
  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    sync();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);

  return () => {
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    api.dispose();
  };
}
