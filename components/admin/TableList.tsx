"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QrCode, Eye, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewTableForm } from "@/components/admin/NewTableForm";
import { deleteTable } from "@/lib/admin/tables";
import type { AdminTable } from "@/lib/admin/getAdminTables";

export function TableList({
  restaurantId,
  tables,
}: {
  restaurantId: string;
  tables: AdminTable[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (table: AdminTable) => {
    if (!window.confirm(`¿Eliminar "${table.label}"? El QR impreso dejará de funcionar.`)) return;
    setPendingId(table.id);
    try {
      await deleteTable(table.id);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar la mesa");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="p-4">
        <NewTableForm restaurantId={restaurantId} />
      </Card>

      {tables.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay mesas creadas.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className="flex flex-row items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{table.label}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button type="button" variant="outline" size="sm" render={<a href={`/api/qr/${table.qrToken}`} />}>
                    <QrCode />
                    Descargar QR
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    render={<a href={`/m/${table.qrToken}`} target="_blank" rel="noopener noreferrer" />}
                  >
                    <Eye />
                    <span className="sr-only">Ver carta de esta mesa</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === table.id}
                    onClick={() => handleDelete(table)}
                  >
                    <Trash2 />
                    <span className="sr-only">Eliminar mesa</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
