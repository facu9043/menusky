"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadAdminLiveSnapshot } from "@/lib/admin/live/load";
import type { AdminLiveSnapshot } from "@/lib/admin/live/types";
import { todayRangeAR } from "@/lib/time/today";

export type AdminLiveValue = AdminLiveSnapshot & {
  /** Estado de la conexión en vivo (CA-8.15). */
  connected: boolean;
  /** Vuelve a leer todo. Lo llama la pantalla tras crear/borrar una mesa; también se usa al reconectar. */
  refresh(): Promise<void>;
  /** Para aria-live (CA-8.6). Sin sonido ni toast. */
  lastCallEvent: { tableLabel: string; at: number } | null;
};

const AdminLiveContext = createContext<AdminLiveValue | null>(null);

// Los eventos llegan en ráfagas (un pedido = 1 insert + varios updates): se
// agrupan en una sola relectura.
const REFRESH_DEBOUNCE_MS = 250;

export function AdminLiveProvider({
  restaurantId,
  initial,
  children,
}: {
  restaurantId: string;
  initial: AdminLiveSnapshot;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [connected, setConnected] = useState(false);
  const [lastCallEvent, setLastCallEvent] = useState<AdminLiveValue["lastCallEvent"]>(null);

  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // El cliente de Supabase se crea una vez por restaurante.
  const supabase = useMemo(() => createClient(), []);

  const aliveRef = useRef(true);
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const next = await loadAdminLiveSnapshot(supabase, restaurantId);
      // Si salió una relectura más nueva, esta respuesta ya es vieja.
      if (aliveRef.current && seq === seqRef.current) setSnapshot(next);
    } catch {
      // Se conserva lo último que se vio; el próximo evento o reconexión reintenta.
    }
  }, [supabase, restaurantId]);

  useEffect(() => {
    aliveRef.current = true;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let wasConnected = false;

    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void refresh(), REFRESH_DEBOUNCE_MS);
    };

    // UNA sola suscripción por sesión (R-9).
    const channel = supabase
      .channel(`admin-live-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waiter_calls", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const row = payload.new as { table_id?: string };
          const label = snapshotRef.current.tables.find((t) => t.id === row.table_id)?.label ?? "Una mesa";
          setLastCallEvent({ tableLabel: label, at: Date.now() });
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waiter_calls", filter: `restaurant_id=eq.${restaurantId}` },
        scheduleRefresh
      )
      // `tables` NO se escucha (SEC-AD-04): no está en la publicación de Realtime y los DELETE
      // no admiten filtro por restaurante. Quien crea o borra una mesa llama a `refresh()`.
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        if (aliveRef.current) setConnected(ok);
        // Al reconectar se pudo perder algún evento: se relee todo.
        if (ok && wasConnected) void refresh();
        if (ok) wasConnected = true;
      });

    // Al pasar la medianoche de Argentina el "hoy" cambia aunque no haya eventos.
    const msToMidnight = Math.max(1000, Date.parse(todayRangeAR().endIso) - Date.now() + 1000);
    const midnight = setTimeout(() => void refresh(), msToMidnight);

    return () => {
      aliveRef.current = false;
      if (debounce) clearTimeout(debounce);
      clearTimeout(midnight);
      void supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, refresh]);

  const value = useMemo<AdminLiveValue>(
    () => ({ ...snapshot, connected, refresh, lastCallEvent }),
    [snapshot, connected, refresh, lastCallEvent]
  );

  return <AdminLiveContext.Provider value={value}>{children}</AdminLiveContext.Provider>;
}

export function useAdminLive(): AdminLiveValue {
  const ctx = useContext(AdminLiveContext);
  if (!ctx) throw new Error("useAdminLive debe usarse dentro de <AdminLiveProvider>");
  return ctx;
}
