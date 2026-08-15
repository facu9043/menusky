import { notFound } from "next/navigation";
import { getTableMenu } from "@/lib/menu/getTableMenu";
import { CartProvider } from "@/lib/cart/useCart";
import { TableHeader } from "@/components/client/TableHeader";
import { CartFab } from "@/components/client/CartFab";

export default async function TableLayout({
  children,
  params,
}: LayoutProps<"/m/[tableId]">) {
  const { tableId } = await params;
  const menu = await getTableMenu(tableId);

  if (!menu) notFound();

  return (
    <CartProvider tableQrToken={tableId}>
      <div className="flex min-h-full flex-col">
        <TableHeader restaurant={menu.restaurant} table={menu.table} />
        <main className="flex-1 pb-28">{children}</main>
        <CartFab />
      </div>
    </CartProvider>
  );
}
