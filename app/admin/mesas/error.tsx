"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/admin/carta/EmptyState";

// Error de lectura de las mesas (CA-11.5): nunca se muestra como "sin
// mesas". "Reintentar" vuelve a pedir los datos del segmento sin recargar la
// página. No se muestra error.message (RNF-S3).
export default function AdminTablesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="adm-page">
      <p className="adm-eyebrow">Mesas</p>
      <h1 className="adm-h1">Tu salón, de un vistazo</h1>
      <EmptyState
        face="oops"
        role="alert"
        text="No pudimos cargar las mesas"
        sub="Puede ser la conexión o un problema del servicio. Tus mesas siguen guardadas."
        action={
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              retry();
              window.setTimeout(() => setRetrying(false), 4000);
            }}
          >
            <RotateCcw aria-hidden="true" />
            {retrying ? "Reintentando..." : "Reintentar"}
          </button>
        }
      />
    </div>
  );
}
