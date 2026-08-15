import { cn } from "@/lib/utils";

export type TableStatus = "calling" | "ready" | "active" | "free";

const STATUS_LABELS: Record<TableStatus, string> = {
  calling: "Llamando",
  ready: "Listo",
  active: "Con pedido",
  free: "Libre",
};

const STATUS_CLASSES: Record<TableStatus, string> = {
  calling: "border-destructive bg-destructive/10 text-destructive",
  ready: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  active: "border-primary/40 bg-primary/5 text-primary",
  free: "border-border bg-card text-muted-foreground",
};

export function TableGrid({
  tables,
}: {
  tables: { id: string; label: string; status: TableStatus }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {tables.map((table) => (
        <div
          key={table.id}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center",
            STATUS_CLASSES[table.status]
          )}
        >
          <span className="text-sm font-semibold">{table.label}</span>
          <span className="text-[11px]">{STATUS_LABELS[table.status]}</span>
        </div>
      ))}
    </div>
  );
}
