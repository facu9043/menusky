"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/useCart";
import { cn } from "@/lib/utils";
import type { MenuItemData } from "@/lib/types/menu";
import type { CartSelectedOption } from "@/lib/types/cart";

export function MenuItemDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-0">
        {item && (
          // key={item.id}: fuerza un remount al cambiar de plato, así el
          // formulario arranca limpio sin necesitar un useEffect de reset.
          <MenuItemDetailForm
            key={item.id}
            item={item}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function MenuItemDetailForm({
  item,
  onDone,
}: {
  item: MenuItemData;
  onDone: () => void;
}) {
  const { addItem } = useCart();
  const [singleSelections, setSingleSelections] = useState<Record<string, string>>({});
  const [multiSelections, setMultiSelections] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const toggleMulti = (groupId: string, choiceId: string) => {
    setMultiSelections((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (current.has(choiceId)) current.delete(choiceId);
      else current.add(choiceId);
      return { ...prev, [groupId]: current };
    });
  };

  const selectedOptions: CartSelectedOption[] = item.optionGroups.flatMap((group) => {
    if (group.selectionType === "single") {
      const choice = group.choices.find((c) => c.id === singleSelections[group.id]);
      return choice
        ? [
            {
              groupId: group.id,
              groupName: group.name,
              choiceId: choice.id,
              choiceName: choice.name,
              extraPrice: choice.extraPrice,
            },
          ]
        : [];
    }
    const chosenIds = multiSelections[group.id] ?? new Set<string>();
    return group.choices
      .filter((c) => chosenIds.has(c.id))
      .map((c) => ({
        groupId: group.id,
        groupName: group.name,
        choiceId: c.id,
        choiceName: c.name,
        extraPrice: c.extraPrice,
      }));
  });

  const unitPrice = item.price + selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0);

  const missingRequiredGroup = item.optionGroups.find(
    (g) => g.selectionType === "single" && g.isRequired && !singleSelections[g.id]
  );

  const handleAdd = () => {
    if (missingRequiredGroup) {
      toast.error(`Elegí una opción de "${missingRequiredGroup.name}"`);
      return;
    }
    addItem({
      menuItemId: item.id,
      name: item.name,
      photoUrl: item.photoUrl,
      basePrice: item.price,
      quantity,
      selectedOptions,
      note: note.trim(),
    });
    toast.success("Agregado al carrito");
    onDone();
  };

  return (
    <>
      {item.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={item.name}
          className="h-48 w-full object-cover"
        />
      )}
      <SheetHeader>
        <SheetTitle className="text-lg">{item.name}</SheetTitle>
        {item.description && (
          <SheetDescription>{item.description}</SheetDescription>
        )}
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4">
        {item.optionGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <Label>
              {group.name}
              {group.isRequired && <span className="text-destructive"> *</span>}
            </Label>
            <div className="flex flex-col gap-1.5">
              {group.choices.map((choice) => {
                const selected =
                  group.selectionType === "single"
                    ? singleSelections[group.id] === choice.id
                    : (multiSelections[group.id] ?? new Set()).has(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() =>
                      group.selectionType === "single"
                        ? setSingleSelections((prev) => ({
                            ...prev,
                            [group.id]: choice.id,
                          }))
                        : toggleMulti(group.id, choice.id)
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span>{choice.name}</span>
                    {choice.extraPrice > 0 && (
                      <span className="text-muted-foreground">
                        +{formatPrice(choice.extraPrice)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Nota (opcional)</Label>
          <Textarea
            id="note"
            placeholder='Ej: "sin cebolla", "bien cocido"'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <SheetFooter className="flex-row items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border px-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus />
          </Button>
          <span className="w-4 text-center text-sm font-medium">{quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus />
          </Button>
        </div>
        <Button type="button" className="flex-1" onClick={handleAdd}>
          Agregar · {formatPrice(unitPrice * quantity)}
        </Button>
      </SheetFooter>
    </>
  );
}
