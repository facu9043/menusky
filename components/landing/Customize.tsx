import type { CSSProperties } from "react";
import Image from "next/image";
import { Check, Minus, Plus } from "lucide-react";
import { StatusTracker } from "./mockups/Pieces";

// Los 7 temas reales de lib/theme/presets.ts (nombre + 4 colores clave).
// btn / btnText: colores del botón "Ver pedido" del mockup, elegidos para
// contraste AA (>= 4,5:1) con texto de 12,8 px. Si el texto del tema ya
// cumple sobre el acento se usa ese; si no, se oscurece el acento SOLO en el
// botón (el acento real se sigue viendo en la miniatura y la muestra).
const THEMES = [
  { label: "Default", bg: "#F5EDE0", card: "#F5CDA0", text: "#1C1917", accent: "#E8590C", btnText: "#1C1917" }, // 4,88
  { label: "Glaciar", bg: "#DCEFF6", card: "#B9E4F0", text: "#0B2A3B", accent: "#0EA5C9", btnText: "#0B2A3B" }, // 5,14
  { label: "Galaxia", bg: "#0B0B14", card: "#16162B", text: "#F5F3FF", accent: "#C742F0", btn: "#AE2FDC" }, // 4,95
  { label: "Madera", bg: "#EDDDC0", card: "#E7C48A", text: "#3B2A1E", accent: "#C98A2C", btnText: "#3B2A1E" }, // 4,66
  { label: "Neobrutalista", bg: "#FFF7E6", card: "#FFC53D", text: "#141414", accent: "#E63946", btn: "#D62B39" }, // 4,93
  { label: "Neumorfismo", bg: "#E7E2D8", card: "#E7E2D8", text: "#3A362E", accent: "#C97B5A", btn: "#A8603F" }, // 4,76
  { label: "Claymorfismo", bg: "#F4F1FB", card: "#FFD6A5", text: "#2E2A3D", accent: "#FF6F61", btnText: "#2E2A3D" }, // 5,08
] satisfies { label: string; bg: string; card: string; text: string; accent: string; btn?: string; btnText?: string }[];

export function Customize() {
  return (
    <section id="a-tu-medida" className="ms-section ms-custom" aria-labelledby="a-tu-medida-title">
      <div className="ms-container">
        <div className="ms-section__head" data-reveal>
          <p className="ms-eyebrow">A tu medida</p>
          <h2 id="a-tu-medida-title" className="ms-h2">
            Tu carta, con tu estilo
          </h2>
        </div>

        <div className="ms-custom__grid">
          <article className="ms-custom__item ms-custom__item--options" data-reveal>
            <div className="ms-custom__copy">
              <h3 className="ms-h3">Opciones y extras por plato</h3>
              <p>
                Punto de cocción, guarnición, extras: grupos obligatorios u opcionales, de una o de varias elecciones.
                Los extras se suman al total del plato y cada cliente puede dejar una nota.
              </p>
            </div>
            <div
              className="ms-sheet"
              role="img"
              aria-label="Ilustración: detalle de un plato en la carta, con foto, punto de cocción, extras, una nota y el botón Agregar."
            >
              <Image
                src="/landing/burger-1-wide.webp"
                alt="Foto de ejemplo: hamburguesa completa con cheddar"
                width={960}
                height={600}
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 60vw, 90vw"
                className="ms-sheet__photo"
              />
              <div className="ms-sheet__body">
                <span className="ms-sheet__name">Burger completa</span>
                <span className="ms-sheet__desc">Cheddar, panceta, tomate y lechuga</span>

                <span className="ms-sheet__group">
                  <span>Punto de cocción</span>
                  <span className="ms-sheet__req">Obligatorio</span>
                </span>
                <span className="ms-sheet__opts">
                  <span className="ms-sheet__radio">Jugoso</span>
                  <span className="ms-sheet__radio is-on">A punto</span>
                  <span className="ms-sheet__radio">Bien cocido</span>
                </span>

                <span className="ms-sheet__group">
                  <span>Extras</span>
                  <span className="ms-sheet__opt">Opcional</span>
                </span>
                <span className="ms-sheet__check is-on">
                  <i>
                    <Check />
                  </i>
                  Cheddar extra <em>+ $ 1.200</em>
                </span>
                <span className="ms-sheet__check">
                  <i />
                  Panceta <em>+ $ 1.500</em>
                </span>

                <span className="ms-sheet__group">
                  <span>Nota (opcional)</span>
                </span>
                <span className="ms-sheet__note">Sin cebolla, por favor</span>

                <span className="ms-sheet__footer">
                  <span className="ms-sheet__qty">
                    <Minus />1<Plus />
                  </span>
                  <span className="ms-sheet__add">Agregar · $ 14.100</span>
                </span>
              </div>
            </div>
          </article>

          <article className="ms-custom__item ms-custom__item--tracking" data-reveal data-anim>
            <div className="ms-custom__copy">
              <h3 className="ms-h3">Seguimiento del pedido</h3>
              <p>Después de pedir, el cliente ve en su celular cómo avanza su pedido, en tiempo real.</p>
            </div>
            <div
              className="ms-trackcard"
              role="img"
              aria-label="Ilustración: seguimiento del pedido con los pasos Recibido, En preparación, Listo y Entregado."
            >
              <span className="ms-trackcard__title">Tu pedido · Mesa 4</span>
              <StatusTracker current={1} />
            </div>
          </article>

          <article className="ms-custom__item ms-custom__item--themes" data-reveal data-anim>
            <div className="ms-custom__copy">
              <h3 className="ms-h3">Temas de color</h3>
              <p>Elegís entre 7 temas o armás tu propia paleta, para que la carta se vea como tu local.</p>
            </div>
            <div
              className="ms-themes"
              role="img"
              aria-label="Ilustración: la misma tarjeta de la carta con los 7 temas: Default, Glaciar, Galaxia, Madera, Neobrutalista, Neumorfismo y Claymorfismo."
            >
              <div className="ms-themes__preview">
                {THEMES.map((t, i) => (
                  <span
                    key={t.label}
                    className="ms-themes__card"
                    style={
                      {
                        "--t-bg": t.bg,
                        "--t-card": t.card,
                        "--t-text": t.text,
                        "--t-accent": t.accent,
                        "--t-btn": "btn" in t ? t.btn : t.accent,
                        "--t-btn-text": "btnText" in t ? t.btnText : "#fff",
                        "--t-i": i,
                      } as CSSProperties
                    }
                  >
                    <span className="ms-themes__dish">
                      <span className="ms-themes__thumb" />
                      <span className="ms-themes__lines">
                        <b>Burger completa</b>
                        <span>Cheddar, panceta y tomate</span>
                      </span>
                    </span>
                    <span className="ms-themes__btn">Ver pedido</span>
                    <span className="ms-themes__name">{t.label}</span>
                  </span>
                ))}
              </div>
              <ul className="ms-themes__swatches">
                {THEMES.map((t, i) => (
                  <li
                    key={t.label}
                    className="ms-themes__swatch"
                    style={{ "--t-bg": t.bg, "--t-accent": t.accent, "--t-i": i } as CSSProperties}
                  >
                    <i />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
