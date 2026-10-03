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

3. **Pedidos falsos en masa:** hoy alguien con la clave pública podría llenar la cocina de pedidos inventados. Después
   de la migración **cada mesa admite como máximo 10 pedidos cada 10 minutos**; el pedido 11 se rechaza y el cliente ve
   "Recibimos muchos pedidos de esta mesa. Esperá unos minutos o llamá al mozo.". Un cliente real nunca llega a ese tope.
4. **Fotos:** el bucket de fotos pasa a aceptar solo JPG, PNG, WEBP y GIF de hasta 5 MB (hasta ahora el límite solo
   estaba en la pantalla). Es un ajuste de configuración del bucket, no toca datos.

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
| 10 | **Obligatoria** (SQL Editor) | "Mozo intenta cambiar un precio": ver el bloque 1 abajo | Devuelve **0 filas** y no cambia nada (se deshace sola) |
| 11 | **Obligatoria** (SQL Editor) | "Con la clave pública no se leen pedidos": ver el bloque 2 abajo | Devuelve **0** |
| 12 | **Obligatoria** (navegador o terminal) | Con la clave pública (anon key), pedir `/rest/v1/orders?select=id` | Lista vacía `[]`; y un insert directo da error de permisos |
| 13 | Cliente en una mesa DE PRUEBA | Hacer 11 pedidos seguidos (ver abajo) | Los 10 primeros pasan; el 11 muestra el cartel de "muchos pedidos" |

### Bloque 1: el mozo no puede cambiar un precio (paso 10)

Reemplazar `<AUTH_USER_ID_DEL_MOZO>` por el `id` del usuario mozo de prueba (Supabase > Authentication > Users) y
`<ID_DE_UN_PLATO>` por el id de cualquier plato (Table Editor > `menu_items`). Todo queda dentro de una transacción que
termina en `rollback`: **no cambia nada aunque funcione mal**.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<AUTH_USER_ID_DEL_MOZO>","role":"authenticated"}', true);
update menu_items set price = price + 1 where id = '<ID_DE_UN_PLATO>' returning id;
rollback;
```

Resultado esperado: **"Success. No rows returned"** (0 filas). Si devuelve una fila con el id del plato, la migración NO
quedó bien aplicada: avisar al Líder y no seguir. Repetir con el `auth_user_id` del usuario de **cocina** (mismo resultado).
Y como control, con el usuario **admin** el mismo bloque debe devolver 1 fila (el `rollback` final deshace el cambio).

### Bloque 2: sin sesión no se leen pedidos (paso 11)

```sql
begin;
set local role anon;
select count(*) from orders;
rollback;
```

Resultado esperado: `0`, aunque haya pedidos en la tabla.

### Paso 12: con la clave pública

Con la anon key del proyecto (Project Settings > API), en una terminal:

```
curl "https://<ref>.supabase.co/rest/v1/orders?select=id" -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Debe devolver `[]`. Es obligatoria: confirma que lo que pasó en la prueba automática también pasa en la base real.

### Paso 13: el límite de pedidos por mesa

Usar una mesa de prueba (no una mesa con clientes): abrir `/m/<mesa-de-prueba>`, pedir un plato barato y repetir
11 veces seguidas. Los primeros 10 llegan a "Tu pedido"; el 11 muestra "Recibimos muchos pedidos de esta mesa. Esperá
unos minutos o llamá al mozo." Después de 10 minutos vuelve a funcionar. Cancelar los pedidos de prueba en `/kitchen`
(los cancelados también cuentan para el límite, así que hay que esperar los 10 minutos para volver a probar).
Si en un servicio real una mesa legítima llegara al tope, esperar unos minutos o llamar al mozo; el tope se puede
cambiar editando `c_rate_max` y `c_rate_window` al principio de la función `create_order` (pedir al Líder).

## Si algo falla: cómo volver atrás

1. Abrir el **SQL Editor** y correr TODO el contenido de `supabase/rollback/0004_role_policies_down.sql`.
2. Eso restituye las reglas anteriores (y borra las 3 funciones). **No toca datos.**
3. Avisar al Líder. Ojo: volver atrás reabre los dos agujeros de seguridad; es solo para salir del paso mientras se
   corrige.

El código nuevo funciona con la base vieja (modo compatibilidad), así que volver atrás la base no obliga a volver
atrás el código.

## Qué hacer si ...

- **Después de aplicar, los clientes ven "No se pudo crear el pedido"**, o la prueba 12 falla de forma rara: PostgREST (la
  API de Supabase) guarda una copia del esquema y a veces tarda en enterarse de las funciones nuevas. Correr en el
  SQL Editor: `notify pgrst, 'reload schema';` (la migración y la reversa ya lo hacen al final, pero no cuesta repetirlo).
  Mientras la copia está vieja el sitio usa el modo compatibilidad, que la base nueva bloquea; por eso el cliente ve el error.

- **Los clientes ven "No se pudo crear el pedido"** después de aplicar: casi seguro el código nuevo no está desplegado
  (falta el paso 1) o la migración quedó a medias. Correr de nuevo el archivo 0004 completo; si sigue, aplicar la reversa
  y avisar al Líder.
- **"Tu pedido" muestra 404 a un cliente real**: el link tiene que ser el que se abre tras pedir
  (`/m/<mesa>/pedido/<id>`). Un link armado a mano con otra mesa da 404 a propósito.
- **El mozo o cocina no ven los pedidos nuevos**: confirmar que su usuario tiene fila en `staff_users` del mismo
  restaurante. Sin esa fila la base no les muestra pedidos (comportamiento esperado).
- **El estado de "Tu pedido" tarda en cambiar**: normal hasta ~3 segundos; si pasa de 5 segundos, avisar al Líder.

## Qué quedó pendiente de confirmar en la base real

La prueba automática (ver `supabase/tests/rls/README.md`) corre las reglas en un Postgres embebido y pasa 131 de 131
casos, pero no puede reproducir: (a) Realtime con permisos (que el personal siga recibiendo los pedidos en vivo y el
anónimo no), (b) el Storage real de las fotos, (c) los permisos por defecto reales de Supabase. Los pasos 2, 3 y 7 de la
prueba de humo los cubren: **si alguno falla en la base real, avisar antes de seguir.**
