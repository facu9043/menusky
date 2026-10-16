import { BrandPomo } from "@/components/admin/carta/BrandPomo";

// Cocina sin pedidos (K-8, CA-8.8): Pomo estático y decorativo + el texto de siempre.
export function KitchenEmpty() {
  return (
    <div className="st-empty">
      <BrandPomo />
      <p className="st-empty__text">No hay pedidos pendientes.</p>
    </div>
  );
}
