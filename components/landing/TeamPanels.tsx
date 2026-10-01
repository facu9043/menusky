import Image from "next/image";
import { ChefHat, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { AdminMock, CallRow, KitchenCard, TableGrid } from "./mockups/Pieces";

export function TeamPanels() {
  return (
    <section id="equipo" className="ms-section ms-team ms-edge" aria-labelledby="equipo-title">
      <div className="ms-container">
        <div className="ms-section__head" data-reveal>
          <p className="ms-eyebrow ms-eyebrow--on-cheddar">Para tu equipo</p>
          <h2 id="equipo-title" className="ms-h2">
            Cocina, salón y administración, en tiempo real
          </h2>
          <p className="ms-section__lead">
            Cocina ve los pedidos; el salón, los llamados y las mesas; y desde administración manejás la carta y
            los QR. Los paneles de cocina y salón se actualizan solos.
          </p>
        </div>

        <div className="ms-team__grid">
          <article className="ms-panel ms-panel--kitchen" data-reveal data-anim>
            <header className="ms-panel__head">
              <ChefHat aria-hidden="true" className="ms-panel__icon" />
              <div>
                <h3 className="ms-h3">Cocina</h3>
                <p>Los pedidos entran solos al tablero. Un toque para tomarlos y otro para marcarlos listos.</p>
              </div>
            </header>
            <div
              className="ms-board"
              role="img"
              aria-label="Ilustración: panel de cocina con pedidos de las mesas 4, 2 y 9, cada uno con sus platos y el botón Tomar pedido o Marcar listo."
            >
              <KitchenCard
                table="Mesa 4"
                time="21:06"
                status="received"
                isNew
                items={[
                  { qty: 1, name: "Burger completa", options: "A punto · Papas fritas", note: "Sin cebolla" },
                  { qty: 1, name: "Napolitana" },
                ]}
                className="ms-board__card ms-board__card--new"
              />
              <KitchenCard
                table="Mesa 2"
                time="20:58"
                status="in_kitchen"
                items={[{ qty: 2, name: "Doble cheddar", note: "Una sin pepinos" }]}
                className="ms-board__card"
              />
              <KitchenCard
                table="Mesa 9"
                time="20:55"
                status="in_kitchen"
                items={[
                  { qty: 1, name: "Rúcula y morrones" },
                  { qty: 2, name: "Clásica con papas", options: "Bien cocido" },
                ]}
                className="ms-board__card ms-board__card--third"
              />
            </div>
          </article>

          <article className="ms-panel ms-panel--floor" data-reveal data-anim>
            <header className="ms-panel__head">
              <LayoutGrid aria-hidden="true" className="ms-panel__icon" />
              <div>
                <h3 className="ms-h3">Salón</h3>
                <p>Los llamados de mozo, los pedidos listos y el estado de cada mesa, de un vistazo.</p>
              </div>
            </header>
            <div className="ms-floor">
              <Image
                src="/landing/ambiente-1.webp"
                alt="Foto de ejemplo: mesa de un restaurante con platos y copas, en una terraza."
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 640px, 100vw"
                className="ms-floor__photo"
              />
              <div
                className="ms-floor__panel"
                role="img"
                aria-label="Ilustración: panel de salón con el llamado de la Mesa 7, que pide la cuenta, y la grilla de mesas con los estados Libre, Con pedido, Listo y Llamando."
              >
                <span className="ms-floor__title">Llamados de mozo</span>
                <CallRow table="Mesa 7" reason="Pide la cuenta" time="21:14" className="ms-floor__call" />
                <span className="ms-floor__title">Mesas</span>
                <TableGrid />
              </div>
            </div>
          </article>

          <article className="ms-panel ms-panel--admin" data-reveal>
            <header className="ms-panel__head">
              <SlidersHorizontal aria-hidden="true" className="ms-panel__icon" />
              <div>
                <h3 className="ms-h3">Administración</h3>
                <p>
                  Cargás la carta con fotos y opciones, marcás un plato como “Sin stock hoy”, creás las mesas y
                  descargás sus QR.
                </p>
              </div>
            </header>
            <div
              role="img"
              aria-label="Ilustración: panel de administración con la carta, platos disponibles y uno marcado Sin stock hoy, y la Mesa 4 con el botón Descargar QR."
            >
              <AdminMock />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
