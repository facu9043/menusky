// Isotipo y logotipo de MenuSky. Diseño propio (ver
// docs/design/direccion-de-arte.md, sección 4): hamburguesa geométrica
// dentro de un cuadrado tomate; la cúpula del pan es también un sol
// asomando sobre el horizonte ("Sky"). Los mismos trazos se usan en
// app/icon.svg y en la imagen social.

export function Isotype({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill="#D7261E" />
      <path d="M11 24c0-7.4 5.8-12.5 13-12.5S37 16.6 37 24Z" fill="#FFC21A" />
      <ellipse cx="19" cy="18.2" rx="1.5" ry=".85" transform="rotate(-25 19 18.2)" fill="#FFF5E1" />
      <ellipse cx="24.5" cy="15.6" rx="1.5" ry=".85" fill="#FFF5E1" />
      <ellipse cx="29.6" cy="18.4" rx="1.5" ry=".85" transform="rotate(25 29.6 18.4)" fill="#FFF5E1" />
      <path
        d="M10.5 27.2q2.25-2.4 4.5 0t4.5 0 4.5 0 4.5 0 4.5 0 4.5 0"
        fill="none"
        stroke="#7CCB4E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10" y="30" width="28" height="5.2" rx="2.6" fill="#2B1710" />
      <rect x="11.5" y="36.6" width="25" height="4.4" rx="2.2" fill="#FFC21A" />
    </svg>
  );
}

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span className={`ms-logo ${className ?? ""}`}>
      <Isotype size={size} />
      <span className="ms-logo__word">
        Menu<span className="ms-logo__sky">Sky</span>
      </span>
    </span>
  );
}
