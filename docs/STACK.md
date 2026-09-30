# STACK de MenuSky (repo "carta-digital")

Documento mantenido por el Líder Técnico. Describe el stack REAL del proyecto,
verificado con evidencia. Todo agente debe leerlo antes de empezar.

Última verificación: 2026-09-30, rama `feat/landing-page` (desde `master` @ f05045d).

## Resumen

Carta digital + pedidos por QR para restaurantes. Un único proyecto Next.js sirve
la vista del cliente (`/m/[tableId]`) y los paneles de staff (cocina, salón,
admin). Datos, auth y tiempo real en Supabase. Despliegue en Vercel
(https://menusky.vercel.app/).

## Versiones instaladas (evidencia: `npm ls --depth=0` tras `npm install`)

| Pieza | Versión | Uso |
|---|---|---|
| Node.js (local) | 24.19.0 (README pide 20+) | runtime |
| npm | 11.17.0 | gestor de paquetes (hay `package-lock.json`) |
| next | 16.3.1 | framework, App Router |
| react / react-dom | 19.2.8 | UI |
| typescript | 5.9.3 | `strict: true`, alias `@/*` -> raíz |
| tailwindcss | 4.3.3 (+ `@tailwindcss/postcss`) | estilos; config en CSS (`app/globals.css`, `@theme inline`), sin `tailwind.config` |
| shadcn | 4.18.0 | componentes en `components/ui`, estilo `base-nova`, baseColor `neutral`, CSS variables (`components.json`) |
| @base-ui/react | 1.7.0 | primitivas headless que usa shadcn base-nova |
| lucide-react | 1.31.0 | íconos |
| tw-animate-css | ^1.4.0 | animaciones utilitarias |
| sonner | ^2.0.8 | toasts (`<Toaster>` en `app/layout.tsx`) |
| next-themes | ^0.4.6 | solo lo usa `components/ui/sonner.tsx` |
| @supabase/ssr | 0.12.4 | clientes server/browser y refresco de sesión |
| @supabase/supabase-js | 2.112.3 | cliente Supabase |
| qrcode | ^1.5.4 | QR por mesa (`lib/qr.ts`, `app/api/qr/[qrToken]`) |
| eslint | 9.39.5 + `eslint-config-next` 16.3.1 | lint (`eslint.config.mjs`) |

Fuentes: `next/font/google` con Geist y Geist Mono (`app/layout.tsx`).

## Arquitectura

- **App Router** (`app/`):
  - `/` -> `app/page.tsx` (HOY: plantilla por defecto de create-next-app).
  - `/m/[tableId]` y `/m/[tableId]/pedido/[orderId]` -> vista pública del cliente (carta, carrito, estado del pedido). `tableId` es el `qr_token` de la mesa.
  - `/login` -> login de staff (no hay registro público).
  - `/kitchen`, `/floor`, `/admin` (+ `menu`, `menu/[itemId]`, `mesas`, `apariencia`) -> paneles de staff.
  - `app/api/orders`, `app/api/waiter-calls`, `app/api/qr/[qrToken]` -> route handlers.
- **Proxy** (Next 16 renombró Middleware a Proxy): `proxy.ts` en la raíz, llama a `updateSession` de `lib/supabase/middleware.ts`. Matcher: solo `/kitchen`, `/floor`, `/admin`. `/` y `/m/*` son públicas.
- **Datos**: Supabase (PostgreSQL + RLS + Auth + Realtime + Storage). Esquema en `supabase/migrations/0001..0003`, seed de prueba en `supabase/seed.sql` (restaurante ficticio "El Buen Sabor"). Tablas: restaurants, tables, categories, menu_items, item_option_groups, item_option_choices, staff_users, orders, order_items, waiter_calls.
- **Lógica**: `lib/` por dominio (admin, orders, realtime, theme, cart, supabase, etc.).
- **Temas**: paleta por restaurante (`lib/theme/*`, columna `restaurants.theme`, editor en `/admin/apariencia`). Es la marca de cada restaurante, no de MenuSky.

## Variables de entorno (ver `.env.local.example`, nunca commitear `.env*`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (solo server). `.gitignore` excluye `.env*` salvo el ejemplo.

## Reglas para trabajar en este repo

1. **Next.js 16 tiene cambios incompatibles** (ver `AGENTS.md`). Antes de escribir
   código, leer la guía pertinente en `node_modules/next/dist/docs/` (requiere
   `npm install`). Ej.: `01-app/01-getting-started/16-proxy.md`,
   `14-metadata-and-og-images.md`, `12-images.md`, `13-fonts.md`.
2. `PageProps<"/ruta">` y `LayoutProps<"/ruta">` son tipos globales generados por
   Next (typegen al hacer `next dev`/`next build`). `npx tsc --noEmit` sin esos
   tipos generados da errores TS2304 falsos; verificar tipos con `npm run build`
   o tras correr `next dev`.
3. Estilos: Tailwind 4 + variables CSS de `app/globals.css`; componentes base en
   `components/ui` (shadcn). No agregar otra librería de UI sin aprobación del Líder.
4. `next dev` puede reescribir `AGENTS.md`; no es un cambio a revisar.

## Estado de calidad al inicio (línea base, antes de la landing)

- `npx eslint .`: 3 errores preexistentes `react-hooks/set-state-in-effect` en
  `components/client/CallWaiterButton.tsx`, `components/client/CartFab.tsx` y
  `lib/animation/useAnimatedNumber.ts`. No son de la landing.
- `npm audit`: 9 vulnerabilidades (3 moderate, 5 high, 1 critical). La critical es
  de `next` (GHSA-vcvr-r3jv-pc5j, RCE en `next/og` ImageResponse; fix en next@16.3.8).
  También `sharp`, `undici`, `qs`. Pendiente de decisión (ver riesgos del informe).
- `npm install` avisa que `unrs-resolver` tiene un postinstall no aprobado en `allowScripts`.

## Decisiones de la landing (fase 1)

Pendientes de las respuestas del Director a `docs/specs/landing.md`. Se completará
aquí la arquitectura de la landing (componentes, assets, metadata/SEO) una vez aprobadas las specs.
