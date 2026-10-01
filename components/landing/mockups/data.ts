// Datos FICTICIOS y genéricos para los mockups de la landing (spec
// CA-3.5, CA-4.4). Sin restaurantes reales, sin marcas, sin qr_token.
// Los montos son ilustrativos y solo aparecen dentro de la carta del
// mockup (CA-3.2).

export type MockDish = {
  name: string;
  desc: string;
  price: string;
  photo: string;
  alt: string;
};

export const BURGERS: MockDish[] = [
  {
    name: "Burger completa",
    desc: "Cheddar, panceta, tomate y lechuga",
    price: "$ 12.900",
    photo: "/landing/burger-1-sq.webp",
    alt: "Foto de ejemplo: hamburguesa con cheddar, panceta y tomate",
  },
  {
    name: "Doble cheddar",
    desc: "Dos medallones, cheddar y pepinos",
    price: "$ 14.500",
    photo: "/landing/burger-2-sq.webp",
    alt: "Foto de ejemplo: hamburguesa doble con cheddar",
  },
  {
    name: "Clásica con papas",
    desc: "Medallón, lechuga y papas fritas",
    price: "$ 11.200",
    photo: "/landing/burger-3-sq.webp",
    alt: "Foto de ejemplo: hamburguesa con papas fritas",
  },
];

export const PIZZAS: MockDish[] = [
  {
    name: "Napolitana",
    desc: "Muzzarella, tomate y albahaca",
    price: "$ 13.800",
    photo: "/landing/pizza-2-sq.webp",
    alt: "Foto de ejemplo: pizza napolitana con albahaca",
  },
  {
    name: "Rúcula y morrones",
    desc: "Salsa de tomate, morrones y verdes",
    price: "$ 14.200",
    photo: "/landing/pizza-1-sq.webp",
    alt: "Foto de ejemplo: pizza con morrones y hojas verdes",
  },
];

export const CATEGORIES = ["Burgers", "Pizzas", "Bebidas", "Postres"] as const;

/** Estados del pedido: nombres idénticos a components/client/OrderStatusTracker.tsx. */
export const ORDER_STEPS = ["Recibido", "En preparación", "Listo", "Entregado"] as const;
