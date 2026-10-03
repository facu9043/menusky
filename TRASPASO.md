# Traspaso: MenuSky y el equipo de agentes (al 2026-10-03)

Documento para retomar el trabajo en otra PC, en una conversación nueva de Claude Code.
Primer mensaje sugerido en el chat nuevo: **"Leé TRASPASO.md y seguimos con el admin de MenuSky"**.

## Quién es quién
- **Director:** el usuario. Aprueba requisitos, diseño y salidas a producción.
- **Equipo de 6 agentes** (`~/.claude/agents/`): lider-tecnico (Messi), product-owner (Josh), backend (Drake),
  frontend (Loki), seguridad (Wen) y qa-tester (Gia). Las reglas generales están en `~/.claude/CLAUDE.md`
  (reglas 1 a 17 y "Lecciones aprendidas").
- **La sesión principal** (Claude en el chat) coordina: lanza al lider-tecnico, le pasa las respuestas del Director,
  verifica el estado con git y le muestra los avances al Director en el navegador.

## Proyecto
- Repo MenuSky: GitHub `facu9043/menusky` (Vercel: menusky.vercel.app). Next.js 16.3.8, Supabase y Tailwind 4.
- **Todo el trabajo está en ramas locales: nada se subió a GitHub ni a producción.**
- `menusky.bundle` contiene todas las ramas. Ver LEEME.md para restaurarlo.

| Rama | Contenido | Estado |
|---|---|---|
| `fix/next-security` | Next 16.3.8, npm audit 9 -> 0 | Cerrada (Seguridad: Apto; QA: Aprobado) |
| `chore/security-headers` | Cabeceras HTTP | Integrada en landing |
| `feat/landing-page` | Landing con 3D, paleta de hamburguesa y logo | Seguridad: Apto; QA: Aprobado con reservas |
| `feat/login-redesign` | Login nuevo con la mascota Pomo (pomo de mostaza) | Seguridad: Apto; QA: Aprobado con reservas |
| `feat/admin-redesign` | Rama de integración del admin. Ya tiene integradas `feat/admin-sec` y `feat/admin-brand` | En curso |
| `feat/admin-sec` | Migración 0004 (permisos por rol, pedidos por RPC, límite de pedidos) | Hecha; falta la re-auditoría de Seguridad |
| `feat/admin-brand` | Tokens de marca unificados, tema MenuSky predeterminado | Integrada |
| `feat/admin-ui` | Admin nuevo: shell + Carta (interruptores iOS, hoja de edición) | Casi terminada; últimos commits WIP |

Cadena: master -> landing -> login -> admin-redesign -> admin-ui.

## Estado exacto del admin
Ver `docs/ESTADO-ADMIN.md` en la rama `feat/admin-redesign` (commit 4d27cfe): paso exacto y orden para retomar.
Resumen de lo que falta, en orden:
1. Integrar las correcciones de seguridad be9d6f8 en `feat/admin-redesign`.
2. Cerrar la Carta: pruebas sobre el build de producción, axe en 0 y capturas sin el distintivo de `next dev`.
3. Backend: sumar los pendientes de Cocina y Salón a la conexión en vivo del admin.
4. Frontend: Mesas en vivo, "Imprimir todos", Inicio, Apariencia y estados vacíos con Pomo.
5. Re-auditoría y auditoría final de Seguridad, QA y el informe de release.

## Decisiones del Director pendientes (ninguna frena el trabajo)
1. Defaults de la spec admin: pedidos por día de Argentina; "ocupada" = mesa con un pedido en curso; los llamados no suenan
   en el admin; los restaurantes sin tema elegido pasan al tema MenuSky.
2. "Tu pedido" del cliente se actualiza cada ~3 s en lugar de al instante (por seguridad).
3. Límite de 10 pedidos por mesa cada 10 minutos, con el texto "Recibimos muchos pedidos de esta mesa...".
4. Estilo del tema MenuSky en la carta del cliente: "brutal" (actual) o "sello" (redondeado, como la landing).
5. Diferencias con la maqueta de Carta (panel lateral en escritorio, más campos en la hoja de edición, "Todas" y
   "+ Categoría", buscador en escritorio, Pomo en las confirmaciones).
6. Fotos: un admin de un restaurante puede borrar las fotos de otro (Media, ya existía). ¿Se arregla en esta fase o después?
7. Migración 0004 en la base real: la aplica el Director con `docs/releases/admin-migracion-0004.md`
   (rama feat/admin-sec). ORDEN: primero se publica el código y después se aplica la migración.

Otras pendientes de fases anteriores:
- Medir Lighthouse Performance en la PC nueva (landing y login). Bloquea el release.
- Aprobar que el 3D de la landing cargue con la primera interacción (o que arranque solo).
- Aprobar los textos de la landing. Probar en iPhone/Safari y el link de WhatsApp desde un celular.
- Prueba de originalidad de Pomo (silueta con 3 personas y búsqueda inversa de imagen).
- Autorizar el merge a master y el push a GitHub. Vercel crea despliegues de prueba para ramas que no son master.
- Más adelante: la vista del cliente al elegir y pedir tiene que parecerse a la demo de la landing (pedido del Director).

## Preferencias del Director (importante)
- Habla en español rioplatense. Quiere informes simples, sin jerga.
- La PC vieja (Celeron) era de prueba: **NO limitar animaciones por rendimiento** de esa PC. Sí respetar reduced-motion.
- Antes de construir algo visible, mostrarle una maqueta o propuesta y esperar su ok.
- Pausas: "pausá y guardá" = pausa ordenada (commit de todo, ESTADO al día, servidores parados, informe corto).
  Pidió pausar cuando el uso de 5 horas llegue al 89%. Cuidar también el límite semanal (iba en 54%).
- Mascota: nada de personajes con copyright (descartó a Jake de Hora de Aventura). Pomo es original.

## Cómo levantar las cosas (puertos acordados)
- Equipo: 3400-3499. Servidor del Director para mirar el admin: 3500. Supabase de prueba: 3501. Oficina: 4317.
- Supabase de prueba (sin base real): `node scripts/mock-supabase/server.mjs --port 3501` (en la rama admin-ui).
  Usuarios ficticios en `scripts/mock-supabase/README.md`.
- Admin contra el mock, con `next dev` y variables
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3501`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key` y
  `NEXT_PUBLIC_SITE_URL=http://localhost:3500`; después `npx next dev -p 3500` y entrar a http://localhost:3500/admin/menu.
- Landing y login sin Supabase: variables ficticias `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key`.
- Oficina de agentes: `node ~/.claude/agents/oficina/server.js` y abrir http://localhost:4317 (los hooks están en settings.json).

## Documentos clave en el repo
`docs/STACK.md`, `docs/DECISIONES.md`, `docs/ESTADO*.md`, `docs/PILOTO.md` (todas las fallas del piloto, P-1 a P-13),
`docs/specs/` (landing, login, admin), `docs/design/` (dirección de arte, mascota, boceto aprobado del admin),
`docs/security/`, `docs/qa/` y `docs/releases/`.
