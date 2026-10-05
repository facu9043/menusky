# Lighthouse del login (CA-9.5 / CA-6.10), 2026-10-03

Qué cubre: solo `/login`, Lighthouse 12.8.2 en modo móvil por defecto (simulado, CPU 4x), sobre `next build` +
`next start -H 127.0.0.1 -p 3500` de `feat/login-redesign` @ 93fd493, con variables de Supabase ficticias.
Chrome headless. PC: AMD Ryzen 5 5600G, 15 GB de RAM.
Qué no cubre: la URL publicada, celulares reales, escritorio, el envío del formulario, Safari.

| Corrida | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS | FCP |
|---|---|---|---|---|---|---|---|---|
| 1 | 93 | 100 | 100 | 63 | 3,19 s | 63 ms | 0 | 0,91 s |
| 2 | 93 | 100 | 100 | 63 | 3,18 s | 66 ms | 0 | 0,91 s |
| 3 | 93 | 100 | 100 | 63 | 3,18 s | 48 ms | 0 | 0,91 s |
| **Mediana** | **93** | **100** | 100 | 63 | **3,18 s** | 63 ms | 0 | 0,91 s |

Meta CA-9.5: Rendimiento >= 90 (cumple), LCP <= 2,5 s (NO cumple), CLS <= 0,05 (cumple), TBT <= 200 ms (cumple),
Accesibilidad >= 95 (cumple, CA-6.10). El elemento LCP es el texto del panel rojo ("Cocina, salón y administración,
en un solo lugar."), no la mascota (cumple esa parte de CA-9.5).
LCP: 456 ms de TTFB y ~2,7 s de "render delay" simulado (mismo patrón que la landing).
SEO 63: la única auditoría que falla es `is-crawlable` porque `/login` no se indexa a propósito; no es un defecto.

Archivos: `movil-1.json`, `movil-2.json`, `movil-3.json`.
