"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TogglePill } from "@/components/admin/TogglePill";
import { updateMenuItem, deleteMenuItem } from "@/lib/admin/menuItems";
import { uploadMenuItemPhoto } from "@/lib/admin/uploadMenuItemPhoto";
import type { AdminMenuItem } from "@/lib/types/adminMenu";

export function MenuItemEditForm({ item }: { item: AdminMenuItem }) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.price));
  const [photoUrl, setPhotoUrl] = useState(item.photoUrl ?? "");
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMenuItemPhoto(item.id, file);
      setPhotoUrl(url);
    } catch {
      toast.error("No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMenuItem(item.id, {
        name,
        description,
        price: Number(price) || 0,
        photoUrl,
        isAvailable,
      });
      toast.success("Guardado");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el plato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${item.name}" de la carta?`)) return;
    try {
      await deleteMenuItem(item.id);
      router.push("/admin/menu");
    } catch {
      toast.error("No se pudo eliminar el plato");
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-name">Nombre</Label>
          <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-description">Descripción</Label>
          <Textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-price">Precio</Label>
          <Input
            id="item-price"
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Foto</Label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative flex size-32 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted text-xs text-muted-foreground hover:bg-muted/70"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="size-5" />
                Subir foto
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs">
                Subiendo...
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="o pegá una URL"
            className="h-7 text-xs text-muted-foreground"
          />
        </div>

        <div>
          <TogglePill active={isAvailable} onClick={() => setIsAvailable((a) => !a)}>
            {isAvailable ? "Disponible" : "Sin stock hoy"}
          </TogglePill>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
            Eliminar plato
          </Button>
        </div>
      </form>
    </Card>
  );
}
