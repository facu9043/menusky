import { ChefHat, QrCode, Users } from "lucide-react";

const IDEAS = [
  {
    icon: QrCode,
    title: "La carta llega sola",
    text: "Escanean el QR de su mesa y la carta se abre en el celular. Sin instalar nada y sin esperar a que alguien la acerque.",
  },
  {
    icon: ChefHat,
    title: "El pedido va directo a cocina",
    text: "Lo que eligen aparece en el panel de cocina en el momento, sin pasar por la libreta del mozo.",
  },
  {
    icon: Users,
    title: "Tu equipo, en la misma página",
    text: "Cocina ve los pedidos y el salón ve los llamados y el estado de cada mesa. Todo en tiempo real.",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="ms-section ms-benefits ms-edge" aria-labelledby="beneficios-title">
      <div className="ms-container ms-benefits__grid">
        <div className="ms-benefits__head" data-reveal>
          <p className="ms-eyebrow ms-eyebrow--on-dark">Por qué MenuSky</p>
          <h2 id="beneficios-title" className="ms-h2">
            Menos idas y vueltas en cada mesa
          </h2>
        </div>
        <ol className="ms-benefits__list">
          {IDEAS.map((idea, i) => (
            <li key={idea.title} className="ms-benefits__item" data-reveal>
              <span className="ms-benefits__num" aria-hidden="true">
                0{i + 1}
              </span>
              <div>
                <h3 className="ms-h3 ms-benefits__title">
                  <idea.icon aria-hidden="true" className="ms-benefits__icon" />
                  {idea.title}
                </h3>
                <p className="ms-benefits__text">{idea.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
