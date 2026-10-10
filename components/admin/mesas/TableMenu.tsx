"use client";

import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { useAdminPortalClass } from "@/components/admin/shell/portal";

// Menú ⋯ de una mesa (CA-8.7, CA-8.16): se abre con Enter/Espacio, se
// recorre con flechas, Escape lo cierra y devuelve el foco (base-ui Menu).
export function TableMenu({ label, onDelete }: { label: string; onDelete: () => void }) {
  const portalClass = useAdminPortalClass();
  return (
    <Menu.Root>
      <Menu.Trigger className="adm-icon-btn adm-icon-btn--framed" aria-label={`Más acciones de ${label}`}>
        <EllipsisVertical aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal className={portalClass}>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} style={{ zIndex: 70 }}>
          <Menu.Popup className="adm-menu">
            <Menu.Item className="adm-menu__item adm-menu__item--danger" onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              Eliminar mesa
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
