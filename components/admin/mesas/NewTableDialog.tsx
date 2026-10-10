"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@base-ui/react/dialog";
import { createTable } from "@/lib/admin/tables";
import { useAdminPortalClass } from "@/components/admin/shell/portal";

// Alta de mesa (CA-8.10, CA-NR.31): recorta espacios, vacío no se crea, se
// envía con Enter; si falla se conserva lo escrito. Mismo diálogo que
// "Nueva categoría" en la Carta.
export function NewTableDialog({
  open,
  onOpenChange,
  restaurantId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onCreated: (label: string) => void;
}) {
  const portalClass = useAdminPortalClass();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Escribí un nombre para la mesa.");
      return;
    }
    setSaving(true);
    try {
      await createTable(restaurantId, clean);
      setName("");
      setError(null);
      onOpenChange(false);
      onCreated(clean);
    } catch {
      toast.error("No se pudo crear la mesa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <Dialog.Portal className={portalClass}>
        <Dialog.Backdrop className="adm-dialog-backdrop" />
        <Dialog.Popup className="adm-dialog" aria-modal="true">
          <form onSubmit={handleSubmit} noValidate>
            <Dialog.Title className="adm-dialog__title">Nueva mesa</Dialog.Title>
            <Dialog.Description className="adm-dialog__desc">
              Aparece como Libre, con su QR listo para descargar.
            </Dialog.Description>
            <div className="adm-dialog__body">
              <div className="adm-field">
                <label className="adm-label" htmlFor={inputId}>
                  Nombre de la mesa
                </label>
                <input
                  id={inputId}
                  className="adm-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: Mesa 7"
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
                {error ? (
                  <p id={errorId} className="adm-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="adm-dialog__actions">
              <Dialog.Close className="adm-btn" disabled={saving}>
                Cancelar
              </Dialog.Close>
              <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                {saving ? "Creando..." : "Crear mesa"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
