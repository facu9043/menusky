import { BellRing, Check, ChefHat, CircleCheck, Download } from "lucide-react";
import { ORDER_STEPS } from "./data";

/** Monto oculto: los paneles del staff muestran "Cuenta de la mesa hoy",
 *  pero la spec solo permite montos dentro de la carta (CA-3.2), así que
 *  en estos mockups el valor se representa con una barra. */
export function HiddenAmount() {
  return <span className="ms-amount-bar" />;
}

/** Tarjeta de pedido del panel de cocina (components/kitchen/OrderCard.tsx). */
export function KitchenCard({
  table,
  time,
  items,
  status,
  isNew = false,
  className,
}: {
  table: string;
  time: string;
  items: { qty: number; name: string; options?: string; note?: string }[];
  status: "received" | "in_kitchen";
  isNew?: boolean;
  className?: string;
}) {
  return (
    <div className={`ms-kcard ${status === "received" ? "is-received" : "is-cooking"} ${className ?? ""}`}>
      {isNew && <span className="ms-kcard__ping" />}
      <div className="ms-kcard__row">
        <span className="ms-kcard__badge">{table}</span>
        <span className="ms-kcard__time">{time}</span>
      </div>
      <p className="ms-kcard__total">
        Cuenta de la mesa hoy: <HiddenAmount />
      </p>
      <ul className="ms-kcard__items">
        {items.map((item) => (
          <li key={item.name}>
            <span className="ms-kcard__item">
              {item.qty}× {item.name}
            </span>
            {item.options && <span className="ms-kcard__opts">{item.options}</span>}
            {item.note && <span className="ms-kcard__note">“{item.note}”</span>}
          </li>
        ))}
      </ul>
      <span className="ms-kcard__btn">
        {status === "received" ? <ChefHat /> : <CircleCheck />}
        {status === "received" ? "Tomar pedido" : "Marcar listo"}
      </span>
    </div>
  );
}

/** Seguimiento del pedido (components/client/OrderStatusTracker.tsx). */
export function StatusTracker({ current, className }: { current: number; className?: string }) {
  return (
    <ol className={`ms-tracker ${className ?? ""}`} data-current={current}>
      {ORDER_STEPS.map((label, i) => (
        <li key={label} className={`ms-tracker__step ${i <= current ? "is-done" : ""} ${i === current ? "is-current" : ""}`} data-i={i}>
          <span className="ms-tracker__dot">{i + 1}</span>
          <span className="ms-tracker__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

// QR decorativo: patrón pseudoaleatorio fijo con los tres cuadros de
// posición. NO codifica ningún dato (no es un qr_token real, CA-4.4).
function buildQrPath(size = 21, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.52) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  const finder = (ox: number, oy: number) =>
    `M${ox} ${oy}h7v7h-7zM${ox + 1} ${oy + 1}v5h5v-5zM${ox + 2} ${oy + 2}h3v3h-3z`;
  d += finder(0, 0) + finder(size - 7, 0) + finder(0, size - 7);
  return d;
}

const QR_PATH = buildQrPath();

export function FakeQr({ className }: { className?: string }) {
  return (
    <svg viewBox="-2 -2 25 25" className={className} aria-hidden="true" focusable="false">
      <rect x="-2" y="-2" width="25" height="25" rx="2" fill="#FFFDF8" />
      <path d={QR_PATH} fill="#2B1710" fillRule="evenodd" />
    </svg>
  );
}

/** Hoja "¿En qué te ayudamos?" de components/client/CallWaiterButton.tsx. */
export function WaiterSheet({ highlight }: { highlight: "cuenta" | "consulta" }) {
  return (
    <div className="ms-wsheet">
      <span className="ms-wsheet__title">¿En qué te ayudamos?</span>
      <span className={`ms-wsheet__opt ${highlight === "cuenta" ? "is-picked" : ""}`}>Pedir la cuenta</span>
      <span className={`ms-wsheet__opt ${highlight === "consulta" ? "is-picked" : ""}`}>Hacer una consulta</span>
    </div>
  );
}

/** Fila de "Llamados de mozo" (components/floor/WaiterCallRow.tsx). */
export function CallRow({
  table,
  reason,
  time,
  showTotal = false,
  className,
}: {
  table: string;
  reason: string;
  time: string;
  showTotal?: boolean;
  className?: string;
}) {
  return (
    <div className={`ms-callrow ${className ?? ""}`}>
      <BellRing className="ms-callrow__icon" />
      <span className="ms-callrow__text">
        <span className="ms-callrow__table">{table}</span>
        <span className="ms-callrow__meta">
          {reason} · {time}
        </span>
        {showTotal && (
          <span className="ms-callrow__meta">
            Cuenta de hoy: <HiddenAmount />
          </span>
        )}
      </span>
      <span className="ms-callrow__btn">
        <Check />
        Atendido
      </span>
    </div>
  );
}

const TABLES: { label: string; status: "free" | "active" | "ready" | "calling" }[] = [
  { label: "Mesa 1", status: "free" },
  { label: "Mesa 2", status: "active" },
  { label: "Mesa 3", status: "free" },
  { label: "Mesa 4", status: "ready" },
  { label: "Mesa 5", status: "active" },
  { label: "Mesa 6", status: "free" },
  { label: "Mesa 7", status: "calling" },
  { label: "Mesa 8", status: "active" },
  { label: "Mesa 9", status: "free" },
];

const TABLE_LABELS = {
  free: "Libre",
  active: "Con pedido",
  ready: "Listo",
  calling: "Llamando",
} as const;

/** Grilla "Mesas" del panel de salón (components/floor/TableGrid.tsx). */
export function TableGrid() {
  return (
    <div className="ms-tables">
      {TABLES.map((t) => (
        <span key={t.label} className={`ms-tables__cell is-${t.status}`}>
          <span className="ms-tables__label">{t.label}</span>
          <span className="ms-tables__status">{TABLE_LABELS[t.status]}</span>
        </span>
      ))}
    </div>
  );
}

/** Panel de administración: carta y mesas (components/admin/*). */
export function AdminMock() {
  const rows = [
    { name: "Burger completa", on: true },
    { name: "Napolitana", on: true },
    { name: "Flan casero", on: false },
  ];
  return (
    <div className="ms-admin">
      <div className="ms-admin__tabs">
        <span className="is-active">Carta</span>
        <span>Mesas</span>
        <span>Apariencia</span>
      </div>
      <ul className="ms-admin__rows">
        {rows.map((row) => (
          <li key={row.name} className="ms-admin__row">
            <span className="ms-admin__name">{row.name}</span>
            <span className={`ms-admin__pill ${row.on ? "is-on" : "is-off"}`}>
              <i />
              {row.on ? "Disponible" : "Sin stock hoy"}
            </span>
          </li>
        ))}
      </ul>
      <div className="ms-admin__table">
        <FakeQr className="ms-admin__qr" />
        <span className="ms-admin__tlabel">Mesa 4</span>
        <span className="ms-admin__dl">
          <Download />
          Descargar QR
        </span>
      </div>
    </div>
  );
}
