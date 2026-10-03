"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { ChefHat, CircleUserRound, ConciergeBell, LogOut } from "lucide-react";
import { Logo } from "@/components/landing/brand/Logo";
import { ADMIN_NAV, isNavActive } from "@/components/admin/shell/nav";
import { OfflineNotice } from "@/components/admin/shell/OfflineNotice";
import { useAdminPortalClass } from "@/components/admin/shell/portal";
import { useLogout } from "@/components/admin/shell/useLogout";
import { useAdminLive } from "@/lib/admin/live/AdminLiveProvider";

export interface AdminShellStaff {
  name: string;
  restaurantName: string;
  restaurantId: string;
}

const ROLE_LABEL = "Admin";

const PANELS = [
  { href: "/kitchen", label: "Cocina", icon: ChefHat, key: "kitchen" as const },
  { href: "/floor", label: "Salón", icon: ConciergeBell, key: "floor" as const },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "A";
}

/** "X de Y mesas ocupadas" (CA-5.2), en vivo desde AdminLiveProvider. */
function tablesSummary(occupied: number, total: number): string {
  if (total === 0) return "Todavía sin mesas";
  return `${occupied} de ${total} ${total === 1 ? "mesa ocupada" : "mesas ocupadas"}`;
}

export function AdminShell({
  staff,
  liveFailed,
  children,
}: {
  staff: AdminShellStaff;
  /** La instantánea inicial falló en el servidor: se relee al montar. */
  liveFailed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const live = useAdminLive();
  const { logout, loggingOut } = useLogout();
  const portalClass = useAdminPortalClass();
  // Mismo criterio de pendientes que StaffNav (CA-NR.04), desde la instantánea
  // compartida: un solo canal Realtime para todo el admin (R-9, D-20).
  const pendingBy = { kitchen: live.kitchenPending, floor: live.floorPending };
  const anyPending = live.kitchenPending + live.floorPending > 0;

  const { refresh } = live;
  useEffect(() => {
    if (liveFailed) void refresh();
  }, [liveFailed, refresh]);

  const summary = tablesSummary(live.occupiedTables, live.tables.length);

  return (
    <>
      {/* ---------- Escritorio: menú lateral ---------- */}
      <aside className="adm-side adm-on-dark" aria-label="Menú del admin">
        <Link href="/admin" className="adm-side__logo" aria-label="MenuSky, ir a Inicio">
          <Logo size={34} />
        </Link>

        <nav aria-label="Principal" className="adm-side__group">
          <ul>
            {ADMIN_NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="adm-side__link"
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <nav aria-label="Paneles" className="adm-side__group">
          <p className="adm-side__label" aria-hidden="true">
            Paneles
          </p>
          <ul>
            {PANELS.map((panel) => {
              const Icon = panel.icon;
              const count = pendingBy[panel.key];
              return (
                <li key={panel.href}>
                  <Link href={panel.href} className="adm-side__link">
                    <Icon aria-hidden="true" />
                    {panel.label}
                    {count > 0 ? (
                      <>
                        <span className="adm-dot" aria-hidden="true" />
                        <span className="sr-only">(hay pendientes)</span>
                      </>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="adm-side__foot">
          <div className="adm-local">
            <p className="adm-local__name">{staff.restaurantName}</p>
            <p className="adm-local__tables">
              <span
                className="adm-local__live"
                data-on={live.connected ? "true" : "false"}
                aria-hidden="true"
              />
              {summary}
            </p>
          </div>
          <div className="adm-who">
            <span className="adm-who__avatar" aria-hidden="true">
              {initials(staff.name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <p className="adm-who__name">{staff.name}</p>
              <p className="adm-who__role">{ROLE_LABEL}</p>
            </div>
          </div>
          <button
            type="button"
            className="adm-side__link"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut aria-hidden="true" />
            {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <div className="adm-frame">
        {/* ---------- Celular: encabezado compacto con cuenta ---------- */}
        <header className="adm-topbar">
          <Link href="/admin" aria-label="MenuSky, ir a Inicio" style={{ borderRadius: 10 }}>
            <Logo size={30} />
          </Link>
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
                <Menu.Popup className="adm-menu">
                  <div className="adm-menu__who">
                    <p className="adm-menu__name">{staff.name}</p>
                    <p className="adm-menu__meta">
                      {ROLE_LABEL} · {staff.restaurantName}
                    </p>
                    <p className="adm-menu__meta">{summary}</p>
                  </div>
                  {PANELS.map((panel) => {
                    const Icon = panel.icon;
                    const count = pendingBy[panel.key];
                    return (
                      <Menu.LinkItem
                        key={panel.href}
                        className="adm-menu__item"
                        render={<Link href={panel.href} />}
                      >
                        <Icon aria-hidden="true" />
                        {panel.label}
                        {count > 0 ? (
                          <>
                            <span className="adm-dot" aria-hidden="true" />
                            <span className="sr-only">(hay pendientes)</span>
                          </>
                        ) : null}
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
                    {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </header>

        <main id="contenido" tabIndex={-1} className="adm-main">
          {children}
        </main>
      </div>

      {/* ---------- Celular: barra de pestañas ---------- */}
      <nav aria-label="Principal" className="adm-tabbar">
        <ul>
          {ADMIN_NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} className="adm-tab" aria-current={active ? "page" : undefined}>
                  <span className="adm-tab__icon">
                    <Icon aria-hidden="true" />
                  </span>
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <OfflineNotice />
    </>
  );
}
