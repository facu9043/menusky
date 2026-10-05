"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/admin/carta/EmptyState";
import { useAdminLive } from "@/lib/admin/live/AdminLiveProvider";

// Error de lectura del resumen (CA-11.5): solo cuando fallan a la vez la
// carta y la instantánea en vivo (si falla una, Inicio muestra el error en
// su tarjeta, CA-9.7). Nunca se ve como "sin pedidos". "Reintentar" vuelve
// a pedir los datos sin recargar la página y relee la instantánea en vivo.
// No se muestra error.message (RNF-S3).
export default function AdminHomeError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const live = useAdminLive();

  return (
    <div className="adm-page">
      <p className="adm-eyebrow">Inicio</p>
      <h1 className="adm-h1">Así viene el día</h1>
      <EmptyState
        face="oops"
        role="alert"
        text="No pudimos cargar el resumen"
        sub="Puede ser la conexión o un problema del servicio."
        action={
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              void live.refresh();
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
