// Mascota de MenuSky (solo /login, CA-3.8). Server Component: el SVG viaja
// en el HTML y no suma JS al cliente.
// BORRADOR: quitar cuando el Director elija la mascota. Hoy hay 3 propuestas
// (docs/design/mascota/mascota.md) y /login?mascota=1|2|3 elige cuál se ve.
// Cuando haya elección, queda un solo componente y se borran los otros dos.
import { MascotBrioche } from "./MascotBrioche";
import { MascotPollito } from "./MascotPollito";
import { MascotPomo } from "./MascotPomo";

export type MascotVariant = 1 | 2 | 3;

export function Mascot({ variant = 1 }: { variant?: MascotVariant }) {
  if (variant === 2) return <MascotPollito />;
  if (variant === 3) return <MascotPomo />;
  return <MascotBrioche />;
}
