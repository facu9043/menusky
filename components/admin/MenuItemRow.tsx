"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { setMenuItemAvailability, deleteMenuItem } from "@/lib/admin/menuItems";
import { cn } from "@/lib/utils";
import type { AdminMenuItem } from "@/lib/types/adminMenu";

export function MenuItemRow({ item }: { item: AdminMenuItem }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggleAvailability = async () => {
    setPending(true);
    try {
      await setMenuItemAvailability(item.id, !item.isAvailable);
      router.refresh();
    } catch {
      toast.error("No se pudo actualizar la disponibilidad");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${item.name}" de la carta?`)) return;
    setPending(true);
    try {
      await deleteMenuItem(item.id);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar el plato");
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={item.name}
          className="size-12 shrink-0 rounded-md object-cover bg-muted"
        />
      ) : (
        <div className="size-12 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/admin/menu/${item.id}`} className="font-medium hover:underline">
          {item.name}
        </Link>
        <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={toggleAvailability}
        className={cn(!item.isAvailable && "border-destructive/40 text-destructive")}
      >
        {item.isAvailable ? "Disponible" : "Sin stock"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={handleDelete}
      >
        <Trash2 />
        <span className="sr-only">Eliminar</span>
      </Button>
    </div>
  );
}
