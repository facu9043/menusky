# Lighthouse de la landing (CA-9.1 / CA-9.2), 2026-10-03

Qué cubre: solo la portada `/`, Lighthouse 12.8.2 en modo móvil por defecto (simulado, CPU 4x), sobre
`next build` + `next start -H 127.0.0.1 -p 3500` de `feat/landing-page` @ f24c8af, con variables de Supabase
ficticias. Chrome headless. PC: AMD Ryzen 5 5600G, 15 GB de RAM (benchmarkIndex 3276).
Qué no cubre: la URL publicada, celulares reales, escritorio, otras rutas, Safari.

| Corrida | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS | FCP |
|---|---|---|---|---|---|---|---|---|
| 1 | 78 | 100 | 100 | 100 | 3,30 s | 580 ms | 0 | 1,07 s |
| 2 | 80 | 100 | 100 | 100 | 3,27 s | 493 ms | 0 | 1,06 s |
| 3 | 80 | 100 | 100 | 100 | 3,26 s | 503 ms | 0 | 1,06 s |
| **Mediana** | **80** | 100 | 100 | 100 | **3,27 s** | **503 ms** | 0 | 1,06 s |

Meta CA-9.2: Rendimiento >= 90 (NO cumple), LCP <= 2,5 s (NO cumple), TBT <= 200 ms (NO cumple), CLS <= 0,1 (cumple).
CA-9.4: el elemento LCP es el texto del h1 ("Que tus clientes pidan desde la mesa..."), no el canvas 3D (cumple).

Pistas para la corrección (corrida 2): el LCP es 14% TTFB y 86% "render delay" (2,8 s simulados); un solo chunk
de JS (`3g4px251sg85e.js`) se lleva ~695 ms de scripting en el hilo principal.

Archivos: `movil-1.json`, `movil-2.json`, `movil-3.json` (informes completos de Lighthouse).
