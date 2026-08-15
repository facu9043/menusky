import { notFound } from "next/navigation";
import { getTableMenu } from "@/lib/menu/getTableMenu";
import { MenuBrowser } from "@/components/client/MenuBrowser";

export default async function TableMenuPage({
  params,
}: PageProps<"/m/[tableId]">) {
  const { tableId } = await params;
  const menu = await getTableMenu(tableId);

  if (!menu) notFound();

  if (menu.categories.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Todavía no hay platos cargados en la carta.
      </p>
    );
  }

  return <MenuBrowser categories={menu.categories} />;
}
