"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronRight } from "lucide-react";
import { useAdminPortalClass } from "@/components/admin/shell/portal";
import type { AdminCategory } from "@/lib/types/adminMenu";

// "Nuevo plato" con "Todas" activa: se elige la categoría (CA-6.13).
export function PickCategoryDialog({
  open,
  onOpenChange,
  categories,
  busy,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AdminCategory[];
  busy: boolean;
  onPick: (category: AdminCategory) => void;
}) {
  const portalClass = useAdminPortalClass();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal className={portalClass}>
        <Dialog.Backdrop className="adm-dialog-backdrop" />
        <Dialog.Popup className="adm-dialog">
          <Dialog.Title className="adm-dialog__title">¿En qué categoría va?</Dialog.Title>
          <Dialog.Description className="adm-dialog__desc">
            El plato nuevo se suma al final de la categoría que elijas.
          </Dialog.Description>
          <ul className="adm-pick adm-dialog__body">
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className="adm-btn"
                  disabled={busy}
                  onClick={() => onPick(category)}
                >
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{category.name}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="adm-dialog__actions">
            <Dialog.Close className="adm-btn adm-btn--quiet" disabled={busy}>
              Cancelar
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
