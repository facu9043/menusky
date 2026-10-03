# Prueba de politicas RLS (migracion 0004) sin base real

Usa un Postgres embebido (`@electric-sql/pglite`, solo en este directorio; la app no lo usa).
Aplica `0001..0003`, el seed, datos de 2 restaurantes y los 6 actores (anonimo, waiter, kitchen,
admin A, admin B, autenticado sin staff), aplica `0004` y corre la matriz de HU-1 y HU-2.
Tambien prueba la reversa y que reaplicar 0004 deja el mismo estado.

```
cd supabase/tests/rls
npm install
npm test            # o: node run.mjs
node run.mjs | tee ../../../docs/evidencia/backend/rls-2026-10-03.txt
```

Sale con codigo 0 si todo pasa y 1 si algo falla. Tarda unos segundos.

Stubs: `auth.uid()` lee `request.jwt.claim.sub`; roles `anon` y `authenticated`; esquema `storage`
(tablas `buckets` y `objects`); publicacion `supabase_realtime`. Los privilegios por defecto de
Supabase se imitan con `alter default privileges`.

**Pendiente de confirmar en la base real** (no se puede reproducir aqui): Realtime con RLS,
Storage real, grants por defecto reales de Supabase y los codigos HTTP de PostgREST.
