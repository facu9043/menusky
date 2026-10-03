import { ArrowDown } from "lucide-react";
import { DemoButton, EmailLink } from "./Cta";
import { Hero3D } from "./hero3d/Hero3D";
import { BurgerFallback } from "./hero3d/BurgerFallback";
import { Phone } from "./mockups/Phone";
import { MenuScreen } from "./mockups/MenuScreen";

export function Hero() {
  return (
    <section id="inicio" className="ms-hero" aria-labelledby="hero-title">
      <div className="ms-container ms-hero__grid">
        <div className="ms-hero__copy">
          <p className="ms-eyebrow ms-hero__eyebrow">
            <span className="ms-eyebrow__dot" aria-hidden="true" />
            Carta digital + pedidos por QR
          </p>
          <h1 id="hero-title" className="ms-hero__title">
            Que tus clientes pidan desde la mesa. <span className="ms-hero__accent">Y tu cocina lo vea al instante.</span>
          </h1>
          <p className="ms-hero__lead">
            MenuSky es la carta digital con pedidos por QR para restaurantes, bares y cafés. Tus clientes escanean,
            eligen y piden. Vos lo seguís todo en vivo.
          </p>
          <div className="ms-hero__ctas">
            <DemoButton size="lg" />
            <a href="#como-funciona" className="ms-btn ms-btn--ghost ms-btn--lg">
              <span>Mirá cómo funciona</span>
              <ArrowDown aria-hidden="true" className="ms-btn__icon ms-btn__icon--end" />
            </a>
          </div>
          <p className="ms-hero__micro">
            Hablamos por WhatsApp o por email. <EmailLink />
          </p>
        </div>

        <div className="ms-hero__stage" data-anim>
          <div className="ms-hero__sun" aria-hidden="true" />
          <Hero3D>
            <BurgerFallback />
          </Hero3D>
          <Phone
            className="ms-hero__phone"
            label="Ilustración: la carta de un restaurante abierta en un celular, con categorías, platos con foto y el botón para ver el pedido."
          >
            <MenuScreen />
          </Phone>
        </div>
      </div>
    </section>
  );
}
