"use client";

import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical, Plus, Trash2 } from "lucide-react";
import { useAdminPortalClass } from "@/components/admin/shell/portal";

// Menú ⋯ de una categoría (CA-6.14): se abre con Enter/Espacio, se recorre
// con flechas (base-ui Menu).
export function CategoryMenu({
  name,
  disabled,
  onNewDish,
  onDelete,
}: {
  name: string;
  disabled?: boolean;
  onNewDish: () => void;
  onDelete: () => void;
}) {
  const portalClass = useAdminPortalClass();
  return (
    <Menu.Root>
      <Menu.Trigger
        className="adm-icon-btn adm-icon-btn--framed"
        aria-label={`Más acciones de ${name}`}
        disabled={disabled}
      >
        <EllipsisVertical aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal className={portalClass}>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} style={{ zIndex: 70 }}>
          <Menu.Popup className="adm-menu">
            <Menu.Item className="adm-menu__item" onClick={onNewDish}>
              <Plus aria-hidden="true" />
              Nuevo plato acá
            </Menu.Item>
            <div className="adm-menu__sep" role="separator" />
            <Menu.Item className="adm-menu__item adm-menu__item--danger" onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              Eliminar categoría
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
