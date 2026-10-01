// Convierte las fotos de docs/CREDITS.md (JPEG originales, NO se commitean)
// a WebP recortados para la landing, en public/landing/.
//
// Uso:
//   node scripts/optimize-landing-images.mjs <carpeta-con-los-jpeg>
//
// La carpeta tiene que contener pizza-1.jpg, pizza-2.jpg, burger-1.jpg,
// burger-2.jpg, burger-3.jpg y ambiente-1.jpg, descargados de las URLs de
// docs/CREDITS.md. sharp viene instalado como dependencia de next.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Falta la carpeta de origen: node scripts/optimize-landing-images.mjs <carpeta>");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public", "landing");

// extract: recorte en píxeles sobre el original de 1600 px de ancho.
const jobs = [
  // Miniaturas cuadradas para las tarjetas de la carta en los mockups.
  { src: "burger-1.jpg", out: "burger-1-sq.webp", extract: { left: 440, top: 7, width: 1060, height: 1060 }, size: [360, 360] },
  { src: "burger-2.jpg", out: "burger-2-sq.webp", extract: { left: 430, top: 120, width: 820, height: 820 }, size: [360, 360] },
  { src: "burger-3.jpg", out: "burger-3-sq.webp", extract: { left: 20, top: 40, width: 1000, height: 1000 }, size: [360, 360] },
  { src: "pizza-1.jpg", out: "pizza-1-sq.webp", extract: { left: 40, top: 60, width: 880, height: 880 }, size: [360, 360] },
  { src: "pizza-2.jpg", out: "pizza-2-sq.webp", extract: { left: 380, top: 60, width: 920, height: 920 }, size: [360, 360] },
  // Foto del plato en el detalle con opciones y extras (horizontal 16:10).
  { src: "burger-1.jpg", out: "burger-1-wide.webp", extract: { left: 240, top: 120, width: 1360, height: 850 }, size: [960, 600] },
  // Terraza: el original es vertical (1600x2400); recorte horizontal 4:3 de la mesa.
  { src: "ambiente-1.jpg", out: "ambiente-1.webp", extract: { left: 0, top: 1000, width: 1600, height: 1200 }, size: [1200, 900] },
];

await mkdir(outDir, { recursive: true });

for (const job of jobs) {
  const input = path.join(srcDir, job.src);
  const output = path.join(outDir, job.out);
  const info = await sharp(input)
    .extract(job.extract)
    .resize(job.size[0], job.size[1], { fit: "cover" })
    .webp({ quality: 74, effort: 6 })
    .toFile(output);
  console.log(`${job.out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
