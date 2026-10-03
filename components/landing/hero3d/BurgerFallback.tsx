// Ilustración estática de la hamburguesa desarmada. Es el contenido que
// pinta el servidor en el hero y el fallback del 3D: sin JS, sin WebGL,
// con prefers-reduced-motion o con ahorro de datos (docs/STACK.md, 3D).
// Misma composición y colores que la escena three.js para que el cambio
// no se note.

const C = {
  bunSide: "#E39A35",
  bunTop: "#F2B65A",
  bunShade: "#C77E22",
  crumb: "#F7DDA8",
  patty: "#5A2E1B",
  pattyTop: "#6E3A22",
  pattyDark: "#43200F",
  cheese: "#FFC21A",
  cheeseEdge: "#E3A008",
  tomato: "#D7261E",
  tomatoIn: "#F0605A",
  lettuce: "#4C9A2A",
  lettuceHi: "#6DB840",
  seed: "#FFF1D0",
};

/** Disco con cara superior elíptica y lateral (vista 3/4). */
function Puck({
  cx,
  cy,
  rx,
  ry,
  h,
  side,
  top,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  h: number;
  side: string;
  top: string;
}) {
  const d = `M${cx - rx} ${cy}L${cx - rx} ${cy + h}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + h}L${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}Z`;
  return (
    <g>
      <path d={d} fill={side} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={top} />
    </g>
  );
}

function lettucePath(cx: number, cy: number, rx: number, ry: number) {
  const pts: string[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.06 * Math.sin(a * 13) + 0.03 * Math.sin(a * 7 + 1);
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k + Math.sin(a * 11) * 4;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join("") + "Z";
}

const LETTUCE = lettucePath(300, 262, 186, 56);
const LETTUCE_HI = lettucePath(296, 256, 150, 40);

const SEEDS = [
  [222, 118, -30],
  [262, 92, -15],
  [306, 82, 5],
  [350, 94, 20],
  [386, 120, 35],
  [244, 148, -20],
  [292, 128, 0],
  [338, 134, 18],
  [282, 168, -8],
  [328, 170, 12],
  [206, 162, -40],
  [392, 160, 40],
];

export function BurgerFallback() {
  return (
    <svg
      viewBox="0 0 600 600"
      className="ms-burger-svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* sombra en el piso */}
      <ellipse cx="300" cy="566" rx="170" ry="18" fill="#2B1710" opacity=".14" />

      {/* pan inferior */}
      <g transform="rotate(-3 300 492)">
        <Puck cx={300} cy={478} rx={172} ry={48} h={44} side={C.bunSide} top={C.crumb} />
        <path d="M128 492a172 48 0 0 0 344 0" fill="none" stroke={C.bunShade} strokeWidth="6" opacity=".5" />
      </g>

      {/* carne */}
      <g transform="rotate(4 300 412)">
        <Puck cx={300} cy={398} rx={168} ry={46} h={42} side={C.patty} top={C.pattyTop} />
        {[
          [240, 392],
          [300, 380],
          [356, 398],
          [272, 412],
          [330, 414],
          [212, 404],
          [384, 386],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="12" ry="4" fill={C.pattyDark} opacity=".55" />
        ))}
      </g>

      {/* cheddar con chorreado en las puntas */}
      <g transform="rotate(-2 300 338)">
        <path
          d="M300 282L496 334Q500 352 488 360L476 388Q470 398 464 386L456 362L304 398Q296 430 286 400L282 396L104 344Q98 366 92 372Q84 378 86 360L102 330Z"
          fill={C.cheese}
        />
        <path d="M300 282L496 334L304 386L104 334Z" fill="#FFD04D" />
        <path d="M104 334L304 386L496 334" fill="none" stroke={C.cheeseEdge} strokeWidth="5" strokeLinejoin="round" />
      </g>

      {/* tomate */}
      <g transform="rotate(5 300 300)">
        <Puck cx={222} cy={296} rx={84} ry={26} h={14} side="#B71E17" top={C.tomato} />
        <ellipse cx={222} cy={296} rx={58} ry={17} fill={C.tomatoIn} />
        <ellipse cx={222} cy={296} rx={24} ry={7} fill={C.tomato} />
        <Puck cx={380} cy={292} rx={84} ry={26} h={14} side="#B71E17" top={C.tomato} />
        <ellipse cx={380} cy={292} rx={58} ry={17} fill={C.tomatoIn} />
        <ellipse cx={380} cy={292} rx={24} ry={7} fill={C.tomato} />
      </g>

      {/* lechuga */}
      <g transform="rotate(-4 300 262) translate(0 -26)">
        <path d={LETTUCE} fill={C.lettuce} />
        <path d={LETTUCE_HI} fill={C.lettuceHi} />
      </g>

      {/* pan superior con sésamo */}
      <g transform="rotate(3 300 150) translate(0 -14)">
        <ellipse cx="300" cy="196" rx="176" ry="44" fill={C.bunShade} />
        <path d="M124 194C124 84 204 40 300 40C396 40 476 84 476 194C476 214 124 214 124 194Z" fill={C.bunSide} />
        <path d="M160 160C164 92 226 60 300 60C352 60 400 78 428 112C380 92 332 86 290 90C224 96 178 124 160 160Z" fill={C.bunTop} />
        {SEEDS.map(([x, y, r]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="9" ry="4.5" transform={`rotate(${r} ${x} ${y})`} fill={C.seed} />
        ))}
      </g>
    </svg>
  );
}
