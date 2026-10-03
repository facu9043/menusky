import type { ReactNode } from "react";

// Marco de celular. Todo lo de adentro se dimensiona en `em`, y el
// tamaño de letra base sale del ancho del propio celular (container
// query), así el mockup escala entero sin transform y sin desbordar.
export function Phone({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Descripción accesible. Vacío si el celular está dentro de otra figura. */
  label: string;
}) {
  return (
    <div
      className={`ms-phone ${className ?? ""}`}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
    >
      <div className="ms-phone__body">
        <div className="ms-phone__screen">
          <div className="ms-phone__status" aria-hidden="true">
            <span>21:04</span>
            <span className="ms-phone__island" />
            <span className="ms-phone__signal">
              <i />
              <i />
              <i />
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
