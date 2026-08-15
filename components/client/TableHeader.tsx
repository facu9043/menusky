import { Badge } from "@/components/ui/badge";
import type { RestaurantData, TableData } from "@/lib/types/menu";

export function TableHeader({
  restaurant,
  table,
}: {
  restaurant: RestaurantData;
  table: TableData;
}) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      {restaurant.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={restaurant.logoUrl}
          alt={restaurant.name}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {restaurant.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold leading-tight">{restaurant.name}</h1>
      </div>
      <Badge variant="secondary">{table.label}</Badge>
    </header>
  );
}
