import type { Viewport } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";
import { NotAdminAccess } from "@/components/staff/NotAdminAccess";
import { brandDisplay } from "@/components/brand/fonts";
import { AdminShell } from "@/components/admin/shell/AdminShell";
import { AdminPortalClassProvider } from "@/components/admin/shell/portal";
import { AdminLiveProvider } from "@/lib/admin/live/AdminLiveProvider";
import { getAdminLiveSnapshot } from "@/lib/admin/live/getAdminLiveSnapshot";
import type { AdminLiveSnapshot } from "@/lib/admin/live/types";
import "../brand.css";
import "./admin.css";

// viewport-fit=cover: env(safe-area-inset-bottom) deja lugar a la barra de
// pestañas sobre la "barrita" del iPhone (CA-5.4). resizes-content: con el
// teclado virtual abierto, la hoja de edición se achica en vez de quedar
// tapada, y "Guardar cambios" sigue a mano (CA-5.5, CA-7.10).
export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#fff5e1",
};

const EMPTY_LIVE: AdminLiveSnapshot = {
  tables: [],
  ordersToday: 0,
  salesToday: 0,
  pendingCalls: 0,
  occupiedTables: 0,
  kitchenPending: 0,
  floorPending: 0,
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaffUser();
  if (!staff) return <NoStaffAccess />;
  if (staff.role !== "admin") return <NotAdminAccess />;

  // Una sola lectura en vivo para todo el admin (R-9). Si falla, el shell
  // igual se muestra (cada pantalla tiene su propio error.tsx) y el
  // proveedor vuelve a leer al montar.
  let initial = EMPTY_LIVE;
  let liveFailed = false;
  try {
    initial = await getAdminLiveSnapshot(staff.restaurantId);
  } catch {
    liveFailed = true;
  }

  // El admin se ve SIEMPRE con la paleta MenuSky, nunca con el tema del
  // restaurante (CA-5.1).
  const brandClass = `ms-brand ms-admin ${brandDisplay.variable}`;

  return (
    <div className={`${brandClass} adm-root`}>
      <a href="#contenido" className="adm-skip">
        Saltar al contenido
      </a>
      <AdminPortalClassProvider className={brandClass}>
        <AdminLiveProvider restaurantId={staff.restaurantId} initial={initial}>
          <AdminShell
            staff={{
              name: staff.name,
              restaurantName: staff.restaurantName,
              restaurantId: staff.restaurantId,
            }}
            liveFailed={liveFailed}
          >
            {children}
          </AdminShell>
        </AdminLiveProvider>
      </AdminPortalClassProvider>
    </div>
  );
}
