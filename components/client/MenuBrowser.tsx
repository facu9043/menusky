"use client";

import { useState } from "react";
import { MenuCategoryTabs } from "@/components/client/MenuCategoryTabs";
import { MenuItemCard } from "@/components/client/MenuItemCard";
import { MenuItemDetailSheet } from "@/components/client/MenuItemDetailSheet";
import type { CategoryData, MenuItemData } from "@/lib/types/menu";

export function MenuBrowser({ categories }: { categories: CategoryData[] }) {
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div>
      <MenuCategoryTabs categories={categories} />
      <div className="flex flex-col gap-8 px-4 py-4">
        {categories.map((category) => (
          <section
            key={category.id}
            id={`categoria-${category.id}`}
            className="scroll-mt-16"
          >
            <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onSelect={() => {
                    setSelectedItem(item);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <MenuItemDetailSheet
        item={selectedItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
