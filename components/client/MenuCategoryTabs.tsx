"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CategoryData } from "@/lib/types/menu";

export function MenuCategoryTabs({ categories }: { categories: CategoryData[] }) {
  const [active, setActive] = useState(categories[0]?.id);

  const handleClick = (id: string) => {
    setActive(id);
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleClick(category.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active === category.id
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
