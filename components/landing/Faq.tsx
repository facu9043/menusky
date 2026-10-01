import { Plus } from "lucide-react";

// Preguntas y respuestas de la spec (5.3), solo hechos verificados.
const FAQ = [
  {
    q: "¿Mis clientes tienen que instalar una app?",
    a: "No. Escanean el QR de la mesa y la carta se abre en el navegador de su celular.",
  },
  {
    q: "¿Cómo piden la cuenta?",
    a: "Desde la carta tocan “Llamar al mozo” y eligen “Pedir la cuenta”. Tu equipo ve el llamado en el panel de salón y la cuenta de la mesa en sus paneles. Es una cuenta orientativa: no reemplaza a tu caja.",
  },
  {
    q: "¿Puedo cargar y cambiar mi carta?",
    a: "Sí. Desde el panel de administración cargás categorías, platos, fotos y opciones, y marcás un plato como “Sin stock hoy”.",
  },
  {
    q: "¿Cómo consigo los QR de mis mesas?",
    a: "Creás las mesas en el panel de administración y descargás el QR de cada una como imagen PNG, listo para imprimir.",
  },
  {
    q: "¿Puedo cambiar los colores de mi carta?",
    a: "Sí. Elegís entre 7 temas o armás tu propia paleta.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Pedí una demo por WhatsApp o por email y te mostramos cómo funciona MenuSky.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" className="ms-section ms-faq" aria-labelledby="preguntas-title">
      <div className="ms-container ms-faq__grid">
        <div className="ms-faq__head" data-reveal>
          <p className="ms-eyebrow">Preguntas</p>
          <h2 id="preguntas-title" className="ms-h2">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="ms-faq__list" data-reveal>
          {FAQ.map((item) => (
            <details key={item.q} className="ms-faq__item">
              <summary className="ms-faq__q">
                <h3 className="ms-faq__qtext">{item.q}</h3>
                <Plus aria-hidden="true" className="ms-faq__icon" />
              </summary>
              <p className="ms-faq__a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
