"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TogglePill } from "@/components/admin/TogglePill";
import { formatPrice } from "@/lib/format";
import { updateOptionGroup, deleteOptionGroup } from "@/lib/admin/optionGroups";
import { createOptionChoice, deleteOptionChoice } from "@/lib/admin/optionChoices";
import type { AdminOptionGroup } from "@/lib/types/adminMenu";
import type { OptionSelectionType } from "@/lib/types/database.types";

export function OptionGroupCard({ group }: { group: AdminOptionGroup }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [selectionType, setSelectionType] = useState<OptionSelectionType>(group.selectionType);
  const [isRequired, setIsRequired] = useState(group.isRequired);
  const [savingGroup, setSavingGroup] = useState(false);
  const [newChoiceName, setNewChoiceName] = useState("");
  const [newChoicePrice, setNewChoicePrice] = useState("0");
  const [addingChoice, setAddingChoice] = useState(false);

  const dirty =
    name !== group.name ||
    selectionType !== group.selectionType ||
    isRequired !== group.isRequired;

  const handleSaveGroup = async () => {
    setSavingGroup(true);
    try {
      await updateOptionGroup(group.id, { name, selectionType, isRequired });
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el grupo");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`¿Eliminar el grupo "${group.name}"?`)) return;
    try {
      await deleteOptionGroup(group.id);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar el grupo");
    }
  };

  const handleAddChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoiceName.trim()) return;
    setAddingChoice(true);
    try {
      await createOptionChoice(
        group.id,
        newChoiceName.trim(),
        Number(newChoicePrice) || 0,
        group.choices.length
      );
      setNewChoiceName("");
      setNewChoicePrice("0");
      router.refresh();
    } catch {
      toast.error("No se pudo agregar la opción");
    } finally {
      setAddingChoice(false);
    }
  };

  const handleDeleteChoice = async (choiceId: string) => {
    try {
      await deleteOptionChoice(choiceId);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar la opción");
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleDeleteGroup}>
          <Trash2 />
          <span className="sr-only">Eliminar grupo</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TogglePill active={selectionType === "single"} onClick={() => setSelectionType("single")}>
          Una opción
        </TogglePill>
        <TogglePill active={selectionType === "multiple"} onClick={() => setSelectionType("multiple")}>
          Varias opciones
        </TogglePill>
        <TogglePill active={isRequired} onClick={() => setIsRequired((r) => !r)}>
          Obligatorio
        </TogglePill>
        {dirty && (
          <Button type="button" size="sm" disabled={savingGroup} onClick={handleSaveGroup}>
            {savingGroup ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}
      </div>

      {group.choices.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {group.choices.map((choice) => (
            <div
              key={choice.id}
              className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
            >
              <span>
                {choice.name}
                {choice.extraPrice > 0 && ` (+${formatPrice(choice.extraPrice)})`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDeleteChoice(choice.id)}
              >
                <Trash2 />
                <span className="sr-only">Eliminar opción</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddChoice} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`choice-name-${group.id}`} className="text-xs">
            Nueva opción
          </Label>
          <Input
            id={`choice-name-${group.id}`}
            value={newChoiceName}
            onChange={(e) => setNewChoiceName(e.target.value)}
            placeholder="Ej: Papas fritas"
          />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <Label htmlFor={`choice-price-${group.id}`} className="text-xs">
            Extra $
          </Label>
          <Input
            id={`choice-price-${group.id}`}
            type="number"
            min="0"
            value={newChoicePrice}
            onChange={(e) => setNewChoicePrice(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={addingChoice}>
          Agregar
        </Button>
      </form>
    </Card>
  );
}
