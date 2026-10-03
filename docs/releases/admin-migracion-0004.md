# Cómo aplicar la migración 0004 (permisos por rol y pedidos protegidos)

Para: el Director. Escrito por Backend; lo revisa el Líder. Lenguaje simple, sin jerga.

## Qué cambia (en pocas palabras)

Hoy hay dos agujeros que Seguridad encontró (SEC-LG-06 y SEC-LG-07):

1. **La carta:** un mozo o un cocinero con sesión iniciada podría, con conocimientos técnicos, cambiar precios,
   ocultar platos o borrar categorías. Después de la migración **solo el admin** puede tocar la carta.
2. **Los pedidos:** hoy cualquiera con la clave pública del sitio podría ver los pedidos de todos los
   restaurantes (con las notas de los clientes) o inventar pedidos con el total que quiera. Después de la
   migración **nadie** puede hacer eso: los pedidos se crean solo a través del sitio (que calcula el total en la
   base de datos) y solo los ve el personal de cada restaurante.

Lo que NO cambia: la lectura pública de la carta (los clientes ven el menú igual), los llamados al mozo, las mesas,
el personal, las fotos de los platos y lo que hace cada rol hoy en cocina y salón (cambiar estados, atender llamados).

Lo que notan los clientes: nada, salvo que en "Tu pedido" el estado se actualiza hasta ~3 segundos después de que
cocina lo cambia (antes era instantáneo). Esto ya está decidido (D-4).

La migración **no borra ni modifica ningún dato**: solo cambia reglas y agrega 3 funciones.

## Antes de empezar (5 minutos)

1. **Respaldo.** En Supabase: *Project Settings > Database > Backups* y confirmar que hay un respaldo de hoy
   (o crear uno manual). Si el plan no tiene respaldos automáticos: *Database > Backups > Create backup* o exportar
   desde el SQL Editor las tablas `orders`, `order_items` y `menu_items` a CSV.
2. Elegir un momento tranquilo (la migración tarda menos de 1 segundo, pero conviene que no haya servicio fuerte).
3. Tener a mano 3 cuentas de prueba: una de **admin**, una de **mozo** y una de **cocina**, y el link de una mesa
   (`/m/<código-de-la-mesa>`).

## ORDEN (importante: no cambiarlo)

1. **Desplegar primero el código nuevo.** Ya incluye un "modo compatibilidad" (marcado `TEMP-COMPAT-0004` en el
   código): si la migración todavía no está aplicada, el sitio sigue funcionando como hoy. Esperar a que el
   despliegue termine y probar que se pueden hacer pedidos como siempre.
2. **Aplicar la migración 0004** (pasos abajo).
3. **Prueba de humo** (lista abajo). Tarda 10 minutos.
4. **En una entrega posterior**, cuando todo esté confirmado en producción, el equipo quita el modo
   compatibilidad `TEMP-COMPAT-0004`. No hay apuro: dejarlo puesto no abre nada (con la base nueva queda
   bloqueado).

Si se aplicara la migración ANTES de desplegar el código nuevo, los pedidos de los clientes dejarían de funcionar
hasta desplegar. Por eso el orden.

## Cómo aplicarla

**Opción A: SQL Editor de Supabase (la más simple)**

1. Entrar a Supabase > el proyecto > **SQL Editor** > *New query*.
2. Abrir el archivo `supabase/migrations/0004_role_policies.sql` del repositorio, copiar TODO su contenido y pegarlo.
3. Apretar **Run**. Debe terminar con "Success. No rows returned".
4. Si aparece un error, **no seguir**: copiar el mensaje completo y pasárselo al Líder. (La migración se puede volver a
   correr sin problema: está hecha para eso.)

**Opción B: línea de comandos (si ya usan la CLI de Supabase)**

```
supabase link --project-ref <ref-del-proyecto>
supabase db push
```

Esto aplica las migraciones que falten (0004). Revisar antes con `supabase db diff` o `supabase migration list`.

## Prueba de humo (qué mirar después de aplicarla)

| # | Con quién | Qué hacer | Qué tiene que pasar |
|---|---|---|---|
| 1 | Cliente (sin sesión) | Abrir `/m/<mesa>`, agregar un plato con sus opciones y enviar el pedido | Llega a "Tu pedido" con la hora, los renglones y el total correcto |
| 2 | Cocina | Abrir `/kitchen` | El pedido de la prueba aparece (sin recargar si ya estaba abierta) y suena el aviso |
| 3 | Cocina | Pasarlo a "En preparación" | En el teléfono del cliente cambia el estado en unos 3 segundos |
| 4 | Mozo | Abrir `/floor`; atender un llamado y marcar un pedido listo como entregado | Funciona igual que siempre |
| 5 | Mozo | Abrir `/kitchen` | Lo lleva a `/floor` |
| 6 | Cocina | Abrir `/floor` | Lo lleva a `/kitchen` |
| 7 | Admin | Entrar a `/admin/menu`, cambiar el precio de un plato y volver a dejarlo | Se guarda. Subir una foto también funciona |
| 8 | Cliente | Abrir `/m/<mesa>` | La carta se ve completa, con el precio nuevo y las fotos |
| 9 | Admin | Abrir `/admin/mesas` | Se ven las mesas y los pedidos de hoy |

Prueba extra (opcional, para quien sepa usar el navegador): con la clave pública, intentar leer
`/rest/v1/orders` debe devolver una lista vacía, e intentar insertar un pedido directo debe dar error de permisos.

## Si algo falla: cómo volver atrás

1. Abrir el **SQL Editor** y correr TODO el contenido de `supabase/rollback/0004_role_policies_down.sql`.
2. Eso restituye las reglas anteriores (y borra las 3 funciones). **No toca datos.**
3. Avisar al Líder. Ojo: volver atrás reabre los dos agujeros de seguridad; es solo para salir del paso mientras se
   corrige.

El código nuevo funciona con la base vieja (modo compatibilidad), así que volver atrás la base no obliga a volver
atrás el código.

## Qué hacer si ...

- **Los clientes ven "No se pudo crear el pedido"** después de aplicar: casi seguro el código nuevo no está desplegado
  (falta el paso 1) o la migración quedó a medias. Correr de nuevo el archivo 0004 completo; si sigue, aplicar la reversa
  y avisar al Líder.
- **"Tu pedido" muestra 404 a un cliente real**: el link tiene que ser el que se abre tras pedir
  (`/m/<mesa>/pedido/<id>`). Un link armado a mano con otra mesa da 404 a propósito.
- **El mozo o cocina no ven los pedidos nuevos**: confirmar que su usuario tiene fila en `staff_users` del mismo
  restaurante. Sin esa fila la base no les muestra pedidos (comportamiento esperado).
- **El estado de "Tu pedido" tarda en cambiar**: normal hasta ~3 segundos; si pasa de 5 segundos, avisar al Líder.

## Qué quedó pendiente de confirmar en la base real

La prueba automática (ver `supabase/tests/rls/README.md`) corre las reglas en un Postgres embebido y pasa 117 de 117
casos, pero no puede reproducir: (a) Realtime con permisos (que el personal siga recibiendo los pedidos en vivo y el
anónimo no), (b) el Storage real de las fotos, (c) los permisos por defecto reales de Supabase. Los pasos 2, 3 y 7 de la
prueba de humo los cubren: **si alguno falla en la base real, avisar antes de seguir.**
