import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders/getOrder";
import { OrderStatusTracker } from "@/components/client/OrderStatusTracker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function OrderStatusPage({
  params,
}: PageProps<"/m/[tableId]/pedido/[orderId]">) {
  const { tableId, orderId } = await params;
  const data = await getOrder(orderId);

  if (!data) notFound();

  const { order, items } = data;

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-[family-name:var(--font-menu-display)] text-xl font-semibold">
          Tu pedido
        </h1>
        <p className="text-sm text-muted-foreground">
          Hecho a las {timeFormatter.format(new Date(order.createdAt))}
        </p>
      </div>

      <OrderStatusTracker orderId={order.id} initialStatus={order.status} />

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {item.quantity}× {item.menuItemName}
                </p>
                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {item.selectedOptions.map((o) => o.choiceName).join(" · ")}
                  </p>
                )}
                {item.note && (
                  <p className="text-xs italic text-muted-foreground">
                    &ldquo;{item.note}&rdquo;
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold text-primary">
                {formatPrice(item.subtotal)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
        <span>Total</span>
        <span className="text-primary">{formatPrice(order.total)}</span>
      </div>

      <Button variant="outline" render={<Link href={`/m/${tableId}`} />}>
        Pedir algo más
      </Button>
    </div>
  );
}
