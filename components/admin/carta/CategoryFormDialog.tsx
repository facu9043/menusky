"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@base-ui/react/dialog";
import { createCategory } from "@/lib/admin/categories";
import { useAdminPortalClass } from "@/components/admin/shell/portal";

// Alta de categoría (CA-NR.11): recorta espacios, vacío no se crea, si falla
// se conserva lo escrito.
export function CategoryFormDialog({
  open,
  onOpenChange,
  restaurantId,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  nextSortOrder: number;
}) {
  const router = useRouter();
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
      setError("Escribí un nombre para la categoría.");
      return;
    }
    setSaving(true);
    try {
      await createCategory(restaurantId, clean, nextSortOrder);
      setName("");
      setError(null);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("No se pudo crear la categoría");
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
        <Dialog.Popup className="adm-dialog">
          <form onSubmit={handleSubmit} noValidate>
            <Dialog.Title className="adm-dialog__title">Nueva categoría</Dialog.Title>
            <Dialog.Description className="adm-dialog__desc">
              Aparece al final de la carta. Después le sumás platos.
            </Dialog.Description>
            <div className="adm-dialog__body">
              <div className="adm-field">
                <label className="adm-label" htmlFor={inputId}>
                  Nombre
                </label>
                <input
                  id={inputId}
                  className="adm-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: Postres"
                  autoComplete="off"
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
                {saving ? "Creando..." : "Crear categoría"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
