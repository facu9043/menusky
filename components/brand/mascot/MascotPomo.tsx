// Mascota de MenuSky: "Pomo", el pomo de mostaza (propuesta 3, elegida por el
// Director el 2026-10-02). Diseño original del equipo, SVG propio: parte del
// dibujo de docs/design/mascota/propuesta-3.svg (ahora se mantiene a mano).
// Decorativa: aria-hidden, sin foco ni clics. Sin nombre visible (CA-3.13).
//
// Capas (docs/design/mascota/mascota.md, "Cómo se anima"): las partes que se
// MUEVEN viven en su propio <svg> apilado, porque Chrome solo compone en la
// GPU las animaciones de cajas CSS; un <g> animado dentro de un SVG repinta
// todo el SVG en cada cuadro. Lo que solo CAMBIA de pose (bocas, brazo en
// alto, ojos felices) va en <g> con opacity fija, sin transición.
//   .m          raíz: respiración (idle)
//   .m-base     cuerpo, etiqueta, brazos, bocas, hamburguesa, gorra
//   .m-look     mirada: se desplaza hacia el campo con foco
//   .m-eyes     ojos y párpados: parpadeo (idle)
// Estados: data-mood / data-look / data-face en .lg-mascot (LoginForm.tsx),
// estilos en app/login/login.css.

const VIEWBOX = "0 0 200 240";

export function MascotPomo() {
  return (
    <div className="m">
      <svg viewBox={VIEWBOX} aria-hidden="true" focusable="false" className="m-l m-base">
        <g fill="none" stroke="#2b1710" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="66" y="218" width="24" height="12" rx="6" fill="#e3a008" />
          <rect x="110" y="218" width="24" height="12" rx="6" fill="#e3a008" />
          <path d="M96 60L100 46L104 60Z" fill="#d7261e" strokeWidth="4" />
          <g className="m-body">
            <path d="M58 112C58 96 74 86 100 86C126 86 142 96 142 112L146 206C146 218 136 224 124 224L76 224C64 224 54 218 54 206Z" fill="#ffc21a" />
            <path d="M66 116L65 138" stroke="#fff5e1" strokeWidth="5" />
            <path d="M57 148L143 148L146 206C146 218 136 224 124 224L76 224C64 224 54 218 54 206Z" fill="#2b1710" />
            <g transform="translate(100 188) scale(0.68) translate(-24 -24)" stroke="none">
              <rect width="48" height="48" rx="12" fill="#d7261e" />
              <path d="M11 24c0-7.4 5.8-12.5 13-12.5S37 16.6 37 24Z" fill="#ffc21a" />
              <path d="M17.6 18.9l2.8-1.4M23 15.6h3M28.2 17.7l2.8 1.4" stroke="#fff5e1" strokeWidth="1.7" />
              <path d="M10.5 27.2q2.25-2.4 4.5 0t4.5 0 4.5 0 4.5 0 4.5 0 4.5 0" fill="none" stroke="#7CCB4E" strokeWidth="2.6" />
              <rect x="10" y="30" width="28" height="5.2" rx="2.6" fill="#2b1710" />
              <rect x="11.5" y="36.6" width="25" height="4.4" rx="2.2" fill="#ffc21a" />
            </g>
          </g>
          {/* Brazo izquierdo: en la cintura (normal) o en alto (éxito). */}
          <g className="m-arm-hip">
            <path d="M56 160Q38 170 50 184" strokeWidth="14" />
            <path d="M56 160Q38 170 50 184" stroke="#ffc21a" strokeWidth="6" />
            <circle cx="52" cy="184" r="7" fill="#ffc21a" strokeWidth="4" />
          </g>
          <g className="m-arm-up" opacity="0">
            <path d="M57 156Q36 148 36 124" strokeWidth="14" />
            <path d="M57 156Q36 148 36 124" stroke="#ffc21a" strokeWidth="6" />
            <circle cx="36" cy="120" r="7.5" fill="#ffc21a" strokeWidth="4" />
          </g>
          {/* Bocas: normal, "uy" (error) y contenta (éxito). */}
          <path className="m-ok" d="M86 129L114 129Q112 143 100 143Q88 143 86 129Z" fill="#2b1710" strokeWidth="3.5" />
          <path className="m-oops" opacity="0" d="M89 138Q100 128 111 138" strokeWidth="3.5" />
          <g className="m-yay" opacity="0">
            <path d="M84 127L116 127Q115 147 100 147Q85 147 84 127Z" fill="#2b1710" strokeWidth="3.5" />
            <path d="M92 141Q100 134 108 141Q105 145 100 145Q95 145 92 141Z" fill="#d7261e" stroke="none" />
          </g>
          {/* Brazo derecho con la hamburguesa, extendido hacia el formulario. */}
          <g className="m-arm">
            <path d="M144 160Q160 158 166 146" strokeWidth="14" />
            <path d="M144 160Q160 158 166 146" stroke="#ffc21a" strokeWidth="6" />
            <g transform="translate(166 128) rotate(6) scale(0.8)" strokeWidth="3.5">
              <rect x="-24" y="8" width="48" height="11" rx="5.5" fill="#f4d9a6" />
              <rect x="-27" y="0" width="54" height="9" rx="4.5" fill="#2b1710" />
              <path d="M-26-2L26-2L23 4L17 0L10 7L3 0L-9 6L-15 0L-25 3Z" fill="#ffc21a" />
              <path d="M-27-4Q-22.5-9-18-4T-9-4T0-4T9-4T18-4T27-4" strokeWidth="8" />
              <path d="M-27-4Q-22.5-9-18-4T-9-4T0-4T9-4T18-4T27-4" stroke="#4c9a2a" strokeWidth="3.5" />
              <path d="M-25-6C-25-28 25-28 25-6Z" fill="#f4d9a6" />
              <path d="M-12-15l3-1.5M-2-20h3.4M8-14l3 1.4" stroke="#e3a008" strokeWidth="2.4" />
            </g>
            <circle cx="166" cy="146" r="7.5" fill="#ffc21a" strokeWidth="4" />
          </g>
          {/* Gorra roja con "Yo ♥ MenuSky" dibujado como trazos (sin <text>). */}
          <g className="m-cap" transform="translate(100 96) rotate(3)">
            <path d="M28 0C50-5 72-2 77 6C67 12 45 11 26 8Z" fill="#a8141b" />
            <path d="M-47 5C-47-43 47-43 47 5Z" fill="#d7261e" />
            <circle cy="-31" r="4.5" fill="#a8141b" strokeWidth="3.5" />
            <path d="M-38.9 -9L-35.9 -4.5L-32.9 -9M-35.9 -4.5L-35.9 0M-28.7 -6C-25.9 -6 -25.9 0 -28.7 0C-31.5 0-31.5 -6 -28.7 -6ZM-9.8 0L-9.8 -9L-6.1 -3.4L-2.4 -9L-2.4 0M-.4 -2.9L4.3 -2.9C4.3 -6.5 -.7 -6.6 -.7 -3C-.7 .6 3.5 .7 4.3 -1M6 0L6 -6M6 -3.4C6 -6.6 11 -6.6 11 -3.4L11 0M12.7 -6L12.7 -2.6C12.7 .6 17.7 .6 17.7 -2.6M17.7 -6L17.7 0M24.8 -7.4C23.8-9.6 19.5-9.4 19.6 -6.7C19.8 -4.2 25.2 -4.8 25.2 -2.2C25.2 .8 20.4 .8 19.4 -1.5M26.9 -9L26.9 0M31.7 -6L27.2 -2.5M28.8 -3.7L31.9 0M33.6 -6L36.2 -.4M38.8 -6L35.5 2.4" stroke="#fffdf8" strokeWidth="1.5" />
            <path d="M-18 -.4C-22.5 -3.8-21.7 -8 -19.5 -8C-18.5 -8 -18 -7.1 -18 -6.4C-18 -7.1 -17.5 -8 -16.5 -8C-14.3 -8 -13.5 -3.8 -18 -.4Z" fill="#ffc21a" stroke="none" />
          </g>
        </g>
      </svg>
      <div className="m-look">
        <svg viewBox={VIEWBOX} aria-hidden="true" focusable="false" className="m-l m-eyes">
          <g fill="none" stroke="#2b1710" strokeLinecap="round" strokeLinejoin="round">
            <g className="m-eyes-open">
              <rect x="78" y="108" width="9" height="14" rx="4.5" fill="#2b1710" stroke="none" />
              <rect x="113" y="108" width="9" height="14" rx="4.5" fill="#2b1710" stroke="none" />
              <path d="M75 110L90 108M110 108L125 110" strokeWidth="4" />
            </g>
            <path className="m-eyes-yay" opacity="0" d="M77 118Q82.5 108 88 118M112 118Q117.5 108 123 118" strokeWidth="4.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
