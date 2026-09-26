// Animación "volar al carrito": clona un círculo (con la foto del plato si
// tiene, si no un color del theme) y lo anima desde el botón "Agregar" hasta
// el ícono del carrito (o, si el carrito todavía no existe en pantalla —
// primer ítem del pedido—, hasta abajo al centro, que es donde va a aparecer).
// Vive fuera de React (DOM directo) porque es un elemento efímero que se
// crea y se destruye solo; no necesita estado ni re-renders.
export function flyToCart(sourceEl: HTMLElement, photoUrl?: string | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cartTarget = document.querySelector<HTMLElement>("[data-cart-fab-icon]");
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = cartTarget?.getBoundingClientRect();

  const sourceCenter = {
    x: sourceRect.left + sourceRect.width / 2,
    y: sourceRect.top + sourceRect.height / 2,
  };
  const targetCenter = targetRect
    ? { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight - 32 };

  const size = 44;
  const clone = document.createElement("div");
  clone.style.cssText = `
    position: fixed;
    left: ${sourceCenter.x - size / 2}px;
    top: ${sourceCenter.y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 999px;
    background: ${photoUrl ? `center/cover no-repeat url("${photoUrl}")` : "var(--primary)"};
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    z-index: 100;
    will-change: transform, opacity;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.7, 1), opacity 0.5s ease 0.15s;
  `;
  document.body.appendChild(clone);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // Doble rAF: fuerza al navegador a pintar la posición inicial antes de
  // aplicar el transform final, si no la transición no tiene "desde dónde" animar.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
      clone.style.opacity = "0.25";
    });
  });

  const cleanup = () => clone.remove();
  clone.addEventListener("transitionend", cleanup, { once: true });
  setTimeout(cleanup, 700); // red de seguridad si transitionend no dispara
}
