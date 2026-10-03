"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types/database.types";

// Cada cuánto se consulta el estado mientras la pestaña está visible. Peor caso
// de demora para el cliente: este intervalo + lo que tarde la respuesta (< 5 s,
// CA-2.7). Sondeo en vez de Realtime porque, sin lectura pública de `orders`, el
// anónimo no recibe eventos postgres_changes (docs/DECISIONES.md D-4).
export const ORDER_STATUS_POLL_MS = 3000;

const VALID: OrderStatus[] = ["received", "in_kitchen", "ready", "delivered", "cancelled"];
const isFinal = (s: OrderStatus) => s === "delivered" || s === "cancelled";

export function useOrderStatus(
  qrToken: string,
  orderId: string,
  initialStatus: OrderStatus
): OrderStatus {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (isFinal(initialStatus)) return;

    const supabase = createClient();
    let stopped = false;
    let inFlight = false; // sin solapar consultas
    let timer: ReturnType<typeof setTimeout> | null = null;
    let legacy = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // TEMP-COMPAT-0004: la base todavía no tiene get_public_order_status (migración
    // 0004 sin aplicar). Camino de antes: Realtime sobre orders (con la base vieja
    // la lectura es pública, así que el anónimo recibe los eventos). Quitar junto
    // con el resto de TEMP-COMPAT-0004 cuando la migración esté aplicada.
    const startLegacy = () => {
      legacy = true;
      clearTimer();
      channel = supabase
        .channel(`order-status-${orderId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
          (payload) => {
            const next = (payload.new as { status?: string }).status;
            if (next && VALID.includes(next as OrderStatus)) setStatus(next as OrderStatus);
          }
        )
        .subscribe();
    };

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const schedule = () => {
      clearTimer();
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(poll, ORDER_STATUS_POLL_MS);
    };

    async function poll() {
      timer = null;
      if (stopped || legacy || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const { data, error } = await supabase.rpc("get_public_order_status", {
          p_qr_token: qrToken,
          p_order_id: orderId,
        });
        if (stopped) return;
        if (error && (error.code === "PGRST202" || error.code === "42883")) {
          startLegacy();
          return;
        }
        if (!error && typeof data === "string" && VALID.includes(data as OrderStatus)) {
          setStatus(data as OrderStatus);
          if (isFinal(data as OrderStatus)) {
            stopped = true;
            return;
          }
        }
      } catch {
        // Falla de red: se reintenta en el próximo ciclo.
      } finally {
        inFlight = false;
      }
      schedule();
    }

    const onVisibility = () => {
      clearTimer();
      // Al volver a la pestaña: consulta inmediata (si hay una en vuelo, el
      // ciclo siguiente la retoma al terminar).
      if (!legacy && document.visibilityState === "visible") void poll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    return () => {
      stopped = true;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [qrToken, orderId, initialStatus]);

  return status;
}
