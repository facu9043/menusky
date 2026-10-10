"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { setMenuItemAvailability } from "@/lib/admin/menuItems";

interface QueueEntry {
  /** Lo que el admin quiere ver (último toque). */
  desired: boolean;
  /** Lo último que el servidor confirmó. */
  confirmed: boolean;
  inflight: boolean;
}

export interface AvailabilityOverride {
  value: boolean;
  /** true cuando el servidor ya confirmó este valor. */
  settled: boolean;
}

// Interruptor optimista (CA-6.7 a CA-6.9):
// - El cambio se ve en el mismo cuadro del toque (estado local).
// - Las peticiones de un mismo plato van en fila: nunca hay dos en vuelo, así
//   que no pueden llegar desordenadas. Al terminar una, si el último toque
//   pide otro valor, se manda ese. 5 toques seguidos = el servidor termina
//   con el valor de la paridad.
// - Si una falla, se vuelve a lo último confirmado y se avisa.
export function useAvailability() {
  const [overrides, setOverrides] = useState<Record<string, AvailabilityOverride>>({});
  const queue = useRef(new Map<string, QueueEntry>());

  const run = useCallback(async (id: string) => {
    const entry = queue.current.get(id);
    if (!entry || entry.inflight) return;
    while (entry.desired !== entry.confirmed) {
      const target = entry.desired;
      entry.inflight = true;
      try {
        await setMenuItemAvailability(id, target);
        entry.confirmed = target;
        entry.inflight = false;
      } catch {
        entry.inflight = false;
        entry.desired = entry.confirmed;
        const value = entry.confirmed;
        setOverrides((prev) => ({ ...prev, [id]: { value, settled: true } }));
        toast.error("No se pudo actualizar la disponibilidad");
        return;
      }
    }
    const value = entry.confirmed;
    setOverrides((prev) => ({ ...prev, [id]: { value, settled: true } }));
  }, []);

  const toggle = useCallback(
    (id: string, current: boolean) => {
      let entry = queue.current.get(id);
      if (!entry) {
        entry = { desired: current, confirmed: current, inflight: false };
        queue.current.set(id, entry);
      } else if (!entry.inflight && entry.desired === entry.confirmed) {
        // En reposo, la fuente de verdad es lo que se ve (puede venir de un
        // refresco del servidor más nuevo que nuestra última confirmación).
        entry.desired = current;
        entry.confirmed = current;
      }
      entry.desired = !entry.desired;
      const value = entry.desired;
      setOverrides((prev) => ({ ...prev, [id]: { value, settled: false } }));
      void run(id);
    },
    [run]
  );

  /** Olvida el valor local (p. ej. tras guardar el plato desde la hoja). */
  const forget = useCallback((id: string) => {
    const entry = queue.current.get(id);
    if (entry?.inflight) return;
    queue.current.delete(id);
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /** Al llegar datos nuevos del servidor, se descartan los valores ya confirmados. */
  const dropSettled = useCallback(() => {
    setOverrides((prev) => {
      const next: Record<string, AvailabilityOverride> = {};
      for (const [id, o] of Object.entries(prev)) if (!o.settled) next[id] = o;
      return next;
    });
  }, []);

  return { overrides, toggle, forget, dropSettled };
}
