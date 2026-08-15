import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { MenuItemData } from "@/lib/types/menu";

export function MenuItemCard({
  item,
  onSelect,
}: {
  item: MenuItemData;
  onSelect: () => void;
}) {
  return (
    <Card
      onClick={onSelect}
      className="flex flex-row items-stretch gap-3 p-3 cursor-pointer hover:border-primary/50 transition-colors"
    >
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={item.name}
          loading="lazy"
          className="size-20 shrink-0 rounded-md object-cover bg-muted"
        />
      ) : (
        <div className="size-20 shrink-0 rounded-md bg-muted" />
      )}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <h3 className="font-medium leading-tight truncate">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {item.description}
            </p>
          )}
        </div>
        <span className="text-sm font-semibold mt-1">
          {formatPrice(item.price)}
        </span>
      </div>
    </Card>
  );
}
