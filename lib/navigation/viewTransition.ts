// Envuelve una navegación en la View Transitions API nativa del navegador
// (sin librerías: Next 16 no trae esto resuelto para App Router "out of the
// box", pero la API del browser sola alcanza para estos pocos puntos de
// navegación puntuales). Si el navegador no la soporta, o el usuario pidió
// menos movimiento, hace la navegación común sin transición.
export function withViewTransition(update: () => void) {
  if (
    typeof document === "undefined" ||
    !("startViewTransition" in document) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  document.startViewTransition(update);
}
