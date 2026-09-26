"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStaffPendingCounts } from "@/lib/realtime/useStaffPendingCounts";
import type { StaffRole } from "@/lib/types/database.types";

const LINKS = [
  { href: "/kitchen", label: "Cocina" },
  { href: "/floor", label: "Salón" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function StaffNav({ role, restaurantId }: { role: StaffRole; restaurantId: string }) {
  const pathname = usePathname();
  const counts = useStaffPendingCounts(restaurantId);

  const pendingByHref: Record<string, number> = {
    "/kitchen": counts.kitchenPending,
    "/floor": counts.floorPending,
  };

  return (
    <nav className="flex gap-1 border-b px-4 py-2">
      {LINKS.filter((link) => !link.adminOnly || role === "admin").map((link) => {
        const active = pathname.startsWith(link.href);
        const pending = pendingByHref[link.href] ?? 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary/25 hover:text-foreground"
            )}
          >
            {link.label}
            {pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive ring-2 ring-background" />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
