# STACK de MenuSky

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
| next | 16.3.8 (antes 16.3.1; actualizado por vulnerabilidad crítica, rama fix/next-security) | framework, App Router |
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
| eslint | 9.39.5 + `eslint-config-next` 16.3.8 | lint (`eslint.config.mjs`) |

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
  También `sharp`, `undici`, `qs`. **RESUELTO** (2026-09-30, commit b45a429, rama
  `fix/next-security`, integrada en `feat/landing-page`): next/eslint-config-next 16.3.8
  y `npm audit fix` sin `--force` -> `found 0 vulnerabilities`. Seguridad: Apto. QA: Aprobado.
- `npm install` avisa que `unrs-resolver` tiene un postinstall no aprobado en `allowScripts`.

## Arquitectura de la landing (`/`) — decisión del Líder Técnico (2026-09-30)

Spec: `docs/specs/landing.md` v1.0. Créditos de imágenes: `docs/CREDITS.md`.

### Ubicación de archivos

| Qué | Dónde | Notas |
|---|---|---|
| Página | `app/(landing)/page.tsx` | Route group: no cambia la URL (`/`). **Borrar `app/page.tsx`** (dos `page` para `/` es error de build). Server Component, prerenderizado estático (○ en el build). |
| Layout de la landing | `app/(landing)/layout.tsx` | Solo para la landing: importa `landing.css` y, si se usa, la fuente display. No repite `<html>`/`<body>` (eso queda en el layout raíz). |
| Estilos y tokens de marca | `app/(landing)/landing.css` | Variables CSS de la paleta MenuSky con prefijo `--ms-*` y bajo un contenedor `.ms-landing`. **No tocar** los tokens globales de `app/globals.css` (los usan la carta del cliente y los paneles). |
| Componentes | `components/landing/` (`Header`, `Hero`, `Benefits`, `HowItWorks`, `Features`, `TeamPanels`, `Customize`, `Faq`, `FinalCta`, `Footer`, `brand/Logo`, `mockups/*`, `hero3d/*`, `Reveal`) | Server Components por defecto; `"use client"` solo en islas que lo necesiten (3D, Reveal, FAQ si no se usa `<details>`). |
| Constantes de contacto | `components/landing/contact.ts` | URLs exactas de WhatsApp y mailto de la spec (CA-2.1, CA-2.3). Única fuente: no repetir las URLs a mano. |
| Fotos | `public/landing/*.webp` | Convertidas desde las URLs de `docs/CREDITS.md`. Se commitean solo los WebP finales, no los JPEG originales. |
| Script de optimización (opcional) | `scripts/optimize-landing-images.mjs` | Usa `sharp` (ya instalado como dependencia de next). |
| Favicon e ícono | `app/icon.svg` (+ `app/apple-icon.png` 180x180) y reemplazar `app/favicon.ico` | Convención de archivos de metadata de Next. |
| Imagen social | `app/opengraph-image.png` y `app/twitter-image.png` (1200x630, estáticas) | Archivo estático, NO `ImageResponse`/`next/og` en runtime (menos superficie; ese módulo tuvo la RCE). |
| robots y sitemap | `app/robots.ts`, `app/sitemap.ts` | CA-6.8 (decisión del Líder, revisable por el Director). |
| Metadata global y `lang` | `app/layout.tsx` | Única edición compartida permitida: `metadataBase` `https://menusky.vercel.app`, título por defecto con MenuSky y `template: "%s | MenuSky"`, descripción, OG/Twitter, `lang="es-AR"`. No tocar `<Toaster>` ni las fuentes existentes. |
| Cabeceras de seguridad | `next.config.ts` (dueño: Backend) | `poweredByHeader: false` y cabeceras básicas sin CSP de scripts (ver abajo). |

Fuera de límites para la landing: `app/m/**`, `app/kitchen`, `app/floor`, `app/admin/**`,
`app/login`, `app/api/**`, `components/{client,kitchen,floor,admin,auth,ui}/**`, `lib/**`,
`proxy.ts`, `supabase/**`. La landing NO importa nada de `lib/supabase` ni llama a `/api`.

### 3D

- **Librería: `three` (vanilla) 0.186.1 + `@types/three` 0.186.0 (dev).** Sin peer deps;
  compatible con cualquier React. Se usa desde un Client Component con `useEffect`.
- **NO** `@react-three/fiber` (9.8.1, peer `react >=19 <19.4`: compatible, pero suma el
  reconciliador y su estado, innecesario para una sola escena) **ni** `@react-three/drei`
  (10.7.9, muchas dependencias transitivas). Si el Frontend demuestra que los necesita,
  lo pide al Líder con el peso medido.
- **Geometría procedural** (cilindros, esferas, planos deformados, materiales simples):
  sin modelos GLTF, texturas ni recursos externos (RNF-S5) y peso mínimo.
- **Carga diferida y progresiva** (CA-8.3, 9.3, 9.4):
  1. El hero se renderiza en el servidor con una **ilustración estática (SVG/CSS)** que es a
     la vez el fallback de reduced-motion, sin-WebGL y sin-JS. El LCP es el h1 o esa ilustración.
  2. Un componente cliente pequeño (`hero3d/Hero3DLoader`) decide si sube a WebGL:
     no carga si `prefers-reduced-motion: reduce`, si no hay WebGL o si `navigator.connection.saveData`.
     Si corresponde, espera `load` + `requestIdleCallback` (con timeout) y hace
     `import("./scene")` (chunk separado; `three` nunca entra en el JS inicial).
  3. Prohibido detectar Lighthouse o bots para esconder el 3D: la medición tiene que ser honesta.
- **Rendimiento en ejecución**: `devicePixelRatio` limitado (<= 1.5 en móvil, <= 2 en escritorio),
  `antialias` solo en escritorio, render solo cuando el canvas está visible (IntersectionObserver)
  y la pestaña está activa (`visibilitychange`), medición de tiempo por frame que degrada
  la calidad o vuelve al fallback si no se sostiene, `dispose()` de geometrías, materiales y
  renderer al desmontar.
- **Interacción**: el canvas tiene `aria-hidden="true"`, `pointer-events: none` y nunca tapa
  los CTA; el movimiento del puntero se escucha en `window`. En móvil: reacción al scroll o
  animación suave continua; **sin** pedir permiso de giroscopio.

### Animaciones

- **Sin librería de animación**: CSS (transiciones/keyframes, `tw-animate-css` ya instalado) +
  un Client Component `Reveal` con IntersectionObserver para entradas por sección.
  `motion` (13.4.6, compatible con React 19) y `gsap` (3.15.0) existen pero no se aprueban por
  defecto: suman JS al bundle inicial. Si hacen falta, se piden al Líder con el peso medido.
- El contenido debe estar **visible sin JS**: el estado oculto inicial lo aplica el script, no el
  CSS por defecto (CA-8.7, RNF-K2).
- Solo se animan `transform` y `opacity` (sin reflujo; CLS <= 0,1).
- `@media (prefers-reduced-motion: reduce)`: sin entradas, sin loops, sin parallax, scroll a
  anclas instantáneo.

### Tipografía

Geist (ya cargada en el layout raíz). Se permite **una** fuente display adicional de
`next/font/google` (variable, subset `latin`) solo en `app/(landing)/layout.tsx`, si se
verifica que existe y su peso se justifica en el informe.

### Presupuesto de rendimiento (spec HU-9, criterio de bloqueo)

- Lighthouse móvil (mediana de 3) sobre `npm run build && npm run start` local:
  Rendimiento >= 90, LCP <= 2,5 s, CLS <= 0,1, TBT <= 200 ms.
- Primera carga <= 1 MB transferidos. Objetivo interno: JS inicial de `/` (sin el chunk 3D)
  <= 170 KB gzip; chunk 3D medido y reportado.
- Imágenes: WebP, `next/image` con `sizes` correctos, `priority` solo para la imagen LCP si la hay,
  `loading="lazy"` debajo del pliegue.

### Modo oscuro

La app activa el modo oscuro con la clase `.dark` (`@custom-variant dark (&:is(.dark *))` en
`app/globals.css`), no con `prefers-color-scheme`. La landing no usa la clase `.dark` ni
variantes `dark:`; tiene un único aspecto (CA-8.12).

### Cabeceras HTTP (Backend, `next.config.ts`)

`poweredByHeader: false`; para todas las rutas: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y
`Content-Security-Policy: frame-ancestors 'none'`, `Permissions-Policy` que deshabilite
`camera`, `microphone`, `geolocation`, `payment`. No se agrega CSP de `script-src` en esta fase
(Next inyecta scripts inline; requiere nonces y es un cambio aparte). HSTS lo pone Vercel en
`*.vercel.app`.

### Ramas

- `feat/landing-page`: landing (Frontend) y docs.
- `chore/security-headers` (desde `feat/landing-page`): cabeceras (Backend); se integra en
  `feat/landing-page` y se audita junto con la landing.
- Nada se integra en `master` sin Seguridad Apto, QA Aprobado y autorización del Director.
