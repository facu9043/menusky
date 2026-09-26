import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders/getOrder";
import { OrderStatusTracker } from "@/components/client/OrderStatusTracker";
import { TransitionLink } from "@/components/client/TransitionLink";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

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
          <Card
            key={item.id}
            className={cn("relative overflow-hidden p-3", item.photoUrl && "text-white")}
          >
            {item.photoUrl && (
              <>
                {/* Foto del plato de fondo, atenuada con un degradado oscuro
                    para que el texto de arriba siga siendo legible sea cual
                    sea la foto. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.photoUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />
              </>
            )}
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {item.quantity}× {item.menuItemName}
                </p>
                {item.selectedOptions.length > 0 && (
                  <p className={cn("text-xs", item.photoUrl ? "text-white/80" : "text-muted-foreground")}>
                    {item.selectedOptions.map((o) => o.choiceName).join(" · ")}
                  </p>
                )}
                {item.note && (
                  <p
                    className={cn(
                      "text-xs italic",
                      item.photoUrl ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    &ldquo;{item.note}&rdquo;
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold",
                  item.photoUrl ? "text-white" : "text-primary"
                )}
              >
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

      <Button variant="outline" render={<TransitionLink href={`/m/${tableId}`} />}>
        Pedir algo más
      </Button>
    </div>
  );
}
