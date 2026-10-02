# Estado del frente LOGIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico del frente login. Se actualiza y se commitea ANTES de
cada delegación y después de cada paso verificado.

- Worktree: `C:\Users\Windows10\Desktop\menusky-login`, rama `feat/login-redesign`
  (desde `feat/landing-page` @ efbbfd5). Sin push, sin merge.
- NO tocar `C:\Users\Windows10\Desktop\menusky` (otro Líder cierra el QA de la landing ahí).
- Puertos: 3000 y 53659 ocupados por otros procesos (no tocar). Este frente usa 3200+.
- Env ficticias (ver docs/ESTADO.md, "Reglas operativas"): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3200`.

Última actualización: 2026-10-02. **Paso actual: 1 (spec del PO).**

| Paso | Estado | Evidencia |
|---|---|---|
| 0. Docs previos (ESTADO-LOGIN, sección login en STACK.md) | HECHO | este commit |
| 1. Spec `docs/specs/login.md` (product-owner) | EN CURSO | |
| 2. 3 propuestas de mascota SVG + dirección visual + borrador (frontend) | PENDIENTE | |
| 3. Informe al Director (punto de aprobación: mascota + preguntas) | PENDIENTE | |
| 4. Construcción final, Seguridad, QA | BLOQUEADO hasta aprobación del Director | |
