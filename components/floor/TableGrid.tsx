import { BellRing, CircleCheck, CircleDashed, Utensils, type LucideIcon } from "lucide-react";

// Contrato que reutiliza el admin (lib/floor/tableStatus.ts, D-23 punto 5): no cambia.
export type TableStatus = "calling" | "ready" | "active" | "free";

const STATUS_LABELS: Record<TableStatus, string> = {
  calling: "Llamando",
  ready: "Listo",
  active: "Con pedido",
  free: "Libre",
};

// Texto + ícono + color por estado (CA-1.4, CA-8.6); colores en staff.css.
const STATUS_ICONS: Record<TableStatus, LucideIcon> = {
  calling: BellRing,
  ready: CircleCheck,
  active: Utensils,
  free: CircleDashed,
};

export function TableGrid({
  tables,
}: {
  tables: { id: string; label: string; status: TableStatus }[];
}) {
  if (tables.length === 0) {
    return (
      <div className="st-empty st-empty--small">
        <p className="st-empty__text">Todavía no hay mesas.</p>
      </div>
    );
  }

  return (
    <ul className="st-tables">
      {tables.map((table) => {
        const Icon = STATUS_ICONS[table.status];
        return (
          <li key={table.id} className="st-table" data-state={table.status}>
            <p className="st-table__name">{table.label}</p>
            <span className="st-table__state">
              <Icon aria-hidden="true" />
              {STATUS_LABELS[table.status]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
