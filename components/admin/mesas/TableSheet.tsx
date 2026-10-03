"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Download, ExternalLink, Trash2, X } from "lucide-react";
import { StateIcon } from "@/components/admin/mesas/TableCard";
import { STATE_LABEL, menuHref, qrSrc, tableSummary } from "@/components/admin/mesas/tableState";
import { useAdminPortalClass } from "@/components/admin/shell/portal";
import type { AdminTable } from "@/lib/admin/getAdminTables";
import type { AdminLiveTable } from "@/lib/admin/live/types";

// Hoja de mesa en celular (CA-8.8, CA-8.9): QR grande en un recuadro claro
// sobre fondo tomate (los módulos nunca van directo sobre el tomate),
// estado, resumen, Descargar, Ver carta y Eliminar mesa. Misma hoja que la
// del plato: role="dialog", foco atrapado y devuelto, Escape y Atrás.
export function TableSheet({
  open,
  table,
  live,
  finalFocus,
  onClose,
  onDelete,
  children,
}: {
  open: boolean;
  table: AdminTable | null;
  live: AdminLiveTable | undefined;
  finalFocus: () => HTMLElement | boolean | null;
  onClose: () => void;
  onDelete: (table: AdminTable) => void;
  /** La confirmación de borrar va DENTRO de la hoja (diálogo anidado). */
  children?: React.ReactNode;
}) {
  const portalClass = useAdminPortalClass();
  const state = live?.state ?? "free";
  const summary = tableSummary(live);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal className={portalClass}>
        <Dialog.Backdrop className="adm-backdrop" />
        <Dialog.Popup className="adm-sheet" finalFocus={finalFocus} aria-modal="true">
          <div className="adm-sheet__grab" aria-hidden="true" />
          <div className="adm-sheet__head">
            <Dialog.Title className="adm-sheet__title">{table?.label ?? "Mesa"}</Dialog.Title>
            <Dialog.Close className="adm-icon-btn adm-icon-btn--framed" aria-label="Cerrar">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          {table ? (
            <>
              <div className="adm-sheet__body">
                <div className="adm-qrpanel">
                  <span className="adm-qrpanel__frame">
                    {/* eslint-disable-next-line @next/next/no-img-element -- PNG propio de /api/qr: sin optimizador, el QR no se re-codifica */}
                    <img src={qrSrc(table.qrToken)} alt={`QR de ${table.label}`} width={208} height={208} />
                  </span>
                  <p className="adm-qrpanel__text">Escaneá y pedí desde la mesa</p>
                </div>
                <div className="adm-state adm-state--wide" data-state={state}>
                  <span className="adm-state__label">
                    <StateIcon state={state} />
                    {STATE_LABEL[state]}
                  </span>
                  {summary ? <span className="adm-state__sum">{summary}</span> : null}
                </div>
                <div className="adm-sheet__actions">
                  <a
                    className="adm-btn adm-btn--primary"
                    href={qrSrc(table.qrToken)}
                    download
                    aria-label={`Descargar QR de ${table.label}`}
                  >
                    <Download aria-hidden="true" />
                    Descargar
                  </a>
                  <a
                    className="adm-btn"
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
              <div className="adm-sheet__foot">
                <button type="button" className="adm-btn adm-btn--danger adm-btn--block" onClick={() => onDelete(table)}>
                  <Trash2 aria-hidden="true" />
                  Eliminar mesa
                </button>
              </div>
            </>
          ) : (
            <div className="adm-sheet__body">
              <p className="adm-empty__text" role="status">
                No encontramos esta mesa. Puede que la hayan eliminado.
              </p>
            </div>
          )}
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
