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
 * corresponde, espera a `load` + tiempo ocioso + que el hero esté cerca
 * de la pantalla, y recién ahí descarga la escena (chunk aparte con
 * three). El estado se refleja en `data-state` (static | live) y el CSS
 * hace el fundido; React no vuelve a renderizar.
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
    let stopScene: (() => void) | null = null;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let io: IntersectionObserver | null = null;

    const toStatic = () => {
      wrap.dataset.state = "static";
      stopScene?.();
      stopScene = null;
    };

    const boot = async () => {
      try {
        const { mountBurger } = await import("./scene");
        if (disposed) return;
        stopScene = mountBurger(canvas, {
          onReady: () => {
            if (!disposed) wrap.dataset.state = "live";
          },
          onFallback: toStatic,
        });
      } catch {
        // Si el chunk o WebGL fallan, queda la ilustración estática.
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

    if (document.readyState === "complete") whenNear();
    else window.addEventListener("load", whenNear, { once: true });

    const onMotionPref = () => {
      if (reduced.matches) toStatic();
    };
    reduced.addEventListener("change", onMotionPref);

    return () => {
      disposed = true;
      window.removeEventListener("load", whenNear);
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
