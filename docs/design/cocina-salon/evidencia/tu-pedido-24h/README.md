# "Tu pedido" en 24 h (2026-10-17, rama fix/tu-pedido-24h desde master 4291425)

Cambio: `app/m/[tableId]/pedido/[orderId]/page.tsx:13`, `hourCycle: "h23"`. Es el ÚNICO formateador de hora de /m
(búsqueda de `DateTimeFormat`, `toLocaleTimeString`, `toLocaleString` y `toLocaleDateString` en `app/m` y
`components/client`). El estado de "Tu pedido" se actualiza por sondeo; la hora la arma el servidor y no se re-formatea.

| Archivo | Resultado |
|---|---|
| `tu-pedido-24h-check-salida.txt` | 3/3 OK: pedido llevado a las 15:xx de Argentina; HTML del servidor, navegador al cargar y después del sondeo (pasó a "en preparación"): "Hecho a las 15:09" |
| `qr-flujo-salida.txt` (`qr-flujo-e2e.mjs`, copia del e2e de QA con Chrome instalado) | 30/30 OK: carta por QR, pedir, "Tu pedido" con sondeo, llamar al mozo, límite 10/10 min, QR del admin y vistas de staff |
| `mock-e2e-salida.txt` (`scripts/mock-supabase/e2e.mjs`) | 58/58 OK |
| `tsc-eslint-salida.txt` | tsc exit 0; eslint exit 0 |

Build de producción contra el mock (3421) y la app (3422), ya parados.
