import type { Metadata } from "next";

// Con el template "%s | MenuSky" de app/layout.tsx queda "Inicio | MenuSky".
export const metadata: Metadata = {
  title: "Inicio",
};

// PROVISORIO (parte 4a): /admin deja de redirigir a la carta (CA-5.7). El
// resumen del día (HU-9) reemplaza esta pantalla en la parte 4b.
export default function AdminHomePage() {
  return (
    <div className="adm-page">
      <p className="adm-eyebrow">Inicio</p>
      <h1 className="adm-h1">Inicio</h1>
      <p style={{ marginTop: "0.75rem", color: "var(--ms-patty-soft)" }}>En construcción</p>
    </div>
  );
}
