"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { ChefHat, CircleUserRound, ConciergeBell, House, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/landing/brand/Logo";
import { useLogout } from "@/components/admin/shell/useLogout";
import { useStaffPendingCounts } from "@/lib/realtime/useStaffPendingCounts";
import type { StaffRole } from "@/lib/types/database.types";

// CA-3.9 / CA-2.2: cada rol ve solo los enlaces que no lo rebotan. waiter:
// Salón; kitchen: Cocina; admin: todo. (Antes en StaffNav.tsx, sin cambios.)
const LINKS: { href: string; label: string; icon: LucideIcon; roles: StaffRole[] }[] = [
  { href: "/kitchen", label: "Cocina", icon: ChefHat, roles: ["kitchen", "admin"] },
  { href: "/floor", label: "Salón", icon: ConciergeBell, roles: ["waiter", "admin"] },
  { href: "/admin", label: "Admin", icon: House, roles: ["admin"] },
];

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  waiter: "Mozo",
  kitchen: "Cocina",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function PendingDot() {
  return (
    <>
      <span className="adm-dot" aria-hidden="true" />
      <span className="sr-only">(hay pendientes)</span>
    </>
  );
}

export interface StaffHeaderUser {
  name: string;
  role: StaffRole;
  restaurantId: string;
  restaurantName: string;
}

/**
 * Encabezado de staff (CA-8.10). < 768 px: logo + botón de cuenta (los
 * enlaces van en el menú, 2 toques, como el admin). >= 768 px: banda marrón
 * con los paneles del rol, persona y "Cerrar sesión". Los pendientes salen de
 * UNA sola suscripción (useStaffPendingCounts, como hoy; D-23) con la misma
 * regla de S-2.
 */
export function StaffHeader({ staff, portalClass }: { staff: StaffHeaderUser; portalClass: string }) {
  const pathname = usePathname() ?? "";
  const counts = useStaffPendingCounts(staff.restaurantId);
  const { logout, loggingOut } = useLogout();

  const pendingByHref: Record<string, number> = {
    "/kitchen": counts.kitchenPending,
    "/floor": counts.floorPending,
  };
  const links = LINKS.filter((l) => l.roles.includes(staff.role));
  const home = links.find((l) => pathname.startsWith(l.href)) ?? links[0];
  const anyPending = links.some((l) => (pendingByHref[l.href] ?? 0) > 0);
  const roleLabel = ROLE_LABELS[staff.role];

  return (
    <header className="st-head">
      <Link href={home.href} className="st-head__logo" aria-label={`MenuSky, ir a ${home.label}`}>
        <Logo size={34} />
      </Link>

      <nav className="st-nav" aria-label="Paneles">
        <ul>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="st-nav__link"
                  aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                >
                  <Icon aria-hidden="true" />
                  {link.label}
                  {(pendingByHref[link.href] ?? 0) > 0 ? <PendingDot /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="st-who">
        <span className="st-who__avatar" aria-hidden="true">
          {initials(staff.name)}
        </span>
        <div className="st-who__text">
          <p className="st-who__name">{staff.name}</p>
          <p className="st-who__role">{roleLabel}</p>
        </div>
      </div>
      <button type="button" className="st-logout" onClick={logout} disabled={loggingOut}>
        <LogOut aria-hidden="true" />
        <span className="st-logout__text">Cerrar sesión</span>
      </button>

      {/* Celular: menú de cuenta (mismo .adm-menu que el admin). */}
      <Menu.Root>
        <Menu.Trigger className="adm-account-btn" aria-label={`Cuenta: ${staff.name}`}>
          <CircleUserRound aria-hidden="true" />
          <span className="adm-account-btn__name" aria-hidden="true">
            {staff.name.split(" ")[0]}
          </span>
          {anyPending ? <span className="adm-dot" aria-hidden="true" /> : null}
        </Menu.Trigger>
        <Menu.Portal className={portalClass}>
          <Menu.Positioner side="bottom" align="end" sideOffset={8} style={{ zIndex: 70 }}>
            <Menu.Popup className="adm-menu st-menu">
              <div className="adm-menu__who">
                <p className="adm-menu__name">{staff.name}</p>
                <p className="adm-menu__meta">
                  {roleLabel} · {staff.restaurantName}
                </p>
              </div>
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Menu.LinkItem
                    key={link.href}
                    className="adm-menu__item"
                    aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                    render={<Link href={link.href} />}
                  >
                    <Icon aria-hidden="true" />
                    {link.label}
                    {(pendingByHref[link.href] ?? 0) > 0 ? <PendingDot /> : null}
                  </Menu.LinkItem>
                );
              })}
              <div className="adm-menu__sep" role="separator" />
              <Menu.Item
                className="adm-menu__item adm-menu__item--danger"
                disabled={loggingOut}
                onClick={logout}
              >
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </header>
  );
}
