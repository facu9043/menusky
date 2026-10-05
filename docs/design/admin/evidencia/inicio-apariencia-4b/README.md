# Evidencia del paso 4b: Inicio, Apariencia y estados (HU-9, HU-10, HU-11)

Scripts de prueba del Frontend; no son parte de la app. Mismo montaje que `../carta-4a/README.md`
(Playwright + @axe-core/playwright en `TOOLS_DIR`, fuera del repo; verificado con playwright 1.63.0 y
@axe-core/playwright 4.13.0) y el proxy `../carta-4a/fault-proxy.mjs`, que en este paso suma
`calls` (falla la instantánea en vivo), `theme` (falla la lectura del tema) y `delay` (demora las
lecturas para ver los esqueletos).

## Levantar (puertos del Frontend 3420-3449)
```
node scripts/mock-supabase/server.mjs --port 3422
node docs/design/admin/evidencia/carta-4a/fault-proxy.mjs 3421 3422
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3420
npx next build && npx next start -H 127.0.0.1 -p 3420
export TOOLS_DIR=<tools> APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421
```

## Correr (cada script reinicia el mock: usar uno propio)
```
node docs/design/admin/evidencia/inicio-apariencia-4b/e2e-4b.mjs     > .../e2e-4b-salida.txt
node docs/design/admin/evidencia/inicio-apariencia-4b/quality-4b.mjs > .../quality-4b-salida.txt
node docs/design/admin/evidencia/inicio-apariencia-4b/captures.mjs   > .../captures-salida.txt
```
Los estados vacíos usan el restaurante B (`admin-b@demo.test`) vaciado DENTRO de la prueba con las
mismas escrituras de su admin (`lib4b.mjs`, `emptyRestaurantB`); el mock no cambia y se reinicia al final.

## Resultados (build de producción, 2026-10-05)
| Archivo | Resultado |
|---|---|
| `e2e-4b-salida.txt` | 74 OK / 0 FAIL: Inicio (datos, en vivo con pedido/llamado/atendido del mock, sin stock desde la Carta, enlaces y accesos con `?filtro=`, `?imprimir=`, `?nueva=`, `?nuevo=plato`, valores desconocidos, error parcial y total con Reintentar), vacíos, Apariencia (tema, Aplicando..., paleta, selector, hex inválido, contraste, restablecer, error al guardar, guardar, error de carga), celular. |
| `quality-4b-salida.txt` | 47 OK / 0 FAIL: axe 0 violaciones en 34 pasadas (17 pantallas/estados x 1440 y 360), sin scroll horizontal a 320/360/390/768/1440, teclado y foco, reduced-motion. |
| `axe-previas-salida.txt` | La primera corrida (4 FAIL de contraste dentro de las muestras de los temas) y su arreglo. |
| `captures-salida.txt` | 34 capturas `inicio-*`, `apariencia-*`, `estado-*` en `docs/design/admin/capturas/` (1440x900 y 390x844). |
| `regresion-carta-e2e-salida.txt` | Carta 128 OK / 0 FAIL. |
| `regresion-carta-quality-salida.txt` | Carta quality 22 OK / 0 FAIL. |
| `regresion-mesas-e2e-salida.txt` | Mesas 65 OK / 0 FAIL. |
| `tsc-salida.txt`, `eslint-salida.txt` | `npx tsc --noEmit` exit 0; eslint de lo tocado exit 0. |

Qué cubre: Chrome headless (con emulación táctil en celular) contra el mock. Qué NO cubre: Safari/Firefox,
celulares reales, lector de pantalla real, un Supabase real ni rendimiento (PC de 16 GB, ver ESTADO-ADMIN).
Las capturas de "cargando" se toman con las lecturas demoradas 4-5 s por el proxy (navegación del cliente).
