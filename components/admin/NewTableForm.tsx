"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTable } from "@/lib/admin/tables";

export function NewTableForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    try {
      await createTable(restaurantId, label.trim());
      setLabel("");
      router.refresh();
    } catch {
      toast.error("No se pudo crear la mesa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="table-label" className="text-sm font-medium">
          Nueva mesa
        </label>
        <Input
          id="table-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Mesa 7"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        <Plus />
        Crear
      </Button>
    </form>
  );
}
