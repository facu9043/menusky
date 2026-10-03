import { BellRing, ChefHat } from "lucide-react";
import { Phone } from "./mockups/Phone";
import { MenuScreen } from "./mockups/MenuScreen";
import { CallRow, FakeQr, WaiterSheet } from "./mockups/Pieces";

export function Features() {
  return (
    <section id="funciones" className="ms-section ms-features" aria-labelledby="funciones-title">
      <div className="ms-container">
        <div className="ms-section__head" data-reveal>
          <p className="ms-eyebrow">Funciones</p>
          <h2 id="funciones-title" className="ms-h2">
            Todo lo que pasa en tu salón, en un solo lugar
          </h2>
        </div>

        <div className="ms-bento">
          {/* Carta digital */}
          <article className="ms-tile ms-tile--carta" data-reveal data-anim>
            <div className="ms-tile__copy">
              <h3 className="ms-h3">Carta digital</h3>
              <p>Tu carta, con fotos y por categorías, siempre al día.</p>
            </div>
            <div className="ms-tile__visual ms-tile__visual--phone">
              <Phone
                className="ms-tile__phone"
                label="Ilustración: carta digital en un celular que cambia entre las categorías Burgers y Pizzas, con platos con foto."
              >
                <MenuScreen loop />
              </Phone>
            </div>
          </article>

          {/* Pedidos por QR */}
          <article className="ms-tile ms-tile--qr" data-reveal data-anim>
            <div className="ms-tile__copy">
              <h3 className="ms-h3">Pedidos por QR</h3>
              <p>Cada mesa tiene su QR. El pedido va directo a cocina.</p>
            </div>
            <div
              className="ms-tile__visual ms-qrdemo"
              role="img"
              aria-label="Ilustración: un QR sobre la mesa 4 se escanea y aparece un pedido nuevo de la Mesa 4 en el panel de cocina."
            >
              <span className="ms-qrdemo__tent">
                <FakeQr className="ms-qrdemo__qr" />
                <span className="ms-qrdemo__scan" />
                <span className="ms-qrdemo__label">Mesa 4</span>
              </span>
              <span className="ms-qrdemo__path" />
              <span className="ms-qrdemo__toast">
                <ChefHat />
                <span>
                  <b>Pedido nuevo</b>
                  <span>Mesa 4 · 2 ítems</span>
                </span>
              </span>
            </div>
          </article>

          {/* Llamado al mozo */}
          <article className="ms-tile ms-tile--mozo" data-reveal data-anim>
            <div className="ms-tile__copy">
              <h3 className="ms-h3">Llamado al mozo</h3>
              <p>Un toque y el mozo ve quién lo necesita.</p>
            </div>
            <div
              className="ms-tile__visual ms-mozodemo"
              role="img"
              aria-label="Ilustración: el cliente toca el botón de llamar al mozo, elige Hacer una consulta y en el panel de salón aparece Mesa 7, tiene una consulta."
            >
              <span className="ms-mozodemo__bell">
                <BellRing />
              </span>
              <span className="ms-mozodemo__sheet">
                <WaiterSheet highlight="consulta" />
              </span>
              <CallRow table="Mesa 7" reason="Tiene una consulta" time="21:12" className="ms-mozodemo__row" />
            </div>
          </article>

          {/* Pedir la cuenta */}
          <article className="ms-tile ms-tile--cuenta" data-reveal data-anim>
            <div className="ms-tile__copy">
              <h3 className="ms-h3">Pedir la cuenta</h3>
              <p>
                Tus clientes piden la cuenta sin levantar la mano. Tu equipo ve el llamado y la cuenta de la mesa en
                sus paneles.
              </p>
              <p className="ms-tile__note">Es una cuenta orientativa: no reemplaza a tu caja.</p>
            </div>
            <div
              className="ms-tile__visual ms-cuentademo"
              role="img"
              aria-label="Ilustración: desde la carta el cliente elige Pedir la cuenta y en el panel de salón aparece Mesa 4, pide la cuenta, junto a la cuenta de la mesa."
            >
              <span className="ms-cuentademo__sheet">
                <WaiterSheet highlight="cuenta" />
              </span>
              <span className="ms-cuentademo__arrow" />
              <span className="ms-cuentademo__panel">
                <span className="ms-cuentademo__paneltitle">Llamados de mozo</span>
                <CallRow table="Mesa 4" reason="Pide la cuenta" time="21:31" showTotal className="ms-cuentademo__row" />
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
