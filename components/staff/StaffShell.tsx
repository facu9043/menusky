import { STAFF_BRAND_CLASS, StaffBrand } from "@/components/staff/StaffBrand";
import { StaffHeader } from "@/components/staff/StaffHeader";
import type { StaffUser } from "@/lib/auth/getStaffUser";

/**
 * Shell de staff (CA-8.10): encabezado con logo, paneles del rol, persona y
 * "Cerrar sesión"; título h1 único con "restaurante · persona" (K-3).
 */
export function StaffShell({
  title,
  staff,
  children,
}: {
  title: string;
  staff: StaffUser;
  children: React.ReactNode;
}) {
  return (
    <StaffBrand>
      <a href="#contenido" className="adm-skip">
        Saltar al contenido
      </a>
      <StaffHeader
        staff={{
          name: staff.name,
          role: staff.role,
          restaurantId: staff.restaurantId,
          restaurantName: staff.restaurantName,
        }}
        portalClass={STAFF_BRAND_CLASS}
      />
      <main id="contenido" tabIndex={-1} className="st-main">
        <div className="st-page">
          <div className="st-title">
            <h1 className="adm-h1">{title}</h1>
            <p className="st-title__who">
              {staff.restaurantName} · {staff.name}
            </p>
          </div>
          {children}
        </div>
      </main>
    </StaffBrand>
  );
}
