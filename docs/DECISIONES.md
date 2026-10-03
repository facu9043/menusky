# Decisiones técnicas (registro del Líder Técnico)

Regla 14 de CLAUDE.md: las decisiones de producto o visibles son del Director; las técnicas
las toma el Líder y se registran acá con fecha y motivo. Las anteriores a este archivo están
en docs/STACK.md, docs/ESTADO.md y docs/ESTADO-LOGIN.md.

| # | Fecha | Decisión | Motivo | Fase |
|---|---|---|---|---|
| D-1 | 2026-10-03 | Puertos de la fase Admin: Backend 3400-3419, Frontend 3420-3449, Seguridad 3450-3469, QA 3470-3489, Líder 3490-3499. El 3500 es del `next dev` del Director (no tocar); 3000, 3100, 3300 y 4317 son de otros. | Regla 13: rangos sin choques entre agentes y con la sesión principal. | Admin |
| D-2 | 2026-10-03 | No hay Docker ni Postgres en este equipo (`which docker supabase psql postgres`: sin resultado). Las políticas RLS se prueban con un Postgres embebido (PGlite u otro equivalente, instalado fuera de `package.json`) con stubs mínimos de `auth`, `storage` y la publicación de realtime. | Verificar la migración sin base real; nunca credenciales reales. | Admin |
