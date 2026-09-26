"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CategoryData } from "@/lib/types/menu";

export function MenuCategoryTabs({ categories }: { categories: CategoryData[] }) {
  const [active, setActive] = useState(categories[0]?.id);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const btn = active ? buttonRefs.current[active] : null;
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, categories]);

  const handleClick = (id: string) => {
    setActive(id);
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="relative flex gap-2 overflow-x-auto px-4 py-2">
        {pill && (
          <div
            className="absolute top-2 h-[calc(100%-1rem)] rounded-full bg-secondary transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
          />
        )}
        {categories.map((category) => (
          <button
            key={category.id}
            ref={(el) => {
              buttonRefs.current[category.id] = el;
            }}
            type="button"
            onClick={() => handleClick(category.id)}
            className={cn(
              "relative z-10 shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active === category.id
                ? "text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
