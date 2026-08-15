"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TogglePill } from "@/components/admin/TogglePill";
import { createOptionGroup } from "@/lib/admin/optionGroups";
import type { OptionSelectionType } from "@/lib/types/database.types";

export function NewOptionGroupDialog({
  menuItemId,
  nextSortOrder,
}: {
  menuItemId: string;
  nextSortOrder: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState<OptionSelectionType>("single");
  const [isRequired, setIsRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createOptionGroup(menuItemId, name.trim(), selectionType, isRequired, nextSortOrder);
      setOpen(false);
      setName("");
      setSelectionType("single");
      setIsRequired(false);
      router.refresh();
    } catch {
      toast.error("No se pudo crear el grupo de opciones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Grupo de opciones
      </Button>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo grupo de opciones</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-name">Nombre</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Punto de cocción"
                autoFocus
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <TogglePill
                active={selectionType === "single"}
                onClick={() => setSelectionType("single")}
              >
                Una opción
              </TogglePill>
              <TogglePill
                active={selectionType === "multiple"}
                onClick={() => setSelectionType("multiple")}
              >
                Varias opciones
              </TogglePill>
              <TogglePill active={isRequired} onClick={() => setIsRequired((r) => !r)}>
                Obligatorio
              </TogglePill>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
