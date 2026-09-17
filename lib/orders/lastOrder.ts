// Recordar el último pedido enviado desde este celular para poder volver a
// verlo (ver [components/client/ContinueOrderButton.tsx]). Expira a las 6hs
// para no mostrar en una visita nueva el pedido de una visita anterior.
const TTL_MS = 6 * 60 * 60 * 1000;

function storageKey(tableQrToken: string) {
  return `lastOrder:${tableQrToken}`;
}

export function setLastOrderId(tableQrToken: string, orderId: string) {
  try {
    localStorage.setItem(
      storageKey(tableQrToken),
      JSON.stringify({ orderId, savedAt: Date.now() })
    );
  } catch {
    // localStorage no disponible (modo privado, etc.) — no persistimos.
  }
}

export function getLastOrderId(tableQrToken: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey(tableQrToken));
    if (!raw) return null;

    const { orderId, savedAt } = JSON.parse(raw) as {
      orderId: string;
      savedAt: number;
    };

    if (Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(storageKey(tableQrToken));
      return null;
    }

    return orderId;
  } catch {
    return null;
  }
}
