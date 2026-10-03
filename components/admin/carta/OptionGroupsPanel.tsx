"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BrandSwitch } from "@/components/admin/carta/BrandSwitch";
import { ConfirmDialog } from "@/components/admin/carta/ConfirmDialog";
import { formatPrice } from "@/lib/format";
import { createOptionGroup, deleteOptionGroup, updateOptionGroup } from "@/lib/admin/optionGroups";
import { createOptionChoice, deleteOptionChoice } from "@/lib/admin/optionChoices";
import type { AdminMenuItem, AdminOptionGroup } from "@/lib/types/adminMenu";
import type { OptionSelectionType } from "@/lib/types/database.types";

type Announce = (message: string) => void;

// "Una opción" / "Varias opciones" como radios reales: el estado se anuncia
// (CA-7.8; el TogglePill viejo no lo anunciaba).
function SelectionTypeField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: OptionSelectionType;
  onChange: (value: OptionSelectionType) => void;
}) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <legend className="sr-only">Cuántas puede elegir el cliente</legend>
      <div className="adm-seg">
        <label>
          <input
            type="radio"
            name={name}
            value="single"
            checked={value === "single"}
            onChange={() => onChange("single")}
          />
          Una opción
        </label>
        <label>
          <input
            type="radio"
            name={name}
            value="multiple"
            checked={value === "multiple"}
            onChange={() => onChange("multiple")}
          />
          Varias opciones
        </label>
      </div>
    </fieldset>
  );
}

function RequiredSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const labelId = useId();
  return (
    <span className="adm-req">
      <span id={labelId}>Obligatorio</span>
      <BrandSwitch checked={checked} onToggle={onToggle} labelledBy={labelId} />
    </span>
  );
}

function OptionGroupEditor({ group, announce }: { group: AdminOptionGroup; announce: Announce }) {
  const router = useRouter();
  const nameId = useId();
  const choiceNameId = useId();
  const choicePriceId = useId();
  const [name, setName] = useState(group.name);
  const [selectionType, setSelectionType] = useState<OptionSelectionType>(group.selectionType);
  const [isRequired, setIsRequired] = useState(group.isRequired);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newChoiceName, setNewChoiceName] = useState("");
  const [newChoicePrice, setNewChoicePrice] = useState("0");
  const [adding, setAdding] = useState(false);
  const [removingChoice, setRemovingChoice] = useState<string | null>(null);

  const dirty =
    name !== group.name || selectionType !== group.selectionType || isRequired !== group.isRequired;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateOptionGroup(group.id, { name, selectionType, isRequired });
      announce(`Grupo "${name}" guardado`);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOptionGroup(group.id);
      setConfirmDelete(false);
      announce(`Grupo "${group.name}" eliminado`);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar el grupo");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newChoiceName.trim();
    if (!clean) return;
    setAdding(true);
    try {
      await createOptionChoice(group.id, clean, Number(newChoicePrice) || 0, group.choices.length);
      setNewChoiceName("");
      setNewChoicePrice("0");
      announce(`Opción "${clean}" agregada`);
      router.refresh();
    } catch {
      toast.error("No se pudo agregar la opción");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChoice = async (choiceId: string, choiceName: string) => {
    setRemovingChoice(choiceId);
    try {
      await deleteOptionChoice(choiceId);
      announce(`Opción "${choiceName}" eliminada`);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar la opción");
    } finally {
      setRemovingChoice(null);
    }
  };

  return (
    <li className="adm-group">
      <div className="adm-group__top">
        <div className="adm-field">
          <label className="adm-label" htmlFor={nameId}>
            Grupo
          </label>
          <input
            id={nameId}
            className="adm-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="adm-icon-btn adm-icon-btn--framed"
          aria-label={`Eliminar el grupo ${group.name}`}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>

      <div className="adm-group__opts">
        <SelectionTypeField name={`sel-${group.id}`} value={selectionType} onChange={setSelectionType} />
        <RequiredSwitch checked={isRequired} onToggle={() => setIsRequired((r) => !r)} />
      </div>

      {dirty ? (
        <>
          {name.trim() ? null : <p className="adm-error">El grupo necesita un nombre.</p>}
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={saving || !name.trim()}
            onClick={handleSave}
          >
            {saving ? "Guardando..." : "Guardar grupo"}
          </button>
        </>
      ) : null}

      {group.choices.length > 0 ? (
        <ul className="adm-choices" aria-label={`Opciones de ${group.name}`}>
          {group.choices.map((choice) => (
            <li key={choice.id} className="adm-choice">
              <span>
                {choice.name}
                {choice.extraPrice > 0 && ` (+${formatPrice(choice.extraPrice)})`}
              </span>
              <button
                type="button"
                className="adm-icon-btn"
                aria-label={`Eliminar opción ${choice.name}`}
                disabled={removingChoice === choice.id}
                onClick={() => handleDeleteChoice(choice.id, choice.name)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form className="adm-add-choice" onSubmit={handleAddChoice}>
        <div className="adm-field">
          <label className="adm-label" htmlFor={choiceNameId}>
            Nueva opción
          </label>
          <input
            id={choiceNameId}
            className="adm-input"
            value={newChoiceName}
            onChange={(e) => setNewChoiceName(e.target.value)}
            placeholder="Ej: Papas fritas"
            autoComplete="off"
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor={choicePriceId}>
            Extra $
          </label>
          <input
            id={choicePriceId}
            className="adm-input"
            type="number"
            inputMode="numeric"
            min="0"
            value={newChoicePrice}
            onChange={(e) => setNewChoicePrice(e.target.value)}
          />
        </div>
        <button type="submit" className="adm-btn" disabled={adding}>
          {adding ? "Agregando..." : "Agregar"}
        </button>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Eliminar el grupo "${group.name}"?`}
        description="Se borran también sus opciones."
        confirmLabel="Eliminar grupo"
        busyLabel="Eliminando..."
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </li>
  );
}

function NewGroupForm({
  item,
  announce,
  onDone,
}: {
  item: AdminMenuItem;
  announce: Announce;
  onDone: () => void;
}) {
  const router = useRouter();
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState<OptionSelectionType>("single");
  const [isRequired, setIsRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Escribí un nombre para el grupo.");
      return;
    }
    setSaving(true);
    try {
      await createOptionGroup(item.id, clean, selectionType, isRequired, item.optionGroups.length);
      announce(`Grupo "${clean}" creado`);
      router.refresh();
      onDone();
    } catch {
      toast.error("No se pudo crear el grupo de opciones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="adm-newgroup" onSubmit={handleSubmit} noValidate>
      <div className="adm-field">
        <label className="adm-label" htmlFor={nameId}>
          Nombre del grupo
        </label>
        <input
          id={nameId}
          className="adm-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Ej: Punto de cocción"
          autoComplete="off"
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error ? (
          <p id={errorId} className="adm-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="adm-group__opts">
        <SelectionTypeField name={`sel-new-${item.id}`} value={selectionType} onChange={setSelectionType} />
        <RequiredSwitch checked={isRequired} onToggle={() => setIsRequired((r) => !r)} />
      </div>
      <div className="adm-newgroup__actions">
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
          {saving ? "Creando..." : "Crear grupo"}
        </button>
        <button type="button" className="adm-btn adm-btn--quiet" onClick={onDone} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// "Opciones y extras" dentro de la hoja (CA-7.8, CA-NR.18, CA-NR.19). Cada
// acción se guarda al instante, como hoy, y se anuncia a lectores de pantalla.
export function OptionGroupsPanel({ item }: { item: AdminMenuItem }) {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const titleId = useId();

  return (
    <section className="adm-groups" aria-labelledby={titleId}>
      <div className="adm-groups__head">
        <h3 id={titleId} className="adm-h2" style={{ fontSize: "1.0625rem" }}>
          Opciones y extras
        </h3>
        {adding ? null : (
          <button type="button" className="adm-btn" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Nuevo grupo
          </button>
        )}
      </div>

      {adding ? <NewGroupForm item={item} announce={setMessage} onDone={() => setAdding(false)} /> : null}

      {item.optionGroups.length === 0 && !adding ? (
        <p className="adm-hint">
          Sin grupos todavía. Sumá uno para cosas como &quot;Guarnición&quot; o &quot;Punto de la carne&quot;.
        </p>
      ) : (
        <ul className="adm-groups" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {item.optionGroups.map((group) => (
            <OptionGroupEditor key={group.id} group={group} announce={setMessage} />
          ))}
        </ul>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
