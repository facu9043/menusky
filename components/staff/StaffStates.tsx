"use client";

import { useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/landing/brand/Logo";
import { StaffBrand } from "@/components/staff/StaffBrand";

// Carga y error de /kitchen y /floor (sin datos de la persona: todavía no se
// leyeron o falló la lectura). Sin Pomo (CA-8.8). No se muestra error.message.

function BareHead() {
  return (
    <header className="st-head st-head--sk">
      <Logo size={34} />
    </header>
  );
}

export function StaffLoading({ title, kind }: { title: string; kind: "kitchen" | "floor" }) {
  return (
    <StaffBrand>
      <BareHead />
      <main className="st-main" aria-busy="true">
        <div className="st-page">
          <p className="sr-only" role="status">
            {kind === "kitchen" ? "Cargando los pedidos..." : "Cargando el salón..."}
          </p>
          <div className="st-title">
            <p className="adm-h1" aria-hidden="true">
              {title}
            </p>
          </div>
          {kind === "kitchen" ? (
            <div className="st-orders" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="st-sk st-sk--card" />
              ))}
            </div>
          ) : (
            <div className="st-tables" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="st-sk st-sk--table" />
              ))}
            </div>
          )}
        </div>
      </main>
    </StaffBrand>
  );
}

export function StaffError({ title, text, retry }: { title: string; text: string; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  return (
    <StaffBrand>
      <BareHead />
      <main className="st-main">
        <div className="st-page">
          <div className="st-title">
            <h1 className="adm-h1">{title}</h1>
          </div>
          <div className="st-error" role="alert">
            <span className="st-deny__icon" aria-hidden="true">
              <TriangleAlert />
            </span>
            <p className="st-deny__title">{text}</p>
            <p className="st-deny__text">Puede ser la conexión o un problema del servicio.</p>
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
          </div>
        </div>
      </main>
    </StaffBrand>
  );
}
