import { FlowDemo } from "./FlowDemo";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="ms-section ms-how" aria-labelledby="como-funciona-title">
      <div className="ms-container">
        <div className="ms-section__head" data-reveal>
          <p className="ms-eyebrow">Cómo funciona</p>
          <h2 id="como-funciona-title" className="ms-h2">
            Así de simple
          </h2>
          <p className="ms-section__lead">
            Del QR de la mesa al panel de cocina, sin libreta y sin idas y vueltas.
          </p>
        </div>
        <FlowDemo />
      </div>
    </section>
  );
}
