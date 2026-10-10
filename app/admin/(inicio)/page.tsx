import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";
import { getAdminLiveSnapshot } from "@/lib/admin/live/getAdminLiveSnapshot";
import { HomeBoard } from "@/components/admin/inicio/HomeBoard";

// Con el template "%s | MenuSky" de app/layout.tsx queda "Inicio | MenuSky".
export const metadata: Metadata = {
  title: "Inicio",
};

/** "sábado 3 de octubre", siempre en hora de Argentina (CA-9.1). */
function todayLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} de ${get("month")}`;
}

// Inicio (HU-9). Los números en vivo (pedidos, mesas, llamados) los da
// useAdminLive(); esta lectura del servidor solo dice si la instantánea se
// pudo leer (el proveedor no expone errores) para mostrar el error por
// tarjeta (CA-9.7). "Platos sin stock" sale de la carta: la disponibilidad
// no va en la instantánea (docs/api/admin.md §3.3). Si fallan las dos
// lecturas, se lanza y lo atrapa error.tsx ("No pudimos cargar el resumen").
export default async function AdminHomePage() {
  const staff = await getStaffUser();
  // Rol antes de cualquier lectura (CA-NR.01, SEC-AF-01): el layout muestra
  // NotAdminAccess, pero la página se renderiza igual (y viaja en el RSC).
  if (!staff || staff.role !== "admin") return null;

  const [live, menu] = await Promise.allSettled([
    getAdminLiveSnapshot(staff.restaurantId),
    getAdminMenu(staff.restaurantId),
  ]);
  if (live.status === "rejected" && menu.status === "rejected") throw live.reason;

  const outOfStock =
    menu.status === "fulfilled"
      ? menu.value.reduce((n, c) => n + c.items.filter((i) => !i.isAvailable).length, 0)
      : null;

  return <HomeBoard date={todayLabel()} liveOk={live.status === "fulfilled"} outOfStock={outOfStock} />;
}
