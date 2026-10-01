"use client";

import { useEffect } from "react";

/**
 * Un único observador para toda la landing (CA-8.7):
 * - `[data-reveal]`: entrada una sola vez al aparecer en pantalla. El estado
 *   oculto lo pone este script SOLO a los bloques que están debajo de la
 *   pantalla al cargar; sin JS (o si falla) todo queda visible.
 * - `[data-anim]`: bucles CSS de los mockups; se pausan fuera de pantalla
 *   (`data-inview`), así no consumen CPU.
 * Con prefers-reduced-motion no hace nada: no hay entradas ni bucles.
 */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    // Habilita los bucles CSS de los mockups (ver landing.css).
    const root = document.querySelector<HTMLElement>(".ms-landing");
    if (root) root.dataset.motion = "on";

    const vh = window.innerHeight;
    const reveal = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const pending = reveal.filter((el) => el.getBoundingClientRect().top > vh * 0.92);
    pending.forEach((el) => {
      el.dataset.revealState = "hidden";
    });

    const revealIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.revealState = "shown";
          revealIo.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    pending.forEach((el) => revealIo.observe(el));

    const anims = Array.from(document.querySelectorAll<HTMLElement>("[data-anim]"));
    const animIo = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) el.dataset.inview = "";
        else delete el.dataset.inview;
      }
    });
    anims.forEach((el) => animIo.observe(el));

    return () => {
      if (root) delete root.dataset.motion;
      revealIo.disconnect();
      animIo.disconnect();
    };
  }, []);

  return null;
}
