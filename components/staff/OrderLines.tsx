import type { BoardOrder } from "@/lib/orders/board";

// Renglones de una comanda (K-5, F-6): "N× nombre", opciones unidas con " · "
// y, solo en Cocina, la nota entre comillas en cursiva.
export function OrderLines({ items, withNotes }: { items: BoardOrder["items"]; withNotes: boolean }) {
  return (
    <ul className="st-items">
      {items.map((item) => (
        <li key={item.id}>
          <span className="st-item__line">
            <span className="st-item__qty">{item.quantity}×</span> {item.menuItemName}
          </span>
          {item.selectedOptions.length > 0 && (
            <p className="st-item__opts">{item.selectedOptions.map((o) => o.choiceName).join(" · ")}</p>
          )}
          {withNotes && item.note && <p className="st-item__note">&ldquo;{item.note}&rdquo;</p>}
        </li>
      ))}
    </ul>
  );
}

/** Etiqueta estática "Nuevo" + punto que late solo con movimiento permitido (CA-8.1, CA-5.2). */
export function NewTag() {
  return (
    <span className="st-new">
      <span className="st-new__dot" aria-hidden="true" />
      Nuevo
    </span>
  );
}
