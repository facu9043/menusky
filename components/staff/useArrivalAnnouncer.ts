"use client";

import { useEffect, useRef } from "react";

// Avisos para lector de pantalla (CA-5.1): anuncia UNA vez lo que llega
// después de cargar (no el tablero inicial). Se deriva de la lista que la
// pantalla ya tiene, sin consultas ni suscripciones nuevas (CA-NR.11, D-24).
// Escribe directo en la región aria-live (sin estado de React): no vuelve a
// renderizar el tablero.
export function useArrivalAnnouncer<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  messageOf: (item: T) => string
) {
  const regionRef = useRef<HTMLParagraphElement>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const keys = new Set(items.map(keyOf));
    if (seen.current === null) {
      seen.current = keys;
      return;
    }
    const fresh = items.filter((item) => !seen.current!.has(keyOf(item)));
    seen.current = keys;
    if (fresh.length > 0 && regionRef.current) {
      regionRef.current.textContent = fresh.map(messageOf).join(". ");
    }
  }, [items, keyOf, messageOf]);

  return regionRef;
}
