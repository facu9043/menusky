"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@base-ui/react/dialog";
import { Camera, Link2, Trash2, X } from "lucide-react";
import { BrandSwitch } from "@/components/admin/carta/BrandSwitch";
import { ConfirmDialog } from "@/components/admin/carta/ConfirmDialog";
import { DishPhoto } from "@/components/admin/carta/DishItem";
import { OptionGroupsPanel } from "@/components/admin/carta/OptionGroupsPanel";
import { useAdminPortalClass } from "@/components/admin/shell/portal";
import { deleteMenuItem, updateMenuItem } from "@/lib/admin/menuItems";
import {
  PHOTO_ALLOWED_TYPES,
  PhotoValidationError,
  uploadMenuItemPhoto,
  validateMenuItemPhoto,
} from "@/lib/admin/uploadMenuItemPhoto";
import type { AdminMenuItem } from "@/lib/types/adminMenu";

export interface DishPatch {
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
}

/** Textos por motivo de PhotoValidationError (D-7: JPG/PNG/WebP/GIF hasta 5 MB). */
const PHOTO_MESSAGES: Record<PhotoValidationError["reason"], string> = {
  type: "Ese archivo no es una foto que podamos usar. Subí una JPG, PNG, WebP o GIF.",
  size: "La foto pesa más de 5 MB. Probá con una más liviana o sacala de nuevo con menos calidad.",
};

/** Plato con pedidos: la base no deja borrarlo (sección 7, caso 4). */
export function isForeignKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23503";
}

type Errors = { name?: string; price?: string; photo?: string };

function validate(name: string, price: string, photoUrl: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = "El plato necesita un nombre.";
  const raw = price.trim();
  const value = Number(raw);
  if (raw === "" || Number.isNaN(value)) errors.price = "Poné un precio (puede ser 0).";
  else if (value < 0) errors.price = "El precio no puede ser negativo.";
  else if (!Number.isInteger(value)) errors.price = "Usá un número entero, sin centavos.";
  const url = photoUrl.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    errors.photo = "El link de la foto tiene que empezar con http:// o https://.";
  }
  return errors;
}

function DishEditor({
  item,
  isNew,
  dirtyRef,
  onSaved,
  onDeleted,
}: {
  item: AdminMenuItem;
  isNew: boolean;
  dirtyRef: React.RefObject<boolean>;
  onSaved: (id: string, patch: DishPatch) => void;
  onDeleted: (id: string) => void;
}) {
  const formId = useId();
  const ids = {
    name: useId(),
    price: useId(),
    desc: useId(),
    url: useId(),
    nameErr: useId(),
    priceErr: useId(),
    photoErr: useId(),
    avail: useId(),
  };
  const [initial] = useState(() => ({
    name: item.name,
    description: item.description ?? "",
    price: String(item.price),
    photoUrl: item.photoUrl ?? "",
    isAvailable: item.isAvailable,
  }));
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(initial.price);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);
  const [isAvailable, setIsAvailable] = useState(initial.isAvailable);
  const [showUrl, setShowUrl] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== initial.name ||
    description !== initial.description ||
    price !== initial.price ||
    photoUrl !== initial.photoUrl ||
    isAvailable !== initial.isAvailable;

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);
  useEffect(
    () => () => {
      dirtyRef.current = false;
    },
    [dirtyRef]
  );

  // Plato recién creado: nombre seleccionado, escribir lo reemplaza (CA-6.13).
  useEffect(() => {
    if (!isNew) return;
    const raf = requestAnimationFrame(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [isNew]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrors((prev) => ({ ...prev, photo: undefined }));
    try {
      validateMenuItemPhoto(file);
    } catch (err) {
      if (err instanceof PhotoValidationError) {
        setErrors((prev) => ({ ...prev, photo: PHOTO_MESSAGES[err.reason] }));
        return;
      }
    }
    setUploading(true);
    try {
      const url = await uploadMenuItemPhoto(item.id, file);
      setPhotoUrl(url);
      setShowUrl(false);
    } catch (err) {
      if (err instanceof PhotoValidationError) {
        setErrors((prev) => ({ ...prev, photo: PHOTO_MESSAGES[err.reason] }));
      } else {
        toast.error("No se pudo subir la foto");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    const found = validate(name, price, photoUrl);
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.price) return priceRef.current?.focus();
    if (found.photo) {
      setShowUrl(true);
      requestAnimationFrame(() => urlRef.current?.focus());
      return;
    }
    setSaving(true);
    const fields = {
      name: name.trim(),
      description,
      price: Number(price) || 0,
      photoUrl,
      isAvailable,
    };
    try {
      await updateMenuItem(item.id, fields);
      dirtyRef.current = false;
      onSaved(item.id, {
        name: fields.name,
        description: description.trim() || null,
        price: fields.price,
        photoUrl: photoUrl.trim() || null,
        isAvailable,
      });
    } catch {
      toast.error("No se pudo guardar el plato");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMenuItem(item.id);
      dirtyRef.current = false;
      setConfirmDelete(false);
      onDeleted(item.id);
    } catch (err) {
      toast.error("No se pudo eliminar el plato", {
        description: isForeignKeyError(err)
          ? "Este plato ya tiene pedidos y no se puede borrar. Marcalo como sin stock."
          : undefined,
      });
      setDeleting(false);
    }
  };

  const hasPhoto = photoUrl.trim() !== "";

  return (
    <>
      <div className="adm-sheet__body">
        <form id={formId} onSubmit={handleSubmit} noValidate className="adm-groups">
          <div className="adm-photo">
            <span className="adm-photo__frame">
              <DishPhoto url={hasPhoto ? photoUrl : null} className="adm-photo__img" />
              {uploading ? (
                <span className="adm-photo__busy" role="status">
                  Subiendo...
                </span>
              ) : null}
            </span>
            <div className="adm-photo__actions">
              <button
                type="button"
                className="adm-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-describedby={errors.photo ? ids.photoErr : undefined}
              >
                <Camera aria-hidden="true" />
                {hasPhoto ? "Cambiar foto" : "Subir foto"}
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.5rem" }}>
                <button
                  type="button"
                  className="adm-link-btn"
                  aria-expanded={showUrl}
                  onClick={() => setShowUrl((s) => !s)}
                >
                  <Link2 aria-hidden="true" />
                  Pegar un link
                </button>
                {hasPhoto ? (
                  <button
                    type="button"
                    className="adm-link-btn adm-link-btn--danger"
                    onClick={() => {
                      setPhotoUrl("");
                      setErrors((prev) => ({ ...prev, photo: undefined }));
                    }}
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={PHOTO_ALLOWED_TYPES.join(",")}
              hidden
              tabIndex={-1}
              onChange={handleFile}
            />
          </div>
          {showUrl ? (
            <div className="adm-field">
              <label className="adm-label" htmlFor={ids.url}>
                Link de la foto
              </label>
              <input
                ref={urlRef}
                id={ids.url}
                className="adm-input"
                type="url"
                inputMode="url"
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  if (errors.photo) setErrors((prev) => ({ ...prev, photo: undefined }));
                }}
                placeholder="https://..."
                autoComplete="off"
                aria-invalid={errors.photo ? true : undefined}
                aria-describedby={errors.photo ? ids.photoErr : undefined}
              />
            </div>
          ) : null}
          {errors.photo ? (
            <p id={ids.photoErr} className="adm-error" role="alert">
              {errors.photo}
            </p>
          ) : null}

          <div className="adm-field">
            <label className="adm-label" htmlFor={ids.name}>
              Nombre
            </label>
            <input
              ref={nameRef}
              id={ids.name}
              className="adm-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? ids.nameErr : undefined}
            />
            {errors.name ? (
              <p id={ids.nameErr} className="adm-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="adm-row adm-row--price">
            <div className="adm-field">
              <label className="adm-label" htmlFor={ids.price}>
                Precio
              </label>
              <input
                ref={priceRef}
                id={ids.price}
                className="adm-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={errors.price ? ids.priceErr : undefined}
              />
              {errors.price ? (
                <p id={ids.priceErr} className="adm-error" role="alert">
                  {errors.price}
                </p>
              ) : null}
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor={ids.desc}>
              Descripción
            </label>
            <textarea
              id={ids.desc}
              className="adm-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Qué lleva, para cuántos es..."
            />
          </div>

          <div className="adm-toggle-row">
            <div style={{ minWidth: 0 }}>
              <span className="adm-toggle-row__label" id={ids.avail}>
                Disponible hoy
              </span>
              <span
                className={
                  isAvailable ? "adm-toggle-row__state" : "adm-toggle-row__state adm-toggle-row__state--off"
                }
              >
                {isAvailable ? "Se ve en la carta" : "Sin stock hoy: no se ve en la carta"}
              </span>
            </div>
            <BrandSwitch
              checked={isAvailable}
              labelledBy={ids.avail}
              onToggle={() => setIsAvailable((a) => !a)}
            />
          </div>
        </form>

        <OptionGroupsPanel item={item} />

        <div className="adm-danger-zone">
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" />
            Eliminar plato
          </button>
        </div>
      </div>

      <div className="adm-sheet__foot">
        <button
          type="submit"
          form={formId}
          className="adm-btn adm-btn--save adm-btn--block"
          disabled={saving || uploading}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Eliminar "${item.name}" de la carta?`}
        description="Se borra con sus opciones. No se puede deshacer."
        confirmLabel="Eliminar plato"
        busyLabel="Eliminando..."
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

// Hoja de edición (HU-7). Celular: sube desde abajo. Escritorio (>= 768 px):
// panel lateral derecho, para seguir viendo la carta a la izquierda (CA-7.2).
// base-ui Dialog: role="dialog", aria-modal, foco atrapado y devuelto,
// Escape, scroll de fondo bloqueado (CA-7.9).
export function DishSheet({
  open,
  item,
  loading,
  isNew,
  dirtyRef,
  discardOpen,
  finalFocus,
  onRequestClose,
  onDiscardConfirm,
  onDiscardCancel,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  item: AdminMenuItem | null;
  loading: boolean;
  isNew: boolean;
  dirtyRef: React.RefObject<boolean>;
  discardOpen: boolean;
  finalFocus: () => HTMLElement | boolean | null;
  onRequestClose: () => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
  onSaved: (id: string, patch: DishPatch) => void;
  onDeleted: (id: string) => void;
}) {
  const portalClass = useAdminPortalClass();
  const title = item?.name || (loading ? "Nuevo plato" : "Plato");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onRequestClose();
      }}
    >
      <Dialog.Portal className={portalClass}>
        <Dialog.Backdrop className="adm-backdrop" />
        <Dialog.Popup className="adm-sheet" finalFocus={finalFocus} aria-modal="true">
          <div className="adm-sheet__grab" aria-hidden="true" />
          <div className="adm-sheet__head">
            <Dialog.Title className="adm-sheet__title">{title}</Dialog.Title>
            <Dialog.Close className="adm-icon-btn adm-icon-btn--framed" aria-label="Cerrar">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          {item ? (
            <DishEditor
              key={item.id}
              item={item}
              isNew={isNew}
              dirtyRef={dirtyRef}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ) : loading ? (
            <div className="adm-sheet__body" aria-busy="true">
              <span className="adm-sk" style={{ width: 104, height: 104, borderRadius: 16 }} />
              <span className="adm-sk" style={{ height: 46 }} />
              <span className="adm-sk" style={{ height: 46, width: "60%" }} />
              <span className="adm-sk" style={{ height: 92 }} />
              <p className="sr-only" role="status">
                Creando el plato...
              </p>
            </div>
          ) : (
            <div className="adm-sheet__body">
              <p className="adm-empty__text" role="status">
                No encontramos este plato. Puede que lo hayan eliminado.
              </p>
            </div>
          )}

          <ConfirmDialog
            open={discardOpen}
            title="Tenés cambios sin guardar. ¿Descartarlos?"
            confirmLabel="Descartar"
            onConfirm={onDiscardConfirm}
            onCancel={onDiscardCancel}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
