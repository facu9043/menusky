"use client";

import { memo, useState } from "react";
import { Pencil, Sandwich } from "lucide-react";
import { BrandSwitch } from "@/components/admin/carta/BrandSwitch";
import { formatPrice } from "@/lib/format";
import type { AdminMenuItem } from "@/lib/types/adminMenu";

/** "2 opciones · Guarnición, Punto" (CA-6.4): N = cantidad de grupos. */
function optionsSummary(item: AdminMenuItem): string | null {
  const n = item.optionGroups.length;
  if (n === 0) return null;
  const names = item.optionGroups.map((g) => g.name).join(", ");
  return `${n} ${n === 1 ? "opción" : "opciones"} · ${names}`;
}

// Foto con espacio reservado si no hay o si no carga (caso límite 9).
export function DishPhoto({ url, className }: { url: string | null; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImg = url && failedUrl !== url;
  return (
    <span className={className}>
      {showImg ? (
        // URLs de Storage o pegadas a mano (cualquier dominio): <img> nativo,
        // diferido y con tamaño fijo para no mover el layout.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" width={84} height={84} onError={() => setFailedUrl(url)} />
      ) : (
        <Sandwich aria-hidden="true" />
      )}
    </span>
  );
}

// Un solo DOM para los dos tamaños: fila compacta en celular, tarjeta en
// escritorio (admin.css). La zona de foto + nombre + precio es UN botón que
// abre la hoja (CA-6.12); el interruptor es un hermano, nunca anidado.
export const DishItem = memo(function DishItem({
  item,
  available,
  onOpen,
  onToggle,
}: {
  item: AdminMenuItem;
  available: boolean;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onToggle: (id: string, current: boolean) => void;
}) {
  const summary = optionsSummary(item);
  const stateText = available ? "Disponible" : "Sin stock hoy";
  const stateClass = available ? "adm-dish__state" : "adm-dish__state adm-dish__state--off";

  return (
    <li className="adm-dish" data-off={available ? undefined : "true"}>
      <button
        type="button"
        className="adm-dish__open"
        data-dish-open={item.id}
        onClick={(e) => onOpen(item.id, e.currentTarget)}
      >
        <DishPhoto url={item.photoUrl} className="adm-dish__photo" />
        <span className="adm-dish__text">
          <span className="sr-only">Editar </span>
          <span className="adm-dish__name">{item.name}</span>
          {summary ? <span className="adm-dish__opts">{summary}</span> : null}
          <span className="adm-dish__price">{formatPrice(item.price)}</span>
          {available ? null : <span className={stateClass}>{stateText}</span>}
        </span>
        <span className="adm-dish__pen" aria-hidden="true">
          <Pencil />
        </span>
      </button>
      <div className="adm-dish__ctrl">
        <span className={stateClass} aria-hidden="true">
          {stateText}
        </span>
        <BrandSwitch
          checked={available}
          label={`Disponible: ${item.name}`}
          onToggle={() => onToggle(item.id, available)}
        />
      </div>
    </li>
  );
});
