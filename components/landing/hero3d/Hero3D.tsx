"use client";

import { useEffect, useRef, type ReactNode } from "react";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Isla del 3D del hero. El servidor pinta `children` (la ilustración SVG)
 * y un canvas vacío. Este componente decide si sube a WebGL: no lo hace
 * con prefers-reduced-motion, sin WebGL o con ahorro de datos. Si
 * corresponde, espera a `load` + la primera interacción de la persona
 * (puntero, toque, rueda, scroll o teclado) + tiempo ocioso + que el hero
 * esté cerca de la pantalla, y recién ahí arranca la escena: en un Web
 * Worker con OffscreenCanvas si el navegador lo permite (three no ocupa
 * el hilo principal) o, si no, en la página (host.ts). Hasta entonces se
 * ve la ilustración estática. El estado se refleja en `data-state`
 * (static | live) y el CSS hace el fundido; React no vuelve a renderizar.
 */
export function Hero3D({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (reduced.matches || nav.connection?.saveData || !supportsWebGL()) return;

    const w = window as IdleWindow;
    let disposed = false;
    let fellBack = false;
    let stopScene: (() => void) | null = null;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let io: IntersectionObserver | null = null;

    const toStatic = () => {
      fellBack = true;
      wrap.dataset.state = "static";
      stopScene?.();
      stopScene = null;
    };

    const boot = async () => {
      try {
        // host.ts es chico; three se descarga recién adentro (en un
        // worker si el navegador lo permite).
        const { startBurger } = await import("./host");
        if (disposed) return;
        const stop = await startBurger(canvas, {
          onReady: () => {
            if (!disposed && !fellBack) wrap.dataset.state = "live";
          },
          onFallback: toStatic,
        });
        // Si se desmontó o falló mientras arrancaba, se libera ya.
        if (disposed || fellBack) stop();
        else stopScene = stop;
      } catch {
        // Si el chunk, el worker o WebGL fallan, queda la ilustración estática.
        toStatic();
      }
    };

    const whenIdle = () => {
      if (disposed) return;
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(() => void boot(), { timeout: 2500 });
      } else {
        timeoutId = window.setTimeout(() => void boot(), 600);
      }
    };

    const whenNear = () => {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            io = null;
            whenIdle();
          }
        },
        { rootMargin: "200px 0px" },
      );
      io.observe(wrap);
    };

    // El 3D (three pesa ~137 KB gzip) no compite con la primera carga: se
    // pide recién con la primera interacción real (puntero, toque, rueda,
    // scroll o teclado) después de `load`. Hasta entonces se ve la
    // ilustración estática. No se detecta ningún agente ni herramienta: es
    // igual para todos (decisión del Líder: mejora progresiva).
    const INTERACTIONS = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"] as const;
    let armed = false;
    const onFirstInteraction = () => {
      if (armed) return;
      armed = true;
      INTERACTIONS.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));
      whenNear();
    };
    const arm = () => {
      // En un celular lento la persona puede desplazarse antes de que
      // este script esté listo: si la página ya no está arriba de todo,
      // eso cuenta como la primera interacción.
      if (window.scrollY > 0) {
        onFirstInteraction();
        return;
      }
      INTERACTIONS.forEach((ev) => window.addEventListener(ev, onFirstInteraction, { passive: true }));
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    const onMotionPref = () => {
      if (reduced.matches) toStatic();
    };
    reduced.addEventListener("change", onMotionPref);

    return () => {
      disposed = true;
      window.removeEventListener("load", arm);
      INTERACTIONS.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));
      reduced.removeEventListener("change", onMotionPref);
      io?.disconnect();
      if (idleId !== null) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      stopScene?.();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ms-hero3d" data-state="static">
      <div className="ms-hero3d__fallback">{children}</div>
      <canvas ref={canvasRef} className="ms-hero3d__canvas" aria-hidden="true" />
    </div>
  );
}
