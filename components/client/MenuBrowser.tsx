"use client";

import { useEffect, useRef, useState } from "react";
import { MenuCategoryTabs } from "@/components/client/MenuCategoryTabs";
import { MenuItemCard } from "@/components/client/MenuItemCard";
import { MenuItemDetailSheet } from "@/components/client/MenuItemDetailSheet";
import type { CategoryData, MenuItemData } from "@/lib/types/menu";

export function MenuBrowser({ categories }: { categories: CategoryData[] }) {
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Aparición en cascada: cada tarjeta arranca oculta (.reveal-item en
    // app/globals.css) y se revela la primera vez que entra en pantalla —
    // un solo IntersectionObserver para todas en vez de uno por tarjeta.
    const items = containerRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!items || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <div>
      <MenuCategoryTabs categories={categories} />
      <div ref={containerRef} className="flex flex-col gap-8 px-4 py-4">
        {categories.map((category) => (
          <section
            key={category.id}
            id={`categoria-${category.id}`}
            className="scroll-mt-16"
          >
            <h2 className="mb-3 font-[family-name:var(--font-menu-display)] text-xl font-semibold">
              {category.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {category.items.map((item, index) => (
                <div
                  key={item.id}
                  data-reveal
                  style={{ transitionDelay: `${(index % 4) * 60}ms` }}
                  className="reveal-item"
                >
                  <MenuItemCard
                    item={item}
                    onSelect={() => {
                      setSelectedItem(item);
                      setSheetOpen(true);
                    }}
                  />
                </div>
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
