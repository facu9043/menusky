# QA: rediseño de Cocina (`/kitchen`) y Salón (`/floor`) + arreglo de tiempo real

Fecha 2026-10-17. Rama `feat/staff-redesign` @ a075908 (sin cambios de código por QA). Spec `docs/specs/cocina-salon.md` v1.0 (con 11.1), decisiones D-23 y D-24, seguridad `docs/security/cocina-salon-2026-10-17.md` (A Apto, B Apto, SEC-CS-01 cerrado).
Build de producción (`next build` + `next start`, nada de `next dev`) contra mi propio mock (puertos 3470 app, 3471 fault-proxy, 3472 mock). Chrome del sistema vía `channel: "chrome"` (los scripts del Frontend y de QA ya lo usan; los 3 scripts de Backend/Frontend que lanzan `chromium.launch()` sin canal se corrieron en copias `copia-*.mjs` con `executablePath` al `chromium_headless_shell-1243`, sin otro cambio). Todo con datos ficticios del mock. Evidencia: `docs/qa/evidencia/cocina-salon-2026-10-17/`. Capturas: `docs/qa/capturas/cocina-salon/`.

## Veredicto

| Alcance | Veredicto |
|---|---|
| A. Cocina y Salón contra la spec | **Aprobado con reservas** (1 defecto Medio de teclado, QA-CS-01; no bloquea) |
| B. Tiempo real y recarga | **Aprobado** (24/24) |
| C. Redirecciones por rol | **Aprobado** (13/13 + R-2 en e2e) |
| D. Regresión corta (admin, /login, /m con flujo QR, e2e del mock) | **Aprobado** (sin defectos nuevos) |
| **General** | **Aprobado con reservas** |

## Números por suite (una corrida cada una; detalle en los `.txt`)

| Suite | Resultado | Archivo |
|---|---|---|
| A e2e de staff (Frontend) | 53 OK / 0 FAIL | `A-e2e-staff.txt` |
| A calidad de staff, 6 anchos (Frontend; incluye axe) | 136 / 0 | `A-quality-staff.txt` |
| A redirecciones (SEC-CS-01, Frontend) | 13 / 0 | `A-redirect-check.txt` |
| A proporción de Salón y apilado (QA) | 5 / 0 | `A-proporcion-salon.txt` |
| A sondas propias (movimiento con animación, aria-live, casos límite, carga alta, giro) | 31 / 0 (corrida final; ver nota de la corrida 1) | `A-probe-extra.txt` |
| A seguimiento (doble toque real, qué región aria-live, precio largo) | 5 / 0 | `A-probe-seguimiento.txt` |
| A encabezado fijo y foco (QA) | 6 OK / 2 FAIL (QA-CS-01) | `A-probe-sticky.txt` |
| A estático (CA-1.1/1.2, CA-7.1, CA-NR.11) | revisión | `A-estatico.txt` |
| A error de lectura (`error.tsx`) | NO alcanzable (ver "No verificado") | `A-error-intento-NO-ALCANZABLE.txt` |
| B tiempo real tras recarga (QA, 3 rutas x 3 modos x 2 comprobaciones) | 24 / 0 | `B-realtime-recarga.txt` |
| D Carta e2e / Mesas e2e / Inicio+Apariencia e2e | 128/0, 65/0, 74/0 | `D-carta-e2e.txt`, `D-mesas-e2e.txt`, `D-e2e-4b.txt` |
| D SEC-AF-01 (rol admin HTML y RSC) / indicadores en vivo | 42/0, 15/15 | `D-sec-af-01.txt`, `D-live-pending.txt` |
| D flujo QR + SEC-AF-02 (30) + 429 exacto, "Tu pedido" 5 s, descarga QR (6) | 30/30 y 6/6 | `D-qr-sec-af-02.txt`, `D-qr-extra.txt` |
| D e2e del mock (`scripts/mock-supabase/e2e.mjs`) | 58 / 58 | `D-mock-e2e.txt` |
| D toast y sonido en /floor, no en el admin | 4 / 0 | `D-probe-floor-aviso.txt` |
| D regresión fuera del admin (`regresion-fuera-admin`) | 36 OK / 1 FAIL (prueba vieja, ver abajo) | `D-regresion-fuera-admin.txt` |
| D login 01-static / 02-behavior | 29/31 y 110/112 (las 4 conocidas) | `D-login-01-static.txt`, `D-login-02-behavior.txt` |
| D login 03-a11y / 06-responsive / 07-extras | 39/39, 62/62, 11/11 | `D-login-*.txt` |

Notas de las corridas (todo lo no verde está explicado, nada se borró ni debilitó):
- `A-probe-extra-corrida1-3fail.txt` (3 FAIL) eran errores de MI prueba: (1) contaba como región de anuncios al `<section aria-live>` de sonner (el Toaster); (2) buscaba "1.234.567" literal cuando la pantalla muestra el total de la mesa (`$ 11.123.603`); (3) hacía dos `el.click()` en la misma tarea de JS (2 PATCH), que no es un doble toque humano. Se corrigieron las aserciones y el doble toque real se midió aparte: `dblclick` y 3 clics a 30 ms dan 1 PATCH y un solo toast (`A-probe-seguimiento.txt`).
- `A-probe-sticky-corrida2/3.txt`: el barrido se afinó (se excluye el enlace "Saltar al contenido", que solo aparece al enfocarlo y se midió aparte: visible en top 8 px; y se separó "totalmente tapado" de "parcialmente tapado"). El resultado de QA-CS-01 no cambió entre corridas.
- El FAIL de `regresion-fuera-admin` (línea 134) es la misma prueba desactualizada del re-test anterior: el 429 llega en el intento 10 y no en el 9 porque con D-21 los cancelados ya no cuentan. No es defecto; la regla correcta (10 pedidos, el 11 da 429 con el texto exacto) pasa en `D-qr-extra.txt`.
- Las 4 pruebas viejas del login son las ya conocidas (CA-3.8, CA-4.8/2.4 en 01-static y las dos de "waiter" en 02-behavior); mismos mensajes que el informe de admin.

## A. Matriz de criterios de aceptación

Leyenda: **C** = cumple (evidencia), **P** = cumple en parte, **NV** = no verificable aquí. "e2e" = `A-e2e-staff`, "cal" = `A-quality-staff`, "x" = `A-probe-extra`.

| CA | Estado | Evidencia |
|---|---|---|
| 1.1 mismos tokens, Bricolage/Geist, sello, radios | C | Capturas lado a lado con las maquetas (`cocina-1280x800.png`, `salon-1280x800.png`, `cocina-vacia-390x844.png`, `menu-cuenta-390x844.png`, `sin-staff-1280x800.png`) coinciden en paleta, bordes, sombra sello y píldoras; `A-estatico.txt`: 0 HEX sueltos en `staff.css`. Medición de tokens exactos de pixel: no hecha (comparación visual) |
| 1.2 sin `dark`, sin color-mix con accentPrimary, sin Fraunces | C | `A-estatico.txt` (solo aparece `--ms-lettuce-dark`, un token de marca); e2e K.2: sin `.dark` en el DOM |
| 1.3 igual con otro tema | C | e2e S.3: Cocina idéntica byte a byte con otro tema (63713/63713 bytes) |
| 1.4 estado = texto + ícono/forma | C | Capturas de Salón: Libre (círculo punteado), Con pedido (cubiertos), Listo (tilde), Llamando (campana) con texto; "En preparación" con ícono |
| 1.5 body en Geist | C | cal: 0 vistas con otra fuente; `regresion-fuera-admin` D-19 |
| 2.1 shell: logo, local, persona con avatar, rol, "Cerrar sesión" | C | e2e K.4, A.5, A.7, A.8 (cerrar sesión y atrás pide login) |
| 2.2 navegación por rol, `aria-current` | C | e2e K.3, F.1, A.2 (cocina solo "Cocina", mozo solo "Salón", admin 3 enlaces); celular: dentro del menú (11.1), A.4-A.6 |
| 2.3 indicador de pendientes con texto alternativo | C | e2e: "Cocina(hay pendientes)", "Salón(hay pendientes)"; punto en el botón de cuenta en celular |
| 2.4 la navegación no tapa la última tarjeta; área segura | P | x/sticky: con 32 pedidos el botón de la última comanda queda completo a 360x640 y 1280x800 (CA-2.4 C); `padding-bottom` con `env(safe-area-inset-bottom)` en el CSS. **El encabezado fijo SÍ puede tapar el foco de teclado a 360x640 (QA-CS-01)**. Área segura real en iPhone: NV |
| 2.5 NoStaffAccess / NotAdminAccess textos literales | C | e2e S.1, K.21; captura `sin-staff-1280x800.png` |
| 2.6 / C redirecciones por rol | C | ver alcance C |
| 3.1 tamaños (mesa >= 24, renglón >= 20/18, resto >= 16, mínimo 14) | C | cal en los 6 anchos: mesa 24-28, renglón 20 (tablet) / 18 (celular), opciones/nota/hora/cuenta 16, texto mínimo 14 ("Cocina"/"Mozo"), estado de mesa 15 |
| 3.2 botones de 56 px a todo el ancho; otros >= 44; separación >= 12 | C | cal: botón 56 px ancho completo, controles < 44 px: 0, separación entre botones medida |
| 3.3 nada depende de hover | C | el único `:hover` del CSS (`.st-nav__link`, `.st-logout`) es cosmético dentro de media de puntero; toda acción es botón táctil |
| 3.4 columnas: Cocina 3 en tablet horizontal, 2 en 768, 1 en celular; mesas completas | C | cal: Cocina 4/3/3/2/1/1 a 1440/1280/1024/768/390/360; Salón mesas 3/4/2; `A-proporcion-salon.txt`; capturas `salon-768x1024.png`, `salon-390x844.png` |
| 3.5 sin bloquear orientación; el giro conserva estado | C | x: 800x1280 -> 1280x800 conserva comandas y "En preparación" |
| 3.6 acción en proceso: botón deshabilitado, mismos textos | C | e2e K.15-K.19, F.14, F.17, F.18; x/seguimiento: doble toque = 1 PATCH |
| NR.1 Tomar pedido / Marcar listo y toasts | C | e2e K.15-K.18 |
| NR.2 error de actualización | C | e2e K.19 (toast "No se pudo actualizar el pedido", se puede reintentar) |
| NR.3 listos para llevar y "Entregado" (y error) | C | e2e F.12, F.14, F.18 |
| NR.4 llamados, "Cuenta de hoy", "Atendido" (y error) | C | e2e F.4, F.7, F.11, F.17 |
| NR.5 contenido de las tarjetas (con y sin nota) | C | e2e K.8, F.5; casos límite en x |
| NR.6 grilla de mesas con prioridad y cambia sola | C | e2e F.3, F.10 |
| NR.7 sonido y toast como hoy; no suena al cargar | C | e2e K.5, K.11, K.13, F.6, F.8, F.15; `D-probe-floor-aviso.txt` (en /floor 1 aviso y toast, en el admin 0) |
| NR.8 <= 5 s sin recargar | C | e2e K.9 (168 ms), F.7 (173 ms), F.12; B (8-332 ms) |
| NR.9 Cocina vacía con Pomo y la frase | C | e2e S.4; `cocina-vacia-390x844.png` (Pomo estático, frase grande) |
| NR.10 navegación, redirecciones, cerrar sesión, indicador | C | HU-2 |
| NR.11 el diff respeta el alcance | P | `A-estatico.txt`: sin cambios en `supabase/`, `app/api`, `proxy.ts`, `lib/orders`, `lib/waiterCalls`. Sí tocan `lib/realtime/{startChannel,useOrdersBoard,useStaffPendingCounts,useTableTotals,useWaiterCalls}.ts` y `lib/admin/live/AdminLiveProvider.tsx`: es el arreglo de tiempo real pedido por el Líder (cada hook solo envuelve la suscripción en `startChannel`; diff revisado), fuera de la excepción literal de NR.11, por eso "en parte"; `app/globals.css` (reduced-motion de `.board-card-enter` y `.animate-ping`) |
| 5.1 anuncios en vivo | C | e2e K.12 ("Pedido nuevo: Mesa 3"), F.9 ("Llamado de Mesa 3: Tiene una consulta"), F.13 ("Pedido listo: Mesa 1"); región vacía al cargar (K.5, F.6); `aria-live="polite"` oculta (sr-only) en Cocina (1) y Salón (2). La spec deja a QA confirmar si los llamados deben ser `assertive`: recomendación de QA, **mantener `polite`** (un `assertive` interrumpiría la lectura en un salón con varios llamados seguidos); lector de pantalla real: NV |
| 5.2 "Nuevo" sin depender de color/movimiento | C | e2e K.10 (visible con reduced-motion) |
| 5.3 nombre del botón incluye la mesa | C | e2e K.6 ("Tomar pedido, Mesa N"), F.5 ("Entregado, Mesa 3"), `Atendido, Mesa 2` en el barrido de teclado |
| 5.4 encabezados | C | x: un `h1` y `h2`/`h3` en orden en Salón |
| 5.5 contraste y foco en estados reales | P | axe `color-contrast` en 0 en las 9 vistas x anchos (cal) y 42 vistas (`axe-staff-salida`, Frontend); pares de las maquetas en `docs/design/cocina-salon/maquetas/contraste-salida.txt` (no re-medidos por QA). Botón deshabilitado ("en proceso"): ni axe ni QA lo midieron (dura lo que tarda la acción). Foco: ver QA-CS-01 |
| 5.6 axe 0 serios/críticos | C | cal: 0 en todas las vistas, con tarjetas, vacío y menú de cuenta abierto |
| 6.1 animaciones con transform/opacity, <= 400 ms, sin filter/box-shadow | C | x (con movimiento permitido): `st-in` 280 ms (transform, opacity) y `st-ping` 1,4 s infinita (transform, opacity); 0 animaciones de box-shadow/filter/backdrop-filter; 0 elementos con filter computado |
| 6.2 reduced-motion: 0 animaciones | C | cal "0 animaciones con reduce" en todas las vistas; e2e K.14, K.17, F.16 (tras llegada y acciones) |
| 6.3 bucles infinitos solo el pulso del "nuevo" | C | x: único infinito `st-ping` (1,4 s, < 3 Hz); al tocar "Tomar pedido" se detiene y desaparece "Nuevo" |
| 6.4 se puede tocar durante la animación | C | x (clic con la entrada y el pulso activos) |
| 7.1 sin librería nueva | C | `A-estatico.txt`: `package.json` y lock sin diferencias vs master |
| 7.2 30 pedidos / 20 llamados / 40 mesas | C | x: Cocina con 32 comandas y Salón con 21 llamados y 40 mesas, sin scroll horizontal; el botón cambia de estado en 1,1 ms (<= 100 ms, mock local en este equipo; INP/CPU reales: pendientes en la PC de 16 GB) |
| 7.3 JS no crece más de lo que pese Pomo | NV | no se midió peso antes/después (línea base a medir por el Líder) |
| 8.1 etiqueta "Nuevo" | C | e2e K.10, K.16, F.12; captura |
| 8.2 píldora "En preparación" | C | e2e K.6, K.7, K.16 |
| 8.3 contadores en títulos | C | e2e F.2, F.10, F.11, F.13; x: "Llamados de mozo · 21" |
| 8.4 "Cerrar sesión" con texto >= 1024 y en menú de celular; solo ícono con nombre 768-1023 | C | capturas `cocina-1280x800.png` (texto), `menu-cuenta-390x844.png` (texto), `salon-768x1024.png` (ícono); nombre accesible "Cerrar sesión" en e2e K.4 |
| 8.5 Salón en dos columnas | C | `A-proporcion-salon.txt`: acciones a la izquierda y Mesas a la derecha a 1024/1280/1440 con proporción 1,35:1 (la aprobada por el Director en lugar de 1,55:1); apilado a 768 y 390; mesas en 3 columnas (panel) / 4 (768) / 2 (celular) |
| 8.6 colores de mesa | C | capturas de Salón (verde claro, mostaza clara, cheddar lleno con sombra, tomate lleno); axe sin fallas de contraste |
| 8.7 "Todavía no hay mesas." | C | e2e S.5 |
| 8.8 Pomo solo en Cocina vacía | C | e2e S.2 (sin Pomo en pantalla sin permiso), S.4; Salón y pantallas con tarjetas sin Pomo (capturas) |
| 8.9 textos de estado de mesa | C | e2e F.3 (Con pedido / Llamando / Listo; Libre en capturas) |
| 8.10 shell celular y tablet | C | e2e A.4-A.6; capturas 390, 768, 1280 |
| Textos aprobados de carga y error | P | Literales en el código: "No pudimos cargar los pedidos", "No pudimos cargar el salón", "Puede ser la conexión o un problema del servicio.", "Reintentar", "Cargando los pedidos...", "Cargando el salón..." (`A-estatico`/grep en `app/*/error.tsx` y `StaffStates.tsx`). "Cargando ..." además verificado en el stream del HTML (`A-redirect-check.txt`, 13/13). Los textos de ERROR no se pudieron ver renderizados (ver "No verificado") |
| Casos límite de la spec (sección 6) | C | x: plato de 95 caracteres, nota de 240, etiqueta de mesa de 42, precio de 8 cifras, 50 renglones, a 1440/1280/1024/768/390/360/320 y 720x450 (zoom 200% de 1440): sin scroll horizontal y nada fuera de la tarjeta; el botón sigue alcanzable; capturas `limite-cocina-390x844.png`, `limite-salon-390x844.png`, `carga-salon-1280x800.png` |

## B. Tiempo real y recarga

`B-realtime-recarga.mjs` (QA, nuevo): login, y para cada ruta con tres modos (sin recarga, recarga, reapertura en contexto nuevo con la sesión guardada) a los 2,5 s un evento del mock; comprueba que el cambio se ve en <= 5 s y que TODOS los `phx_join` del websocket llevan `access_token`.

- /kitchen (pedido nuevo visible): 163, 184 y 31 ms. /floor (llamado nuevo, toast o contador): 27, 28 y 28 ms. /floor (pedido listo, contador): 8, 9 y 8 ms. /admin Inicio ("Pedidos de hoy" 4 -> 5): 332, 328 y 328 ms.
- Todos los joins llevan token (3 en Cocina, 4 en Salón, 1 o 2 en el admin). 24/24.
- Control contra master: no levanté un build de master. Cito la evidencia de Backend `docs/evidencia/backend/realtime-recarga-2026-10-15.txt` (master d66b639: 4/6; falla "con recarga" en /kitchen y /floor, `token=NO`; la rama: 6/6) y la del Frontend `docs/design/cocina-salon/evidencia/realtime-recarga-salida.txt`. Mi prueba habría fallado en ese caso (exige token en cada join y entrega en <= 5 s con recarga), pero NO la corrí contra master: es una inferencia, no una observación. Además `D-live-pending.txt` 15/15 confirma que el admin sigue con una sola conexión.
- Límite: en el mock el token no vence. Una tablet abierta más de 1 hora (renovación de token) y el servidor Realtime real no se pudieron verificar (ver abajo).

## C. Redirecciones por rol (`A-redirect-check.txt` 13/13, `A-e2e-staff.txt` K.20, F.19, A.1, A.3)
- Mozo en /kitchen: 307 con `Location: /floor`, sin ver Cocina (también con JS desactivado: "307 /kitchen, 200 /floor"). Cocina en /floor: 307 a /kitchen.
- Sin sesión: 307 a `/login?redirect=...` (también /admin y /admin/*, en `D-regresion-fuera-admin.txt`).
- Admin entra a /kitchen y /floor (200, sin redirección) y ve los tres enlaces; sin fila de staff ve NoStaffAccess; mozo y cocina en /admin ven NotAdminAccess sin datos (`D-sec-af-01.txt` 42/0: HTML y RSC sin datos de la página).
- Los pedidos de navegación (RSC) siguen respondiendo 200 con la redirección dentro del payload (documentado por Frontend y Seguridad, sin datos): no se re-evaluó más allá de `D-sec-af-01`.

## D. Regresión corta
Todo verde (ver tabla de números). Admin: Carta 128/0, Mesas 65/0, Inicio/Apariencia 74/0, rol 42/0, en vivo 15/15. Flujo QR con SEC-AF-02: anónimo sin listar mesas, `/m/{token}` 200, token inexistente 404, pedir, "Tu pedido" (en `D-qr-extra`: 5 s), token de otra mesa 404, llamado al mozo, 429 con el texto exacto, cancelar libera un lugar, QR PNG, 30/30 y 6/6. e2e del mock 58/58. /login: las mismas 4 pruebas viejas y todo lo demás en verde.

## Defectos

### QA-CS-01 El encabezado fijo puede tapar por completo el elemento con foco de teclado en celular
- Severidad: **Media** (criterio de foco visible CA-13.3 del admin, citado por CA-5.5; WCAG 2.2 criterio 2.4.11 nivel AA). **No bloquea** (afecta a quien navega con teclado físico en un teléfono; la operación táctil no se ve afectada).
- Dónde: Cocina (y probablemente Salón, no medido) a 360x640; `.st-head` es `position: sticky; top: 0` (`components/staff/staff.css:25-26`) y no hay `scroll-padding-top` (grep en `app/` y `components/`: 0).
- Pasos: 1) build de producción + mock, entrar como `cocina@demo.test` a `/kitchen` con 30+ pedidos (por ejemplo 30 `new_order` por `/__mock/event`), viewport 360x640 móvil. 2) Con el scroll arriba, recorrer los controles con Tab y luego con Shift+Tab (180 pasos). 3) Mirar la posición del elemento enfocado contra el encabezado.
- Esperado: el elemento enfocado queda siempre visible (CA-13.3 "foco visible"; WCAG 2.4.11: no totalmente oculto).
- Obtenido: 38 de 180 pasos con el foco parcialmente bajo el encabezado (p. ej. "Tomar pedido, Mesa 2": top 26 px, bottom 82 px, encabezado hasta 62 px) y 2 pasos TOTALMENTE tapados ("Tomar pedido, Mesa 3"). A 1280x800: 0 casos.
- Evidencia: `A-probe-sticky.txt` (y `A-probe-sticky-corrida2.txt`, `-corrida3.txt` con el mismo resultado), script `A-probe-sticky.mjs`.
- Arreglo sugerido (para el dueño, no lo hice yo): `scroll-padding-top` en `html` (o `scroll-margin-top`) igual a la altura del encabezado más un margen.
- Dueño: Frontend. No se comparó con master (no se sabe si el encabezado anterior tenía el mismo problema).

No hay otros defectos nuevos. No hay Bloqueantes ni Altos.

## Preexistente / observaciones (no cambian el veredicto)
1. Formato de hora: "01:13 p. m." en 12 h con Chrome es-AR; la maqueta muestra 24 h ("21:02"). El formateador es idéntico al de master (`Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" })`) y la spec dice "es-AR HH:MM"; depende del idioma del navegador. Baja; decisión del Director si quiere 24 h forzadas.
2. Orden de mesas en Salón: "Mesa 10" aparece entre "Mesa 1" y "Mesa 2" (orden alfabético del texto, igual que en master; las mesas llegan ordenadas por la consulta). Baja.
3. `regresion-fuera-admin.mjs` línea 134 desactualizada por D-21 (ya reportado en el re-test del admin): actualizar la aserción a índice 9.
4. Las 4 pruebas viejas del login (CA-3.8 y CA-4.8/2.4 estáticas; dos de "waiter" que esperan `/kitchen` y hoy termina en `/floor`). Ya conocidas.
5. QA-AD-02 (título vacío un instante en el admin, Baja): no apareció en esta pasada (3 suites del admin, 0 FAIL); sigue abierto/no reproducido.
6. `error.tsx` y los textos de error de Cocina y Salón: ver siguiente sección.

## Qué NO se pudo verificar y por qué
- **Estado de error de `/kitchen` y `/floor` renderizado.** Las lecturas de datos no lanzan excepciones (D-12/K-15), así que `error.tsx` no se alcanza sin tocar `lib/`. Intenté cortar el mock con la sesión abierta: la app ya no valida la sesión y redirige a `/login?redirect=...` (200 con el login; `A-error-intento-NO-ALCANZABLE.txt`: los dos FAIL de ese archivo son porque la condición no se produjo, no un defecto). Verificado solo el código: textos literales aprobados, `role="alert"`, sin `error.message` en pantalla, botón con "Reintentando..." durante 4 s. La acción "Reintentar" y su efecto (`retry()` de Next 16.3, confirmado en `node_modules/next/dist/docs/.../error.md`) no se ejercitaron. Para probarlo hay que forzar una excepción en una lectura (tarea de Backend o un build de prueba).
- Tablet real a 1,5 m, lectura de mesa y cantidades a distancia, toque con mano mojada (la prueba con 2 personas que pide la spec): pendiente, la hace el Director.
- Celulares y iPhone reales (área segura, teclado virtual, barra del navegador), giro físico.
- Lector de pantalla real (NVDA/VoiceOver): solo se verificó el texto de las regiones `aria-live` y el DOM; no si se anuncia una vez y sin cortar.
- Base real y Realtime real: el comportamiento de `startChannel` frente a un `access_token` posterior al join y la renovación de token después de 1 hora no se pueden verificar con el mock (su token no vence). Conviene la prueba de humo en un entorno con Supabase real antes de publicar el arreglo.
- Brillo y reflejos del tema claro en una cocina con poca luz (R-3): solo con la tablet en el lugar de uso.
- Rendimiento real (INP, cuadros, CPU) y peso de JS (CA-7.3): PC de 16 GB; el 1,1 ms de CA-7.2 es contra el mock local en este equipo.
- Que mi prueba B falle contra master: inferido, no medido (no se levantó un build de master).
- Pares de contraste de las maquetas no re-medidos por QA (se confía en axe y en el archivo del Frontend); el botón deshabilitado no se midió.

## Riesgos que vi
1. El arreglo de tiempo real solo se probó contra el mock; el comportamiento con Supabase real (token posterior, renovación) queda sin evidencia. Conviene desplegarlo antes o junto con la 0004, como dice Backend.
2. Sin aviso de desconexión (R-1, backlog aceptado): una tablet sin red parece "sin pedidos".
3. El tema claro puede cansar o reflejar en cocinas con poca luz (R-3); validar con la tablet real.
4. El encabezado fijo en celular con teclado externo (QA-CS-01).

## Cómo reproducir
```
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3471 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3470
npx next build
node scripts/mock-supabase/server.mjs --port 3472
node docs/design/admin/evidencia/carta-4a/fault-proxy.mjs 3471 3472
npx next start -H 127.0.0.1 -p 3470
export TOOLS_DIR=<carpeta con playwright y @axe-core/playwright> PW_DIR=$TOOLS_DIR APP_URL=http://127.0.0.1:3470 APP=$APP_URL MOCK_URL=http://127.0.0.1:3471 MOCK=http://127.0.0.1:3472 MSYS_NO_PATHCONV=1
# Frontend (cada script reinicia el mock: de a uno)
node docs/design/cocina-salon/evidencia/e2e-staff.mjs ; node docs/design/cocina-salon/evidencia/quality-staff.mjs ; node docs/design/cocina-salon/evidencia/sec-cs-01/redirect-check.mjs
# QA (este informe)
for s in A-probe-extra A-probe-seguimiento A-probe-sticky A-proporcion-salon B-realtime-recarga; do node docs/qa/evidencia/cocina-salon-2026-10-17/$s.mjs; done
# regresión
node docs/design/admin/evidencia/carta-4a/carta-e2e.mjs ; node docs/design/admin/evidencia/mesas-4a/mesas-e2e.mjs ; node docs/design/admin/evidencia/inicio-apariencia-4b/e2e-4b.mjs
node docs/qa/evidencia/cocina-salon-2026-10-17/copia-sec-af-02-qr-e2e.mjs   # con CHROMIUM_EXE=<chrome-headless-shell 1243>
MOCK_URL=http://127.0.0.1:3472 node scripts/mock-supabase/e2e.mjs
```
Nota: `quality-staff.mjs` sobrescribe las capturas y `axe-staff-salida.txt` del Frontend en `docs/design/cocina-salon/`; QA los restauró con `git checkout` y guardó copias en `docs/qa/capturas/cocina-salon/`. Login: build aparte con `https://example.supabase.co`, `QA_BASE=http://127.0.0.1:3472` y `node docs/qa/scripts/login/0X-*.mjs`.

## Re-verificación QA-CS-01 (2026-10-17)

Rama `feat/staff-redesign` @ a691e01 (arreglo en 640d0d0, merge cc65060; solo `components/staff/staff.css`). Build de producción nuevo + mi mock (3470/3471/3472). Evidencia: `R-probe-sticky.txt`, `R-quality-staff.txt`, `R-netstat-final.txt` en `docs/qa/evidencia/cocina-salon-2026-10-17/`.

- **QA-CS-01: CERRADO.** `A-probe-sticky.mjs` (misma sonda; solo le agregué los anchos 390x844 y 768x1024 a la lista) con 32 pedidos, 180 pasos de Tab y Shift+Tab por ancho: **0 pasos con el foco tapado** a 360x640, 390x844, 768x1024 y 1280x800 (antes: 38 parciales y 2 totales a 360x640). Salida 16 OK / 0 FAIL, incluidos WCAG 2.4.11 (nada totalmente tapado) y 2.4.12 (nada tapado).
- **CA-2.4:** al final del scroll el botón de la última comanda se ve completo en los 4 anchos (por ejemplo 360x640: top 510, bottom 566 de 640; 390x844: 714-770 de 844; 768x1024: 894-950 de 1024). El enlace "Saltar al contenido" se hace visible al enfocarlo (top 8 px).
- **Regresión:** `quality-staff.mjs` (9 estados, 6 anchos, incluye axe en /kitchen y /floor a 360 y 1024): **136 OK / 0 FAIL**, igual que antes. La sonda sobrescribe las capturas y `axe-staff-salida.txt` del Frontend; los restauré con `git checkout`. No se repitió el resto de las suites (alcance acotado).
- **Veredicto actualizado: Aprobado** (alcances A, B, C y D; sin defectos abiertos nuevos de esta fase). Siguen igual los pendientes de "Qué NO se pudo verificar" (tablet real, celulares, lector de pantalla, base real, estado de error renderizado) y lo preexistente listado arriba.
