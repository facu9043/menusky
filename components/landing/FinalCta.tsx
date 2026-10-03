import { DemoButton, EmailLink } from "./Cta";

export function FinalCta() {
  return (
    <section id="demo" className="ms-section ms-final ms-edge" aria-labelledby="demo-title">
      <div className="ms-container ms-final__inner" data-reveal>
        <svg className="ms-final__stack" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <path d="M18 58c0-24 19-38 42-38s42 14 42 38Z" fill="#FFC21A" />
          <path d="M14 70q5-6 10 0t10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0" fill="none" stroke="#7CCB4E" strokeWidth="6" strokeLinecap="round" />
          <rect x="12" y="78" width="96" height="14" rx="7" fill="#2B1710" />
          <rect x="16" y="97" width="88" height="12" rx="6" fill="#FFC21A" />
        </svg>
        <h2 id="demo-title" className="ms-h2 ms-final__title">
          ¿Querés ver MenuSky en tu restaurante?
        </h2>
        <p className="ms-final__lead">
          Contanos de tu local y coordinamos una demo. Te mostramos la carta, los pedidos por QR y los paneles de
          tu equipo funcionando.
        </p>
        <div className="ms-final__ctas">
          <DemoButton size="lg" />
          <EmailLink className="ms-textlink--on-red" />
        </div>
      </div>
    </section>
  );
}
