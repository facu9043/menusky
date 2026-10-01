// Escena 3D del hero: hamburguesa completa procedural (sin modelos ni
// texturas externas). No toca el DOM: recibe un canvas (normal u
// OffscreenCanvas) y todo lo demás (tamaño, puntero, scroll, visibilidad)
// por su API. Así corre igual en un Web Worker (burger.worker.ts, el
// camino normal: three se evalúa, compila y dibuja fuera del hilo
// principal) o, si el navegador no tiene OffscreenCanvas, en la página
// con import() dinámico desde Hero3D.tsx. En ambos casos `three` queda
// en un chunk aparte y nunca entra en el JS inicial.
//
// Presupuesto (docs/design/direccion-de-arte.md, sección 5): ~6k
// triángulos, un solo tipo de material (toon, un programa de shader),
// sin sombras en tiempo real, DPR limitado, render solo visible.
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
  type Material,
  type Side,
} from "three";

export type BurgerInit = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Celular o pantalla chica: sin antialias y DPR <= 1.5. */
  mobile: boolean;
  /** Mouse/trackpad: la hamburguesa sigue al puntero. */
  finePointer: boolean;
  dpr: number;
  width: number;
  height: number;
  /** 0 = armada, 1 = desarmada (según el scroll; lo calcula la página). */
  explode: number;
};

export type BurgerEvents = {
  onReady: () => void;
  onFallback: () => void;
};

export type BurgerApi = {
  resize: (width: number, height: number) => void;
  /** Puntero normalizado a -1..1 respecto de la ventana. */
  pointer: (x: number, y: number) => void;
  explode: (target: number) => void;
  /** En pantalla y con la pestaña visible: dibuja; si no, se pausa. */
  setActive: (active: boolean) => void;
  dispose: () => void;
};

// requestAnimationFrame existe en la página y en workers con
// OffscreenCanvas; el respaldo con setTimeout cubre lo demás.
const nextFrame = (cb: (now: number) => void): number =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(cb)
    : (setTimeout(() => cb(performance.now()), 16) as unknown as number);
const cancelFrame = (id: number) => {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
  else clearTimeout(id);
};

const COLORS = {
  bun: 0xe8a23b,
  bunBottom: 0xe39a35,
  crumb: 0xf7dda8,
  patty: 0x5a2e1b,
  cheese: 0xffc21a,
  tomato: 0xd7261e,
  tomatoIn: 0xf0605a,
  lettuce: 0x4c9a2a,
  seed: 0xfff1d0,
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function createBurger(init: BurgerInit, { onReady, onFallback }: BurgerEvents): BurgerApi {
  const { canvas, mobile, finePointer } = init;
  let dpr = Math.min(init.dpr || 1, mobile ? 1.5 : 2);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 60);

  scene.add(new HemisphereLight(0xfff5e1, 0x8a5a3b, 2.2));
  const key = new DirectionalLight(0xffffff, 2.6);
  key.position.set(4, 7, 6);
  scene.add(key);

  // Mapa de gradiente toon de 3 tonos (generado, sin archivos).
  const gradient = new DataTexture(new Uint8Array([90, 175, 255]), 3, 1, RedFormat);
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const geo = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const mat = (color: number, side?: Side) => {
    const m = new MeshToonMaterial({ color, gradientMap: gradient });
    if (side !== undefined) m.side = side;
    materials.push(m);
    return m;
  };

  // ---------- capas ----------
  const layers: Group[] = [];
  const addLayer = (baseY: number, ...meshes: Object3D[]) => {
    const g = new Group();
    g.userData.baseY = baseY;
    g.add(...meshes);
    layers.push(g);
    return g;
  };

  // Pan inferior (torno) + miga.
  const bottomProfile = [
    [0, 0],
    [1.25, 0],
    [1.38, 0.04],
    [1.46, 0.14],
    [1.48, 0.26],
    [1.44, 0.36],
    [1.36, 0.42],
    [0, 0.42],
  ].map(([x, y]) => new Vector2(x, y));
  const bottomBun = new Mesh(geo(new LatheGeometry(bottomProfile, 48)), mat(COLORS.bunBottom));
  const crumb = new Mesh(geo(new CircleGeometry(1.34, 48).rotateX(-Math.PI / 2)), mat(COLORS.crumb));
  crumb.position.y = 0.422;
  addLayer(0, bottomBun, crumb);

  // Carne: cilindro con relieve irregular.
  const pattyGeo = geo(new CylinderGeometry(1.42, 1.44, 0.38, 56, 4));
  {
    const p = pattyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-3) continue;
      const a = Math.atan2(z, x);
      const k = 1 + 0.028 * Math.sin(7 * a + y * 12) + 0.018 * Math.sin(17 * a);
      p.setXYZ(i, x * k, y + (Math.abs(y) > 0.18 ? 0.025 * Math.sin(5 * a) * (r / 1.42) : 0), z * k);
    }
    pattyGeo.computeVertexNormals();
  }
  addLayer(0.61, new Mesh(pattyGeo, mat(COLORS.patty)));

  // Cheddar: plano cuadrado que "chorrea" en las puntas.
  const cheeseGeo = geo(new PlaneGeometry(2.75, 2.75, 28, 28).rotateX(-Math.PI / 2));
  {
    const p = cheeseGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      p.setY(i, -0.62 * Math.pow(Math.max(0, r - 1.3), 1.5));
    }
    cheeseGeo.rotateY(Math.PI / 4);
    cheeseGeo.computeVertexNormals();
  }
  addLayer(0.81, new Mesh(cheeseGeo, mat(COLORS.cheese, DoubleSide)));

  // Tomate: dos rodajas.
  const sliceGeo = geo(new CylinderGeometry(0.66, 0.66, 0.12, 36));
  const sliceInGeo = geo(new CircleGeometry(0.46, 32).rotateX(-Math.PI / 2));
  const tomatoMat = mat(COLORS.tomato);
  const tomatoInMat = mat(COLORS.tomatoIn);
  const tomato = new Group();
  for (const [x, z, ry] of [
    [-0.56, 0.12, 0.2],
    [0.58, -0.16, -0.3],
  ]) {
    const s = new Mesh(sliceGeo, tomatoMat);
    const inner = new Mesh(sliceInGeo, tomatoInMat);
    inner.position.y = 0.061;
    const slice = new Group();
    slice.add(s, inner);
    slice.position.set(x, 0, z);
    slice.rotation.y = ry;
    tomato.add(slice);
  }
  addLayer(0.88, tomato);

  // Lechuga: anillo con borde festoneado y ondulado.
  const lettuceGeo = geo(new RingGeometry(0.05, 1.68, 120, 5).rotateX(-Math.PI / 2));
  {
    const p = lettuceGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      const a = Math.atan2(z, x);
      const t = r / 1.68;
      const k = 1 + 0.07 * Math.sin(13 * a) * t;
      p.setXYZ(i, x * k, 0.11 * Math.sin(11 * a) * t * t + 0.03 * Math.sin(5 * a), z * k);
    }
    lettuceGeo.computeVertexNormals();
  }
  addLayer(0.97, new Mesh(lettuceGeo, mat(COLORS.lettuce, DoubleSide)));

  // Pan superior (cúpula) + sésamo instanciado.
  const domeProfile: Vector2[] = [new Vector2(0, 0), new Vector2(1.42, 0), new Vector2(1.5, 0.1)];
  const domeAt = (a: number) => ({ x: 1.5 * Math.cos(a), y: 0.1 + 1.05 * Math.pow(Math.sin(a), 0.85) });
  for (let i = 1; i <= 16; i++) {
    const { x, y } = domeAt((i / 16) * (Math.PI / 2));
    domeProfile.push(new Vector2(Math.max(x, 0), y));
  }
  const topBun = new Mesh(geo(new LatheGeometry(domeProfile, 48)), mat(COLORS.bun));
  const seedGeo = geo(new SphereGeometry(0.06, 8, 6));
  const seedCount = 38;
  const seeds = new InstancedMesh(seedGeo, mat(COLORS.seed), seedCount);
  {
    const dummy = new Object3D();
    let s = 11;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < seedCount; i++) {
      const a = 0.42 + rand() * 1.0;
      const theta = rand() * Math.PI * 2;
      const { x, y } = domeAt(a);
      dummy.position.set(x * Math.cos(theta) * 1.005, y + 0.01, x * Math.sin(theta) * 1.005);
      dummy.lookAt(dummy.position.x * 2, dummy.position.y * 2 + 0.6, dummy.position.z * 2);
      dummy.rotateZ(rand() * Math.PI);
      dummy.scale.set(1.6, 1, 0.5);
      dummy.updateMatrix();
      seeds.setMatrixAt(i, dummy.matrix);
    }
    seeds.instanceMatrix.needsUpdate = true;
  }
  addLayer(1.0, topBun, seeds);

  // Inclinación y deriva de cada capa cuando está "flotando".
  const drift = [
    { x: -0.12, rx: -0.08, rz: 0.06 },
    { x: 0.16, rx: 0.1, rz: -0.08 },
    { x: -0.2, rx: -0.14, rz: 0.12 },
    { x: 0.22, rx: 0.12, rz: -0.06 },
    { x: -0.16, rx: -0.1, rz: -0.12 },
    { x: 0.1, rx: 0.16, rz: 0.08 },
  ];

  const spin = new Group();
  spin.add(...layers);
  const tilt = new Group();
  tilt.add(spin);
  scene.add(tilt);

  // ---------- estado de interacción ----------
  // El armado por scroll (explodeGoal) y el puntero llegan desde la
  // página (Hero3D.tsx); acá solo se suavizan.
  let explodeGoal = clamp(init.explode, 0, 1);
  let explode = explodeGoal;
  let pointerX = 0;
  let pointerY = 0;
  let spinAngle = -0.5;

  // ---------- tamaño ----------
  let aspect = 1;
  let width = init.width;
  let height = init.height;
  const applySize = () => {
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };
  applySize();

  const update = (dt: number, t: number) => {
    const k = 1 - Math.exp(-dt * 4);
    explode += (explodeGoal - explode) * k;
    spinAngle += dt * 0.28;

    layers.forEach((layer, i) => {
      const d = drift[i];
      const e = explode;
      layer.position.y = layer.userData.baseY + e * i * 0.62 + e * 0.07 * Math.sin(t * 1.1 + i * 1.3);
      layer.position.x = e * d.x;
      layer.rotation.x = e * (d.rx + 0.04 * Math.sin(t * 0.8 + i));
      layer.rotation.z = e * d.rz;
    });

    const fx = finePointer ? pointerX : 0;
    const fy = finePointer ? pointerY : 0;
    spin.rotation.y += (spinAngle + fx * 0.7 - spin.rotation.y) * k;
    tilt.rotation.x += (0.2 + fy * 0.2 - tilt.rotation.x) * k;
    tilt.rotation.z += (-fx * 0.14 - tilt.rotation.z) * k;

    // La pila gira alrededor de su centro; la cámara se acerca a medida
    // que la hamburguesa se arma (alto total: 2.15 armada, 5.25 desarmada).
    const stack = 2.15 + explode * 3.1;
    spin.position.y = -stack / 2;
    const fit = aspect < 1 ? 1 / aspect : 1;
    const dist = (8.2 + explode * 5.6) * fit;
    camera.position.set(0, 1.1, dist);
    camera.lookAt(0, 0, 0);
  };

  // ---------- bucle con pausa y degradación ----------
  let raf = 0;
  let last = 0;
  let active = false;
  let disposed = false;
  let frames = 0;
  let frameSum = 0;
  let degradeStep = 0;

  const frame = (now: number) => {
    raf = nextFrame(frame);
    const dtMs = last ? now - last : 16;
    last = now;
    update(Math.min(dtMs, 100) / 1000, now / 1000);
    renderer.render(scene, camera);

    // Medición de tiempo por cuadro: si no se sostienen ~30 fps, primero
    // baja la resolución y, si sigue igual, vuelve a la ilustración.
    frames++;
    if (frames > 20) {
      frameSum += dtMs;
      if (frames === 110) {
        const avg = frameSum / 90;
        if (avg > 34) {
          if (degradeStep === 0 && dpr > 1) {
            degradeStep = 1;
            dpr = 1;
            renderer.setPixelRatio(dpr);
            applySize();
          } else {
            onFallback();
            return;
          }
        }
        frames = 0;
        frameSum = 0;
      }
    }
  };

  const start = () => {
    if (raf || disposed || !active) return;
    last = 0;
    frames = 0;
    frameSum = 0;
    raf = nextFrame(frame);
  };
  const stop = () => {
    if (raf) cancelFrame(raf);
    raf = 0;
  };

  const onContextLost = (e: Event) => {
    e.preventDefault();
    if (!disposed) onFallback();
  };
  canvas.addEventListener("webglcontextlost", onContextLost as EventListener);

  // Compila los shaders sin bloquear (KHR_parallel_shader_compile si
  // existe) y recién después muestra el canvas.
  update(0, 0);
  renderer
    .compileAsync(scene, camera)
    .then(() => {
      if (disposed) return;
      renderer.render(scene, camera);
      onReady();
      start();
    })
    .catch(() => {
      if (!disposed) onFallback();
    });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    canvas.removeEventListener("webglcontextlost", onContextLost as EventListener);
    seeds.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    gradient.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return {
    resize: (w, h) => {
      width = w;
      height = h;
      applySize();
    },
    pointer: (x, y) => {
      if (!finePointer) return;
      pointerX = clamp(x, -1, 1);
      pointerY = clamp(y, -1, 1);
    },
    explode: (target) => {
      explodeGoal = clamp(target, 0, 1);
    },
    setActive: (on) => {
      active = on;
      if (on) start();
      else stop();
    },
    dispose,
  };
}
