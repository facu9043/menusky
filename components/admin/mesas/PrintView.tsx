"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Printer, X } from "lucide-react";
import { qrSrc } from "@/components/admin/mesas/tableState";
import { useAdminPortalClass } from "@/components/admin/shell/portal";
import type { AdminTable } from "@/lib/admin/getAdminTables";

type LoadState = "ok" | "fail";

// "Imprimir todos" (CA-8.11, CA-8.12): hoja con el QR de TODAS las mesas
// (sin importar el filtro), en el orden de la lista, con el nombre debajo y
// borde punteado para recortar. Al imprimir solo sale la hoja (ver
// "Impresión" en admin.css): fondo blanco, QR negro, sin menú ni botones,
// sin partir un QR entre páginas. Si un QR no carga se avisa en pantalla y
// en su lugar se imprime el aviso (no un hueco).
export function PrintView({
  open,
  onOpenChange,
  tables,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: AdminTable[];
}) {
  const portalClass = useAdminPortalClass();
  const [loads, setLoads] = useState<Record<string, LoadState>>({});
  const settled = tables.filter((t) => loads[t.id]).length;
  const failed = tables.filter((t) => loads[t.id] === "fail");
  const ready = settled === tables.length;

  const mark = (id: string, value: LoadState) => setLoads((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setLoads({});
      }}
    >
      <Dialog.Portal className={`${portalClass} adm-print-root`}>
        <Dialog.Popup className="adm-print" aria-modal="true">
          <div className="adm-print__bar">
            <div style={{ minWidth: 0 }}>
              <Dialog.Title className="adm-print__title">Imprimir todos los QR</Dialog.Title>
              <Dialog.Description className="adm-print__desc">
                {tables.length} {tables.length === 1 ? "mesa" : "mesas"}, con el nombre debajo de cada QR. Recortá por la línea
                punteada.
              </Dialog.Description>
            </div>
            <div className="adm-print__tools">
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={!ready}
                onClick={() => window.print()}
              >
                <Printer aria-hidden="true" />
                {ready ? "Imprimir" : `Cargando QR (${settled} de ${tables.length})`}
              </button>
              <Dialog.Close className="adm-icon-btn adm-icon-btn--framed" aria-label="Cerrar">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          {failed.length > 0 ? (
            <div className="adm-print__warn" role="alert">
              {failed.map((t) => (
                <p key={t.id}>No se pudo cargar el QR de {t.label}</p>
              ))}
            </div>
          ) : null}

          <div className="adm-print__paper">
            <ul className="adm-print__grid" aria-label="QR de las mesas">
              {tables.map((t) => (
                <li key={t.id} className="adm-print__cell">
                  {loads[t.id] === "fail" ? (
                    <span className="adm-print__fail">No se pudo cargar el QR de {t.label}</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- PNG propio de /api/qr, se imprime tal cual
                    <img
                      src={qrSrc(t.qrToken)}
                      alt={`QR de ${t.label}`}
                      width={512}
                      height={512}
                      onLoad={() => mark(t.id, "ok")}
                      onError={() => mark(t.id, "fail")}
                    />
                  )}
                  <span className="adm-print__name">{t.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
