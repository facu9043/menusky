# Prueba piloto del equipo de agentes: qué falló

Registro de los problemas que aparecieron en la primera prueba del equipo de 6 agentes
(Fase 1: landing de MenuSky), para tenerlos en cuenta en las fases siguientes.
Actualizado: 2026-10-02.

## 1. Fallas del proceso del equipo

| # | Qué pasó | Consecuencia | Cómo se corrigió |
|---|---|---|---|
| P-1 | El Líder lanzó al Product Owner en segundo plano y entregó su informe antes de que el PO terminara. | El primer informe llegó sin specs y con preguntas armadas por el Líder, no por el PO. | Lección en CLAUDE.md: delegaciones en primer plano, no informar con agentes trabajando. |
| P-2 | El PO empezó a trabajar antes de que existiera `docs/STACK.md`. | El PO no pudo cumplir la regla 1 (leer STACK.md antes de empezar). | Lección en CLAUDE.md: crear primero los docs y recién después delegar. |
| P-3 | El Líder mezcló datos de otro proyecto: citó un bug del "marquee del Hero" (commit a3861be) que es del repositorio del portafolio, no de MenuSky. | El dato entró en la spec v0.1 (CA-7.1 y R6). | Se quitó en la spec v1.0. Lección en CLAUDE.md: nada de datos de otro proyecto. |
| P-4 | El Líder decidió por su cuenta que el 3D del hero cargue recién con la primera interacción del usuario. | Una decisión de diseño visible que no pasó por el Director (regla 8). | Se informó al Director y quedó pendiente de aprobación. |
| P-6 | El Frontend reportó Lighthouse Accesibilidad 100 como prueba de contraste, pero Lighthouse no evalúa secciones con content-visibility sin pintar. | QA encontró 3 fallas de contraste (QA-01) que la autoverificación no vio. | QA usa axe tras recorrer toda la página. Lección: no dar por buena una métrica sin saber qué cubre. |
| P-7 | Seguridad informó que el 3D no pasaba a live en headless; QA demostró que sí pasaba (era lentitud del equipo). | Nota falsa que podía disparar una corrección innecesaria. | El Líder no reasignó nada sin la verificación de QA. |
| P-8 | QA citó como evidencia logs `out-*.log` que están en .gitignore y no quedan en el repo. | Parte de la evidencia del re-test es local y se pierde si se limpia la carpeta. | Pendiente: decidir si se versiona un resumen de esos logs. |
| P-5 | El repositorio no tenía identidad de git configurada. | Falló el primer commit. | El Líder configuró la identidad local con la del historial (facu9043). |

## 2. Fallas del entorno

| # | Qué pasó | Consecuencia | Cómo se corrigió |
|---|---|---|---|
| E-1 | La PC se apagó tres veces con el equipo trabajando (la tercera durante el re-test de QA). | Se cortaron las sesiones de los agentes y quedaron cambios sin commit (4 archivos) en riesgo. | Commit de resguardo (72c9651), `docs/ESTADO.md` con el paso actual, regla de commits chicos y frecuentes, y la PC configurada para no suspenderse por inactividad. |
| E-2 | El límite de uso de 5 horas del plan llegó al 93% en medio del trabajo. | Riesgo de que el equipo se cortara de golpe sin guardar. | Pausa ordenada a pedido: commit de todo y estado anotado. |
| E-4 | Tras el 3er apagón quedaron procesos huérfanos: node en el puerto 3000 (PID 3784) y un `next start -p 3100` (PID 2076, probablemente de QA). | Riesgo de probar contra un build viejo o de matar un proceso ajeno. | No se mataron (dueño sin confirmar); QA y Frontend usaron 3110, 3120 y 3130. Quedan para que el Director los cierre. |
| E-3 | La PC del Director (Celeron N4020, 2 núcleos) es demasiado lenta para medir rendimiento con Lighthouse. | La meta de rendimiento dio 56 (meta: 90 o más). Incluso `/login` da malos resultados ahí. | Decisión del Director: medir en una PC más potente. **Pendiente y bloquea el release.** |

## 3. Requisitos que necesitaron corrección

| # | Qué pasó | Cómo se resolvió |
|---|---|---|
| R-1 | El Director pidió mostrar "cuenta/factura", pero la app no emite facturas. | La landing muestra solo lo que existe: pedir la cuenta mediante el llamado al mozo y la cuenta de la mesa en los paneles. |
| R-2 | La mascota propuesta era Jake (Hora de Aventura), un personaje con derechos de Cartoon Network/WBD. | El Director eligió que el equipo diseñe una mascota original. |

## 4. Defectos encontrados por Seguridad y QA en la landing

| ID | Severidad | Defecto | Estado |
|---|---|---|---|
| QA-01 | Media | Contraste insuficiente: 4,37:1 en la tarjeta "Pedir la cuenta" y 3,58:1 en el botón "Ver pedido" del mockup de temas. | Corregido (9b19ade). Re-test OK (ef0abde). |
| QA-02 | Media | Scroll horizontal en pantallas de 320 px y en 360 px con zoom al 200% (encabezado de 337 px mínimo). | Corregido (84b192b). Re-test OK (efbbfd5). |
| QA-03 | Baja | Advertencias del 3D en la consola en equipos sin GPU. | Corregido (33fe415). Re-test OK (0738950). |
| QA-07 | Baja | La animación "del celular a la cocina" no arrancaba en pantallas de 260 px o menos. | Corregido (2531b5e). Re-test OK (8be3807). |
| QA-04/05/06/08 | Informativos | Canonical sin barra final, revelado tardío con CPU lenta, lentitud en headless, aviso de Firefox sin GPU, clic intermitente en un script por CPU. | Sin acción. QA: **Aprobado con reservas**. |
| SEC-L-01..06 | Informativos | Sin hallazgos graves. Notas: el código del worker 3D se publica (sin secretos), falta CSP para scripts, `next start` escucha en todas las interfaces durante las pruebas y un script de QA usaba una ruta absoluta (corregido en 7a46fc8). | Seguridad: **Apto**. |
| HU-9 | Bloqueante | Rendimiento en celular por debajo de la meta en esta PC. | Pendiente de medir en otra PC (ver E-3). |

## 5. Pendientes antes de publicar
- Medir el rendimiento en una PC más potente.
- Aprobar o rechazar la carga del 3D tras la primera interacción (P-4).
- Probar en Safari y en un iPhone real.
- Legales (términos y privacidad): no hacen falta en v1 porque no hay formulario ni analítica.
- Aprobación del Director de los textos y del release.
