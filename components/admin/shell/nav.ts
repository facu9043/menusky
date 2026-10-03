import { BookOpen, House, LayoutGrid, Palette, type LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  /** Texto en el menú lateral (escritorio). */
  label: string;
  /** Texto en la barra de pestañas (celular): "Estilo" lleva a Apariencia (CA-5.3). */
  short: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Inicio", short: "Inicio", icon: House },
  { href: "/admin/menu", label: "Carta", short: "Carta", icon: BookOpen },
  { href: "/admin/mesas", label: "Mesas", short: "Mesas", icon: LayoutGrid },
  { href: "/admin/apariencia", label: "Apariencia", short: "Estilo", icon: Palette },
];

/** Una sola sección activa (CA-5.6): Inicio solo en /admin; el resto incluye sus subrutas. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
