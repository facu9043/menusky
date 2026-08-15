"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { MenuItemRow } from "@/components/admin/MenuItemRow";
import { deleteCategory } from "@/lib/admin/categories";
import { createMenuItem } from "@/lib/admin/menuItems";
import type { AdminCategory } from "@/lib/types/adminMenu";

export function CategoryList({
  restaurantId,
  categories,
}: {
  restaurantId: string;
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  const handleAddItem = async (categoryId: string, itemCount: number) => {
    setPendingCategoryId(categoryId);
    try {
      const itemId = await createMenuItem(categoryId, itemCount);
      router.push(`/admin/menu/${itemId}`);
    } catch {
      toast.error("No se pudo crear el plato");
      setPendingCategoryId(null);
    }
  };

  const handleDeleteCategory = async (category: AdminCategory) => {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${category.name}" y sus ${category.items.length} platos?`
      )
    )
      return;
    setPendingCategoryId(category.id);
    try {
      await deleteCategory(category.id);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar la categoría");
    } finally {
      setPendingCategoryId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-end">
        <CategoryDialog restaurantId={restaurantId} nextSortOrder={categories.length} />
      </div>

      {categories.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Todavía no hay categorías. Creá la primera con el botón de arriba.
        </p>
      )}

      {categories.map((category) => (
        <Card key={category.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{category.name}</h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendingCategoryId === category.id}
                onClick={() => handleAddItem(category.id, category.items.length)}
              >
                <Plus />
                Plato
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pendingCategoryId === category.id}
                onClick={() => handleDeleteCategory(category)}
              >
                <Trash2 />
                <span className="sr-only">Eliminar categoría</span>
              </Button>
            </div>
          </div>

          {category.items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Sin platos todavía.
            </p>
          ) : (
            <div className="divide-y">
              {category.items.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
