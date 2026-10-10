"use client";

import { Bell, CircleCheck, Download, ExternalLink, Utensils } from "lucide-react";
import { TableMenu } from "@/components/admin/mesas/TableMenu";
import { STATE_LABEL, menuHref, qrSrc, tableSummary } from "@/components/admin/mesas/tableState";
import type { AdminTable } from "@/lib/admin/getAdminTables";
import type { AdminLiveTable, AdminTableState } from "@/lib/admin/live/types";

export function StateIcon({ state }: { state: AdminTableState }) {
  if (state === "calling") return <Bell aria-hidden="true" />;
  if (state === "occupied") return <Utensils aria-hidden="true" />;
  return <CircleCheck aria-hidden="true" />;
}

// Mesa: fila compacta que abre la hoja (celular, CA-8.8) / tarjeta con QR y
// acciones (escritorio, CA-8.7). Cada variante se oculta con CSS en el otro
// ancho; la oculta no carga su QR (loading="lazy" + display: none).
export function TableCard({
  table,
  live,
  onOpen,
  onDelete,
}: {
  table: AdminTable;
  live: AdminLiveTable | undefined;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onDelete: (table: AdminTable) => void;
}) {
  const state: AdminTableState = live?.state ?? "free";
  const summary = tableSummary(live);

  return (
    <li className="adm-table" data-state={state}>
      <button
        type="button"
        className="adm-table__row"
        aria-haspopup="dialog"
        onClick={(e) => onOpen(table.id, e.currentTarget)}
      >
        <span className="adm-table__qr adm-table__qr--s">
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG propio de /api/qr: sin optimizador, el QR no se re-codifica */}
          <img src={qrSrc(table.qrToken)} alt="" width={56} height={56} loading="lazy" decoding="async" />
        </span>
        <span className="adm-table__text">
          <span className="adm-table__name">{table.label}</span>
          {summary ? <span className="adm-table__sum">{summary}</span> : null}
        </span>
        <span className="adm-chip" data-state={state}>
          <StateIcon state={state} />
          {STATE_LABEL[state]}
        </span>
      </button>

      <div className="adm-table__card">
        <div className="adm-table__head">
          <h2 className="adm-table__title">{table.label}</h2>
          <TableMenu label={table.label} onDelete={() => onDelete(table)} />
        </div>
        <div className="adm-table__body">
          <span className="adm-table__qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- PNG propio de /api/qr: sin optimizador, el QR no se re-codifica */}
            <img
              src={qrSrc(table.qrToken)}
              alt={`QR de ${table.label}`}
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
            />
          </span>
          <div className="adm-state" data-state={state}>
            <span className="adm-state__label">
              <StateIcon state={state} />
              {STATE_LABEL[state]}
            </span>
            {summary ? <span className="adm-state__sum">{summary}</span> : null}
          </div>
        </div>
        <div className="adm-table__actions">
          <a
            className="adm-btn adm-btn--small"
            href={qrSrc(table.qrToken)}
            download
            aria-label={`Descargar QR de ${table.label}`}
          >
            <Download aria-hidden="true" />
            Descargar
          </a>
          <a
            className="adm-btn adm-btn--small"
            href={menuHref(table.qrToken)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver carta de ${table.label}`}
          >
            <ExternalLink aria-hidden="true" />
            Ver carta
          </a>
        </div>
      </div>
    </li>
  );
}
