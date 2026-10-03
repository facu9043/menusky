"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Menu, MessageCircle, X } from "lucide-react";
import { EXTERNAL_LINK_PROPS, WHATSAPP_DEMO_URL } from "./contact";

// Menú del encabezado en móvil. Es un <details> nativo: funciona sin JS
// (abre y cierra con el teclado y el mouse). El script solo agrega lo que
// el elemento nativo no hace: cerrar al elegir un enlace, con Escape o al
// tocar afuera.
export function MobileMenu({
  links,
}: {
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    const close = () => {
      details.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && details.open) {
        close();
        details.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (details.open && !details.contains(e.target as Node)) close();
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a")) close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    details.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      details.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <details ref={ref} className="ms-mmenu">
      <summary className="ms-mmenu__toggle">
        <Menu aria-hidden="true" className="ms-mmenu__icon ms-mmenu__icon--open" />
        <X aria-hidden="true" className="ms-mmenu__icon ms-mmenu__icon--close" />
        <span className="ms-sr-only">Menú</span>
      </summary>
      <nav className="ms-mmenu__panel" aria-label="Secciones">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="ms-mmenu__link">
                {link.label}
              </a>
            </li>
          ))}
          {/* Solo visible en pantallas muy angostas (< 260 px, p. ej. 360 px
              con zoom 200%), donde el botón del encabezado no entra (QA-02). */}
          <li className="ms-mmenu__item--demo">
            <a href={WHATSAPP_DEMO_URL} {...EXTERNAL_LINK_PROPS} className="ms-mmenu__link ms-mmenu__link--demo">
              <MessageCircle aria-hidden="true" className="ms-mmenu__link-icon" />
              <span>Pedí una demo</span>
              <span className="ms-sr-only"> (abre WhatsApp en una pestaña nueva)</span>
            </a>
          </li>
          <li>
            <Link href="/login" className="ms-mmenu__link ms-mmenu__link--login">
              Ingresar
            </Link>
          </li>
        </ul>
      </nav>
    </details>
  );
}
