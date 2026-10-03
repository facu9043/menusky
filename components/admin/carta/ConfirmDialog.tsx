"use client";

import { useRef } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { BrandPomo } from "@/components/admin/carta/BrandPomo";
import { useAdminPortalClass } from "@/components/admin/shell/portal";

// Confirmación propia de la marca (en lugar de window.confirm): foco
// inicial en "Cancelar" (CA-7.12, CA-13.3), Escape cancela, el foco vuelve
// a donde estaba. Si se renderiza dentro de otra hoja/diálogo, base-ui lo
// trata como diálogo anidado.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  busy = false,
  tone = "danger",
  onConfirm,
  onCancel,
  finalFocus,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
  /** A dónde vuelve el foco al cerrar (por defecto, al disparador). Útil cuando el disparador desaparece. */
  finalFocus?: () => HTMLElement | boolean | null;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const portalClass = useAdminPortalClass();

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialog.Portal className={portalClass}>
        <AlertDialog.Backdrop className="adm-dialog-backdrop" />
        <AlertDialog.Popup className="adm-dialog" initialFocus={cancelRef} finalFocus={finalFocus} aria-modal="true">
          <div className="adm-dialog__top">
            <BrandPomo face="oops" size="s" />
            <div style={{ minWidth: 0 }}>
              <AlertDialog.Title className="adm-dialog__title">{title}</AlertDialog.Title>
              {description ? (
                <AlertDialog.Description className="adm-dialog__desc">{description}</AlertDialog.Description>
              ) : null}
            </div>
          </div>
          <div className="adm-dialog__actions">
            <button ref={cancelRef} type="button" className="adm-btn" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={tone === "danger" ? "adm-btn adm-btn--danger-solid" : "adm-btn adm-btn--primary"}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
