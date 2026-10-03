"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/admin/carta/EmptyState";

// Error de lectura de la carta (CA-11.5): nunca se muestra como "carta
// vacía". "Reintentar" vuelve a pedir los datos del segmento sin recargar la
// página; el menú lateral y las pestañas siguen usables. No se muestra
// error.message (RNF-S3).
export default function AdminMenuError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="adm-page">
      <p className="adm-eyebrow">Carta</p>
      <h1 className="adm-h1">Tu carta, al día</h1>
      <EmptyState
        face="oops"
        role="alert"
        text="No pudimos cargar la carta"
        sub="Puede ser la conexión o un problema del servicio. Tus platos siguen guardados."
        action={
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              retry();
              // Si vuelve a fallar, este componente se vuelve a montar.
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
