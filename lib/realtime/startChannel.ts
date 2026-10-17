import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// Al recargar una pagina de staff con la sesion guardada en cookies, supabase-js lee la
// sesion de forma asincrona. Si el canal se une (phx_join) antes de eso, el join sale SIN
// access_token (RealtimeChannel.ts:415-417 de realtime-js usa socket.accessTokenValue, que
// todavia es null) y Realtime evalua RLS como anonimo: con la migracion 0004 el anonimo no
// lee orders/waiter_calls y los eventos nunca llegan. Aca se espera la sesion y se la
// entrega a Realtime (setAuth) ANTES de suscribir.
export async function ensureRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
  } catch {
    // Sin sesion legible: se sigue como anonimo (el comportamiento de antes).
  }
}

// Suscribe un canal despues de asegurar el token. Devuelve la funcion de limpieza para
// el useEffect (segura aunque el efecto se desmonte antes de que termine la espera).
export function startChannel(
  supabase: SupabaseClient,
  build: () => RealtimeChannel
): () => void {
  let cancelled = false;
  let channel: RealtimeChannel | null = null;
  void ensureRealtimeAuth(supabase).then(() => {
    if (!cancelled) channel = build();
  });
  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
