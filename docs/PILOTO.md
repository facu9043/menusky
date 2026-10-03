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
| P-5 | El repositorio no tenía identidad de git configurada. | Falló el primer commit. | El Líder configuró la identidad local con la del historial (facu9043). |
| P-6 | (Frente login) El Líder fijó el presupuesto de peso de `/login` con un script propio que no contaba las fuentes (Next 16 las precarga por cabecera HTTP `Link`, no en el HTML). | El presupuesto CA-9.2 (320 KB) era imposible desde el inicio: la línea base real ya era 326,4 KB. Lo detectó el Frontend midiendo con Chrome por CDP. | Se corrigió CA-9.2 (380 KB contando fuentes) y se avisó en el script. Lección: validar una herramienta de medición contra el navegador real antes de fijar presupuestos con ella. |
| P-7 | (Frente login) El PO no tiene shell y no puede medir la línea base que su propia spec pide. | Dependencia no prevista del Líder. | El Líder midió la línea base antes de delegar al Frontend. Lección: al pedir criterios medibles al PO, el Líder mide la línea base antes o en paralelo. |
| P-9 | (Frente login) Seguridad y QA usaron veredictos intermedios ("Apto con reservas", "Aprobado con reservas") con reservas fuera del alcance de la tarea (RLS preexistente, medición en el Celeron). | El Líder tuvo que separar qué reserva es del login y cuál del Director. | En la re-auditoría se pidió veredicto explícito "para el alcance login". Lección: pedir siempre el veredicto por alcance y listar aparte lo preexistente. |
| P-8 | (Frente login) El Frontend commiteó por error una captura PNG suelta. | Archivo de más en el historial de la rama. | Lo borró en 3f298d2. Se limpia al integrar (squash o revisión del diff). |

## 2. Fallas del entorno

| # | Qué pasó | Consecuencia | Cómo se corrigió |
|---|---|---|---|
| E-1 | La PC se apagó tres veces con el equipo trabajando (la tercera durante el re-test de QA). | Se cortaron las sesiones de los agentes y quedaron cambios sin commit (4 archivos) en riesgo. | Commit de resguardo (72c9651), `docs/ESTADO.md` con el paso actual, regla de commits chicos y frecuentes, y la PC configurada para no suspenderse por inactividad. |
| E-2 | El límite de uso de 5 horas del plan llegó al 93% en medio del trabajo. | Riesgo de que el equipo se cortara de golpe sin guardar. | Pausa ordenada a pedido: commit de todo y estado anotado. |
| E-4 | (Frente login) Captura con `chrome --headless --window-size=360,...`: Chrome tiene un ancho mínimo de ventana y la página se maqueta más ancha que la captura. | Falso positivo de "scroll horizontal" en la verificación del Líder. | Medir con CDP `Emulation.setDeviceMetricsOverride` (320/360/180 px: scrollWidth = clientWidth). |
| E-5 | (Frente login) Dos Líderes en paralelo (landing y login) comparten la misma carpeta scratchpad temporal. | Riesgo de pisar o confundir archivos y capturas de la otra sesión. | Prefijo `lt-` para los archivos del frente login; no borrar nada ajeno. |
| E-6 | (Frente login) La herramienta SendMessage no está disponible en la sesión. | No se puede continuar un agente con su contexto (re-auditorías y re-tests). | Se lanza un agente nuevo con todo el contexto y el informe previo; cuesta más tokens pero funciona. |
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
| QA-02 | Media | Scroll horizontal en pantallas de 320 px y en 360 px con zoom al 200% (encabezado de 337 px mínimo). | Corregido (84b192b). Re-test en curso. |
| QA-03 | Baja | Advertencias del 3D en la consola en equipos sin GPU. | Corregido (33fe415). |
| SEC-L-01..06 | Informativos | Sin hallazgos graves. Notas: el código del worker 3D se publica (sin secretos), falta CSP para scripts, `next start` escucha en todas las interfaces durante las pruebas y un script de QA usaba una ruta absoluta (corregido en 7a46fc8). | Seguridad: **Apto**. |
| HU-9 | Bloqueante | Rendimiento en celular por debajo de la meta en esta PC. | Pendiente de medir en otra PC (ver E-3). |

## 5. Pendientes antes de publicar
- Medir el rendimiento en una PC más potente.
- Aprobar o rechazar la carga del 3D tras la primera interacción (P-4).
- Probar en Safari y en un iPhone real.
- Legales (términos y privacidad): no hacen falta en v1 porque no hay formulario ni analítica.
- Aprobación del Director de los textos y del release.

## Fase Admin (2026-10-03): fallas nuevas
| # | Qué pasó | Consecuencia | Cómo se manejó |
|---|---|---|---|
| P-10 | Cortes de red (ENOTFOUND / ECONNRESET) mataron al Líder y a los subagentes 3 veces (PO, Frontend de marca dos veces). | Trabajo sin commit perdido (el primer Frontend de marca no dejó nada). | ESTADO-ADMIN.md commiteado antes de cada delegación y pedido explícito de commits muy frecuentes en cada delegación; el Backend, que commiteó por pieza, no perdió nada. |
| P-11 | El encargo citaba una sección "Notas para la fase Admin" en `docs/releases/login-redesign.md` que no existe. | El Líder tomó la deuda de STACK.md y del informe de Seguridad. | Anotado en ESTADO-ADMIN.md. Lección: verificar que los documentos citados existan antes de delegar. |
| P-12 | El Líder decidió no poner límite de tasa (D-13) con un argumento equivocado (que hacía falta infraestructura); Seguridad mostró que se podía hacer en la base. | Una decisión técnica revertida (D-14). | Funcionó el control cruzado: la auditoría temprana lo detectó antes de construir encima. |
| P-13 | SendMessage para retomar agentes: funcionó (Backend retomado con su contexto para las correcciones), pero el agente retomado corre en segundo plano y su informe llega como notificación. | Hay que esperar la notificación antes de informar. | Registrado; no se informó con agentes trabajando. |
