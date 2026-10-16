import { brandDisplay } from "@/components/brand/fonts";
import "@/app/brand.css";
import "@/app/admin/admin.css";
import "@/components/staff/staff.css";

// Clase de marca de Cocina y Salón: SIEMPRE la paleta MenuSky, nunca el tema
// del restaurante (decisión 2 del Director, D-23; CA-1.2 y CA-1.3). Reutiliza
// los tokens de app/brand.css y las piezas del admin (admin.css, todo bajo
// .ms-admin / .adm-*); lo propio de staff vive en staff.css (.st-*).
export const STAFF_BRAND_CLASS = `ms-brand ms-admin ${brandDisplay.variable}`;

/** Contenedor de marca de staff (shell, pantallas sin permiso, carga y error). */
export function StaffBrand({ children }: { children: React.ReactNode }) {
  return <div className={`${STAFF_BRAND_CLASS} st-root`}>{children}</div>;
}
