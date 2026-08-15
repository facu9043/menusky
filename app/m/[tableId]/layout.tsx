import { notFound } from "next/navigation";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { getTableMenu } from "@/lib/menu/getTableMenu";
import { CartProvider } from "@/lib/cart/useCart";
import { TableHeader } from "@/components/client/TableHeader";
import { CartFab } from "@/components/client/CartFab";
import { CallWaiterButton } from "@/components/client/CallWaiterButton";
import { themeToCssVars } from "@/lib/theme/applyTheme";
import { DEFAULT_THEME } from "@/lib/theme/presets";

// Tipografía propia de la carta del cliente: Fraunces (display, nombres de
// plato/títulos) + Plus Jakarta Sans (texto, muy legible en celular). Los
// paneles internos (/admin, /kitchen, /floor) no cargan estas fuentes y
// siguen con Geist.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-menu-display",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-menu-sans",
  display: "swap",
});

export default async function TableLayout({
  children,
  params,
}: LayoutProps<"/m/[tableId]">) {
  const { tableId } = await params;
  const menu = await getTableMenu(tableId);

  if (!menu) notFound();

  const theme = menu.restaurant.theme ?? DEFAULT_THEME;

  return (
    <CartProvider tableQrToken={tableId}>
      <div
        className={`${fraunces.variable} ${plusJakartaSans.variable} flex min-h-screen flex-col bg-background text-foreground`}
        style={{
          ...themeToCssVars(theme),
          "--font-sans": "var(--font-menu-sans)",
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties}
      >
        <TableHeader restaurant={menu.restaurant} table={menu.table} />
        <main className="flex-1 pb-28">{children}</main>
        <CallWaiterButton />
        <CartFab />
      </div>
    </CartProvider>
  );
}
