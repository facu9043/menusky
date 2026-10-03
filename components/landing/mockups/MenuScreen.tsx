import Image from "next/image";
import { BellRing, ShoppingBag } from "lucide-react";
import { BURGERS, CATEGORIES, PIZZAS, type MockDish } from "./data";

function DishList({ dishes, className }: { dishes: MockDish[]; className?: string }) {
  return (
    <ul className={`ms-menu__list ${className ?? ""}`}>
      {dishes.map((dish) => (
        <li key={dish.name} className="ms-menu__item">
          <Image
            src={dish.photo}
            alt={dish.alt}
            width={120}
            height={120}
            sizes="64px"
            className="ms-menu__thumb"
          />
          <span className="ms-menu__text">
            <span className="ms-menu__name">{dish.name}</span>
            <span className="ms-menu__desc">{dish.desc}</span>
            <span className="ms-menu__price">{dish.price}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Pantalla de la carta del cliente (categorías con pestañas, tarjetas con
 * foto, botón de carrito y botón de llamar al mozo), como en
 * components/client/*. `loop` alterna Burgers y Pizzas con CSS.
 */
export function MenuScreen({ loop = false }: { loop?: boolean }) {
  return (
    <div className={`ms-menu ${loop ? "ms-menu--loop" : ""}`}>
      <div className="ms-menu__head">
        <span className="ms-menu__venue">Tu restaurante</span>
        <span className="ms-menu__table">Mesa 4</span>
      </div>
      <div className="ms-menu__tabs">
        {CATEGORIES.map((cat, i) => (
          <span key={cat} className={`ms-menu__tab ${i === 0 ? "is-active" : ""} ms-menu__tab--${i}`}>
            {cat}
          </span>
        ))}
        <span className="ms-menu__tabbar" />
      </div>
      <div className="ms-menu__lists">
        <DishList dishes={BURGERS} className="ms-menu__list--a" />
        {loop && <DishList dishes={PIZZAS} className="ms-menu__list--b" />}
      </div>
      <div className="ms-menu__fab">
        <ShoppingBag className="ms-menu__fabicon" />
        <span>Ver pedido · 2 ítems · $ 27.400</span>
      </div>
      <span className="ms-menu__bell">
        <BellRing />
      </span>
    </div>
  );
}
