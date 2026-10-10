"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Aviso persistente y discreto "Sin conexión" (CA-11.7). Las acciones
// fallan como siempre (toast + reversión); esto solo explica por qué.
export function OfflineNotice() {
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  );

  return (
    <div role="status" aria-live="polite">
      {offline ? (
        <p className="adm-offline">
          <WifiOff aria-hidden="true" />
          Sin conexión
        </p>
      ) : null}
    </div>
  );
}
