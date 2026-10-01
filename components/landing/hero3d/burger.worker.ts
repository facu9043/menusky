// Worker del 3D del hero: recibe el canvas transferido (OffscreenCanvas)
// y corre la escena acá, fuera del hilo principal. Evaluar three,
// compilar los shaders y dibujar cada cuadro no bloquea el scroll, los
// clics ni la lectura de la página. La página (Hero3D.tsx) le manda el
// tamaño, el puntero, el armado por scroll y si está en pantalla.
import { createBurger, type BurgerApi, type BurgerInit } from "./scene";

export type WorkerIn =
  | ({ type: "init" } & Omit<BurgerInit, "canvas"> & { canvas: OffscreenCanvas })
  | { type: "resize"; width: number; height: number }
  | { type: "pointer"; x: number; y: number }
  | { type: "explode"; value: number }
  | { type: "active"; value: boolean }
  | { type: "dispose" };

export type WorkerOut = { type: "ready" } | { type: "fallback" };

// El proyecto compila con la lib "dom": se tipa a mano lo poco que se usa
// del ámbito del worker.
const scope = self as unknown as {
  postMessage: (msg: WorkerOut) => void;
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
  close: () => void;
};

let api: BurgerApi | null = null;

scope.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      const { type: _type, ...init } = msg;
      void _type;
      try {
        api = createBurger(init, {
          onReady: () => scope.postMessage({ type: "ready" }),
          onFallback: () => scope.postMessage({ type: "fallback" }),
        });
      } catch {
        scope.postMessage({ type: "fallback" });
      }
      break;
    }
    case "resize":
      api?.resize(msg.width, msg.height);
      break;
    case "pointer":
      api?.pointer(msg.x, msg.y);
      break;
    case "explode":
      api?.explode(msg.value);
      break;
    case "active":
      api?.setActive(msg.value);
      break;
    case "dispose":
      api?.dispose();
      api = null;
      scope.close();
      break;
  }
};
