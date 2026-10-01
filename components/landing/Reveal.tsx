"use client";

import { useEffect } from "react";

/**
 * Un único observador para toda la landing (CA-8.7):
 * - `[data-reveal]`: entrada una sola vez al aparecer en pantalla. El estado
 *   oculto lo pone este script SOLO a los bloques que están debajo de la
 *   pantalla al cargar; sin JS (o si falla) todo queda visible.
 * - `[data-anim]`: bucles CSS de los mockups; se pausan fuera de pantalla
 *   (`data-inview`), así no consumen CPU.
 * Con prefers-reduced-motion no hay entradas, bucles ni scroll suave.
 *
 * También corrige las anclas del menú: las secciones usan
 * content-visibility (landing.css) y, mientras no se pintaron, miden una
 * altura estimada. Si el texto envuelve distinto a la estimación, el salto
 * queda corrido; al terminar el desplazamiento se ajusta contra la
 * posición real de la sección (siempre, también con reduced-motion).
 */
export function Reveal() {
  useEffect(() => {
    // Fondo de <html> igual al de la landing: el rebote del scroll en iOS
    // no muestra el blanco del body. Inline y solo en esta ruta (evita un
    // selector html:has(), que recalcula estilos en cada cambio del DOM).
    const html = document.documentElement;
    const prevBg = html.style.backgroundColor;
    html.style.backgroundColor = "#fff5e1";

    const stopAnchors = fixAnchors();
    const base = () => {
      html.style.backgroundColor = prevBg;
      stopAnchors();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return base;
    if (!("IntersectionObserver" in window)) return base;

    // Habilita los bucles CSS de los mockups (ver landing.css).
    const root = document.querySelector<HTMLElement>(".ms-landing");
    if (root) root.dataset.motion = "on";
    // Scroll suave a las anclas (con reduced-motion queda instantáneo).
    const prevScroll = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";

    // Qué bloques arrancan ocultos: los que están debajo de la pantalla.
    // Ojo con content-visibility: medir un elemento DENTRO de una sección
    // salteada obliga al navegador a maquetarla entera, una vez por
    // elemento (cientos de ms en un celular). Por eso se mide primero la
    // sección (su caja existe con la altura estimada) y solo se miden los
    // hijos de las secciones que llegan a la pantalla. Solo lecturas, sin
    // escrituras en el medio: una única maquetación.
    const vh = window.innerHeight;
    const limit = vh * 0.92;
    const reveal = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const sectionTop = new Map<Element, number>();
    const pending = reveal.filter((el) => {
      const section = el.closest(".ms-section, .ms-footer");
      if (section) {
        let top = sectionTop.get(section);
        if (top === undefined) {
          top = section.getBoundingClientRect().top;
          sectionTop.set(section, top);
        }
        if (top > limit) return true;
      }
      return el.getBoundingClientRect().top > limit;
    });
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
      html.style.scrollBehavior = prevScroll;
      base();
      revealIo.disconnect();
      animIo.disconnect();
    };
  }, []);

  return null;
}

/**
 * Espera a que el desplazamiento hacia un ancla termine (8 cuadros sin
 * moverse) y, si la sección no quedó donde marca su scroll-margin-top,
 * salta la diferencia. Repite hasta 4 veces (cada salto pinta secciones
 * nuevas y su altura real reemplaza a la estimada). Si la persona
 * desplaza por su cuenta, se cancela: nunca le "tira" la pantalla.
 */
function fixAnchors() {
  let raf = 0;
  let deadline = 0;

  const cancel = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const settleOn = (target: HTMLElement) => {
    cancel();
    deadline = performance.now() + 4000;
    let lastY = Number.NaN;
    let still = 0;
    let fixes = 0;
    const tick = () => {
      raf = 0;
      if (performance.now() > deadline) return;
      const y = window.scrollY;
      still = y === lastY ? still + 1 : 0;
      lastY = y;
      if (still >= 8) {
        const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        const delta = Math.round(target.getBoundingClientRect().top - margin);
        if (Math.abs(delta) <= 2 || fixes >= 4) return;
        fixes++;
        still = 0;
        window.scrollBy({ top: delta, behavior: "instant" });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const targetFor = (hash: string) => {
    if (hash.length < 2) return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href^='#']");
    const target = link ? targetFor(link.getAttribute("href") ?? "") : null;
    if (target) settleOn(target);
  };
  const onHash = () => {
    const target = targetFor(location.hash);
    if (target) settleOn(target);
  };
  // Input propio de la persona: deja de corregir.
  const USER_INPUT = ["wheel", "touchstart", "keydown"] as const;

  document.addEventListener("click", onClick);
  window.addEventListener("hashchange", onHash);
  USER_INPUT.forEach((ev) => window.addEventListener(ev, cancel, { passive: true }));
  // Entrada directa con #ancla en la URL (el navegador ya saltó al cargar).
  onHash();

  return () => {
    cancel();
    document.removeEventListener("click", onClick);
    window.removeEventListener("hashchange", onHash);
    USER_INPUT.forEach((ev) => window.removeEventListener(ev, cancel));
  };
}
