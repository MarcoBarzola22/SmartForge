# TASKS-001 — SmartForge MVP — Plan de Tareas de Implementación

> Derivado de `specs/001-SmartForge-mvp/spec.md`, `specs/001-SmartForge-mvp/plan.md` y `docs/constitution.md`.
> Tareas atómicas organizadas en orden estricto de dependencias (estimación: 20–30 min por tarea).
> Convención: Código y commits en inglés; interfaz, documentación y textos en español (Constitución §6).

---

## Índice de Fases

1. [Fase 1: Infraestructura base y herramientas](#fase-1-infraestructura-base-y-herramientas)
2. [Fase 2: Contrato OpenAPI y generación de tipos](#fase-2-contrato-openapi-y-generación-de-tipos)
3. [Fase 3: Base de datos y migraciones](#fase-3-base-de-datos-y-migraciones)
4. [Fase 4: Catálogo de ejercicios y seeds (RF-09)](#fase-4-catálogo-de-ejercicios-y-seeds-rf-09)
5. [Fase 5: Autenticación y perfil de atleta (RF-01)](#fase-5-autenticación-y-perfil-de-atleta-rf-01)
6. [Fase 6: Generador de mesociclos (RF-02)](#fase-6-generador-de-mesociclos-rf-02)
7. [Fase 7: Editor de rutina y sustitución de ejercicios (RF-03)](#fase-7-editor-de-rutina-y-sustitución-de-ejercicios-rf-03)
8. [Fase 8: Sesión y check-in pre-entreno (RF-04)](#fase-8-sesión-y-check-in-pre-entreno-rf-04)
9. [Fase 9: Registro de series y reporte de molestia (RF-05, RF-06)](#fase-9-registro-de-series-y-reporte-de-molestia-rf-05-rf-06)
10. [Fase 10: Motor de sobrecarga progresiva (RF-07)](#fase-10-motor-de-sobrecarga-progresiva-rf-07)
11. [Fase 11: Ajuste por fatiga y dolor articular (RF-08)](#fase-11-ajuste-por-fatiga-y-dolor-articular-rf-08)
12. [Fase 12: Rotación de mesociclo y semana de descarga (RF-10)](#fase-12-rotación-de-mesociclo-y-semana-de-descarga-rf-10)
13. [Fase 13: Sincronización offline backend (RNF-03)](#fase-13-sincronización-offline-backend-rnf-03)
14. [Fase 14: Frontend — Shell base, diseño y componentes UI (RNF-01, RNF-02)](#fase-14-frontend--shell-base-diseño-y-componentes-ui-rnf-01-rnf-02)
15. [Fase 15: Frontend — Autenticación y Onboarding de perfil (RF-01)](#fase-15-frontend--autenticación-y-onboarding-de-perfil-rf-01)
16. [Fase 16: Frontend — Dashboard de mesociclo y editor de rutina (RF-02, RF-03, RF-10)](#fase-16-frontend--dashboard-de-mesociclo-y-editor-de-rutina-rf-02-rf-03-rf-10)
17. [Fase 17: Frontend — Flujo de ejecución de sesión y check-in (RF-04, RF-05, RF-06, RF-07, RF-08)](#fase-17-frontend--flujo-de-ejecución-de-sesión-y-check-in-rf-04-rf-05-rf-06-rf-07-rf-08)
18. [Fase 18: Frontend — Catálogo y detalle de ejercicio con video (RF-09)](#fase-18-frontend--catálogo-y-detalle-de-ejercicio-con-video-rf-09)
19. [Fase 19: Frontend — Service Worker, PWA e IndexedDB offline (RNF-03)](#fase-19-frontend--service-worker-pwa-e-indexeddb-offline-rnf-03)
20. [Fase 20: Pipeline de CI, verificación y auditoría final](#fase-20-pipeline-de-ci-verificación-y-auditoría-final)

---

## Fase 1: Infraestructura base y herramientas

- [x] **TASK-01**: Inicializar estructura de monorepo y configuración de TypeScript en backend y frontend.
  - **RF**: N/A (Infraestructura / Constitución §3)
  - **Hecho cuando**: `npm run build` en la raíz compila tanto el backend (`backend/tsconfig.json`) como el frontend (`frontend/tsconfig.json`) sin errores de TypeScript en modo estricto.

- [x] **TASK-02**: Configurar contenedor Docker para PostgreSQL con soporte de extensiones y healthcheck.
  - **RF**: N/A (Constitución §5)
  - **Hecho cuando**: Al ejecutar `docker-compose up -d db`, PostgreSQL 16 queda activo en el puerto 5432 y responde exitosamente al comando `pg_isready`.

- [x] **TASK-03**: Configurar linter (ESLint), formateador (Prettier) y framework de pruebas (Vitest) en backend y frontend.
  - **RF**: N/A (Constitución §4, §6)
  - **Hecho cuando**: Los comandos `npm run lint`, `npm run format` y `npm run test` ejecutan sin fallos y Vitest reporta 0 errores en suites de ejemplo.

---

## Fase 2: Contrato OpenAPI y generación de tipos

- [x] **TASK-04**: Crear archivo base `contract/openapi.yaml` con metadatos, seguridad OAuth2/Bearer JWT y esquemas de error estándar en español.
  - **RF**: RF-01, RNF-05, Constitución §1
  - **Hecho cuando**: El archivo `contract/openapi.yaml` pasa la validación de Spectral/Redocly (`npm run lint:openapi`) con 0 advertencias y 0 errores.

- [x] **TASK-05**: Definir esquemas y endpoints para autenticación y perfil (`/auth/*`, `/profile`) en `contract/openapi.yaml`.
  - **RF**: RF-01
  - **Hecho cuando**: Las operaciones `GET /api/auth/me`, `POST /api/profile`, `PUT /api/profile` y `DELETE /api/profile` están descritas con sus DTOs de request y response validados en OpenAPI.

- [x] **TASK-06**: Definir esquemas y endpoints para catálogo y alternativas de ejercicios (`/exercises`, `/exercises/:id`, `/exercises/:id/alternatives`) en `contract/openapi.yaml`.
  - **RF**: RF-03, RF-09
  - **Hecho cuando**: Los esquemas para `Exercise`, `ExerciseAlternative` y los filtros de consulta (patrón, músculo, equipamiento) están completamente especificados en OpenAPI.

- [x] **TASK-07**: Definir esquemas y endpoints para mesociclos y asignaciones (`/mesocycles`, `/mesocycles/current`, `/mesocycles/:id`, `/assignments/:id/swap`) en `contract/openapi.yaml`.
  - **RF**: RF-02, RF-03, RF-10
  - **Hecho cuando**: Los payloads de generación de mesociclo, detalle de semanas/sesiones y swap de ejercicios están completamente definidos con sus códigos HTTP (200, 201, 400, 404).

- [x] **TASK-08**: Definir esquemas y endpoints para sesiones, check-in, series y dolor articular (`/sessions/*`, `/sets/*`, `/assignments/:id/progression`, `/sync`) en `contract/openapi.yaml`.
  - **RF**: RF-04, RF-05, RF-06, RF-07, RF-08, RNF-03
  - **Hecho cuando**: Los esquemas de CheckIn (fatiga 1–5, dolor bilateral), SetLog (reps, peso, RIR 0–5), PainReport y Sync offline están definidos en OpenAPI y `npm run lint:openapi` valida el archivo completo.

- [x] **TASK-09**: Configurar pipeline de generación de schemas Zod y tipos TypeScript desde `contract/openapi.yaml` (`npm run generate:types`).
  - **RF**: RNF-07, Constitución §1
  - **Hecho cuando**: Al ejecutar `npm run generate:types`, se generan automáticamente los archivos en `backend/src/schemas/generated/` y `frontend/src/api/` sin edición manual.

- [x] **TASK-10**: Implementar middleware Express de validación automática de request con Zod (`validate.middleware.ts`) y middleware centralizado de errores (`error-handler.middleware.ts`).
  - **RF**: RNF-05, Constitución §3
  - **Hecho cuando**: Un request con payload inválido (ej. edad 15 o RIR 6) responde HTTP 400 con un JSON estructurado y mensajes descriptivos en español.

---

## Fase 3: Base de datos y migraciones

- [x] **TASK-11**: Configurar pool de conexión PostgreSQL (`backend/src/config/db.ts`) y ejecutor de migraciones SQL secuenciales (`npm run db:migrate`).
  - **RF**: N/A (Constitución §5)
  - **Hecho cuando**: El comando `npm run db:migrate` ejecuta archivos `.sql` en orden ascendente y mantiene la tabla de control `schema_migrations`.

- [x] **TASK-12**: Crear migración `001_initial_schema.sql` con tablas maestras: `equipment`, `athlete`, `athlete_equipment` con FK explícitas y `ON DELETE`.
  - **RF**: RF-01, Constitución §5
  - **Hecho cuando**: La migración corre exitosamente en PostgreSQL y rechaza inserciones de atletas con `age < 16` mediante constraint de check SQL.

- [x] **TASK-13**: Crear migración `002_exercise_catalog.sql` con tablas `exercise` y `exercise_alternative` con índices por patrón, músculo primario y equipamiento.
  - **RF**: RF-03, RF-09, Constitución §5
  - **Hecho cuando**: Las tablas existen en PostgreSQL con FK compuesta explícita en alternativas y soporte de array de texto para músculos secundarios.

- [x] **TASK-14**: Crear migración `003_mesocycles_and_plans.sql` con tablas `mesocycle`, `week_plan`, `session_plan`, `exercise_assignment` y `exercise_swap`.
  - **RF**: RF-02, RF-03, RF-10, Constitución §5
  - **Hecho cuando**: Las tablas se crean con FK en cascada para la jerarquía del plan y `ON DELETE RESTRICT` para referencias a ejercicios maestros.

- [x] **TASK-15**: Crear migración `004_sessions_and_logs.sql` con tablas `session`, `checkin`, `checkin_pain`, `set_log` y `exercise_pain_report`.
  - **RF**: RF-04, RF-05, RF-06, RF-08, Constitución §5
  - **Hecho cuando**: Las tablas tienen constraints de validación (`fatigue_level BETWEEN 1 AND 5`, `rir BETWEEN 0 AND 5`, `weight_kg >= 0`, `reps >= 0`) y campos `client_timestamp` indexados.

---

## Fase 4: Catálogo de ejercicios y seeds (RF-09)

- [x] **TASK-16**: Crear seed SQL/TypeScript de equipamiento con la taxonomía cerrada de 20 ítems (`backend/src/db/seeds/equipment.seed.ts`).
  - **RF**: RF-01
  - **Hecho cuando**: La tabla `equipment` contiene exactamente los 20 ítems definidos en RF-01 con sus identificadores normalizados.

- [x] **TASK-17**: Crear dataset y script de seed para los 200 ejercicios con metadatos completos (patrón, músculo, equipamiento, `initial_load_ratio`, URL video y fallback).
  - **RF**: RF-09, CA-02.5
  - **Hecho cuando**: Al ejecutar `npm run db:seed`, la tabla `exercise` tiene ≥200 registros activos y la tabla `exercise_alternative` tiene mapeadas sus equivalencias bidireccionales.

- [x] **TASK-18**: Implementar `exercise.repository.ts` con queries de búsqueda, filtrado por equipamiento/patrón/músculo y consulta de alternativas.
  - **RF**: RF-03, RF-09, Constitución §3
  - **Hecho cuando**: Las pruebas de integración en `exercise.repository.test.ts` verifican filtrado exacto y exclusión de ejercicios inactivos (`is_active = false`).

- [x] **TASK-19**: Implementar `exercise-catalog.service.ts`, `exercise.controller.ts` y `exercise.routes.ts` con tests unitarios y de contrato.
  - **RF**: RF-09, Constitución §3, §4
  - **Hecho cuando**: `GET /api/exercises` y `GET /api/exercises/:id` responden con status 200 y pasan al 100% sus tests de contrato OpenAPI.

---

## Fase 5: Autenticación y perfil de atleta (RF-01)

- [x] **TASK-20**: Implementar middleware de autenticación JWT (`auth.middleware.ts`) para verificar id_tokens de Google OAuth y extraer el atleta autenticado.
  - **RF**: RF-01, CL-18, Constitución §3
  - **Hecho cuando**: Un request sin header `Authorization` retorna 401, un token inválido retorna 401 y un token válido adjunta `req.athlete` al contexto.

- [x] **TASK-21**: Implementar `athlete.repository.ts` para operaciones CRUD de atleta, equipamiento asociado y soft-delete (`deleted_at`).
  - **RF**: RF-01, Constitución §3, §5
  - **Hecho cuando**: Se puede crear un atleta con equipamiento atómicamente en una transacción SQL y recuperar su perfil completo con relaciones.

- [x] **TASK-22**: Implementar `auth.service.ts` y `profile.service.ts` con validación de edad mínima (≥16 años) y control de email duplicado.
  - **RF**: RF-01, CA-01.2, CA-01.3
  - **Hecho cuando**: `profile.service.test.ts` verifica rechazo de edades < 16 años y rechazo de duplicados de Google email con excepción de conflicto (409).

- [x] **TASK-23**: Implementar `auth.controller.ts`, `profile.controller.ts`, `auth.routes.ts` y `profile.routes.ts`.
  - **RF**: RF-01, Constitución §3, §4
  - **Hecho cuando**: Los endpoints `/api/auth/me`, `POST /api/profile`, `PUT /api/profile` y `DELETE /api/profile` pasan los tests unitarios y de contrato OpenAPI.

---

## Fase 6: Generador de mesociclos (RF-02)

- [x] **TASK-24**: Implementar `mesocycle.repository.ts` para persistir la estructura completa de mesociclo, semanas, sesiones y asignaciones de ejercicios.
  - **RF**: RF-02, Constitución §3
  - **Hecho cuando**: Se guarda un mesociclo completo con sus 4–8 semanas y sesiones asociadas dentro de una sola transacción de base de datos.

- [x] **TASK-25**: Implementar algoritmo de selección y balance de patrones de movimiento según objetivo (empuje, tirón, rodilla, cadera, core) en `mesocycle-generator.service.ts`.
  - **RF**: RF-02, CA-02.1
  - **Hecho cuando**: Los tests unitarios demuestran que cada rutina generada distribuye equitativamente los 5 patrones principales.

- [x] **TASK-26**: Implementar filtro estricto de equipamiento y ajuste de volumen para atletas con solo peso corporal en `mesocycle-generator.service.ts`.
  - **RF**: RF-02, CA-02.2, CL-21
  - **Hecho cuando**: Un perfil con solo "sin equipamiento" genera una rutina 100% de peso corporal y marca advertencia si el volumen máximo posible es inferior al óptimo.

- [x] **TASK-27**: Implementar cálculo de volumen semanal por nivel de experiencia (principiante 10–14, intermedio 14–20, avanzado 18–24 series/músculo/semana) en `mesocycle-generator.service.ts`.
  - **RF**: RF-02, CA-02.3
  - **Hecho cuando**: El generador asigna exactamente series dentro de los rangos de Schoenfeld según el nivel del atleta evaluado en los tests unitarios.

- [x] **TASK-28**: Implementar cálculo de periodización (lineal para fuerza, ondulante para hipertrofia/mixto) y estimación de carga inicial con ratios (`initial_load_ratio`) en `mesocycle-generator.service.ts`.
  - **RF**: RF-02, CA-02.4, CA-02.5
  - **Hecho cuando**: Se calculan cargas iniciales exactas basadas en peso corporal y experiencia, y la progresión semanal aplica el esquema lineal u ondulante correspondiente.

- [x] **TASK-29**: Implementar `mesocycle.controller.ts` y `mesocycle.routes.ts` con tests unitarios y de contrato (`POST /api/mesocycles`, `GET /api/mesocycles/current`).
  - **RF**: RF-02, Constitución §3, §4
  - **Hecho cuando**: `POST /api/mesocycles` genera y retorna un mesociclo persistido y pasa los tests de contrato OpenAPI.

---

## Fase 7: Editor de rutina y sustitución de ejercicios (RF-03)

- [x] **TASK-30**: Implementar `exercise-swap.repository.ts` para registrar el historial de sustitución de ejercicios con motivo.
  - **RF**: RF-03, CA-03.4, Constitución §3
  - **Hecho cuando**: Las inserciones en la tabla `exercise_swap` persisten `assignment_id`, `original_exercise_id`, `new_exercise_id` y `reason`.

- [x] **TASK-31**: Implementar lógica de búsqueda de alternativas compatibles filtradas por equipamiento del atleta en `routine-editor.service.ts`.
  - **RF**: RF-03, CA-03.1, CA-03.2
  - **Hecho cuando**: Si existen alternativas con el equipamiento del usuario se devuelven ordenadas; si no hay ninguna compatible, se retorna lista vacía con mensaje "No se encontró alternativa con tu equipamiento".

- [x] **TASK-32**: Implementar sustitución de ejercicio en la asignación (`swapExercise`) y registro de motivo en `routine-editor.service.ts`.
  - **RF**: RF-03, CA-03.3, CA-03.4
  - **Hecho cuando**: La asignación de ejercicio en la sesión se actualiza con el nuevo ejercicio y el mesociclo refleja el cambio en cascada.

- [x] **TASK-33**: Implementar `routine.controller.ts` y `routine.routes.ts` con tests unitarios y de contrato (`GET /api/exercises/:id/alternatives`, `POST /api/assignments/:id/swap`).
  - **RF**: RF-03, Constitución §3, §4
  - **Hecho cuando**: El endpoint de swap valida el motivo, aplica el cambio y responde 200 pasando el test de contrato OpenAPI.

---

## Fase 8: Sesión y check-in pre-entreno (RF-04)

- [x] **TASK-34**: Implementar `session.repository.ts` y `checkin.repository.ts` para gestión de ciclo de vida de sesiones y check-ins de fatiga/dolor.
  - **RF**: RF-04, Constitución §3
  - **Hecho cuando**: Se puede crear una sesión en estado `in_progress`, registrar su check-in y verificar que no se permita más de un check-in por sesión (error 409).

- [x] **TASK-35**: Implementar `checkin.service.ts` con validación de escala de fatiga (1–5) y registro de articulaciones bilaterales con intensidad (leve, moderada, severa).
  - **RF**: RF-04, CA-04.1, CA-04.2, CA-04.3, CA-04.4
  - **Hecho cuando**: `checkin.service.test.ts` valida que se persistan todas las articulaciones seleccionadas con su lado (izq/der) e intensidad, rechazando valores fuera de rango.

- [x] **TASK-36**: Implementar endpoints de sesión y check-in en `session.controller.ts` y `session.routes.ts` (`POST /api/sessions`, `POST /api/sessions/:id/checkin`).
  - **RF**: RF-04, Constitución §3, §4
  - **Hecho cuando**: Los endpoints de creación de sesión y envío de check-in responden status 201 y cumplen las especificaciones de contrato OpenAPI.

---

## Fase 9: Registro de series y reporte de molestia (RF-05, RF-06)

- [x] **TASK-37**: Implementar `set-log.repository.ts` y `pain-report.repository.ts` con operaciones CRUD de series y reporte de dolor por ejercicio.
  - **RF**: RF-05, RF-06, Constitución §3
  - **Hecho cuando**: Las operaciones de inserción, actualización, eliminación de series y persistencia de molestias por ejercicio ejecutan con integridad referencial garantizada.

- [x] **TASK-38**: Implementar `set-logger.service.ts` con validación de RIR (0–5), peso (≥ 0 kg para peso corporal), repeticiones y edición/borrado durante sesión activa.
  - **RF**: RF-05, CA-05.1, CA-05.2, CA-05.3, CL-05
  - **Hecho cuando**: `set-logger.service.test.ts` comprueba que no se registren series con RIR > 5, permite peso 0 kg y bloquea modificaciones en sesiones finalizadas.

- [x] **TASK-39**: Implementar `pain-report.service.ts` para capturar reportes opcionales de molestia articular post-ejercicio.
  - **RF**: RF-06, CA-06.1, CA-06.2, CA-06.3
  - **Hecho cuando**: Se registra la molestia vinculada a la sesión, ejercicio y articulación, persistiendo la intensidad para el motor de ajuste de RF-08.

- [x] **TASK-40**: Implementar endpoints de series, dolor y finalización de sesión (`POST /api/sessions/:id/sets`, `PUT /api/sets/:id`, `DELETE /api/sets/:id`, `POST /api/sessions/:id/pain-reports`, `PATCH /api/sessions/:id/complete`).
  - **RF**: RF-05, RF-06, Constitución §3, §4
  - **Hecho cuando**: Todos los endpoints de series y dolor pasan los tests unitarios y de contrato OpenAPI con respuestas 200/201/204.

---

## Fase 10: Motor de sobrecarga progresiva (RF-07)

- [x] **TASK-41**: Implementar función de cálculo de racha de cumplimiento exitoso (`calculateStreak`) en `progression.service.ts`.
  - **RF**: RF-07, CA-07.1, CA-07.4
  - **Hecho cuando**: Los tests unitarios verifican el conteo exacto de sesiones consecutivas cumpliendo reps objetivo con RIR ≥ objetivo en la ventana evaluada.

- [x] **TASK-42**: Implementar reglas de incremento de carga por nivel (principiante: 1 sesión / +5kg compuesto; intermedio: 2 sesiones / +2.5kg; avanzado: 3 sesiones / +2.5kg; monoarticulares +1–2kg) en `progression.service.ts`.
  - **RF**: RF-07, CA-07.1
  - **Hecho cuando**: `progression.service.test.ts` valida los incrementos de carga exactos para cada nivel y tipo de ejercicio según la tabla de RF-07.

- [x] **TASK-43**: Implementar regla de doble progresión cuando no hay disco disponible o se alcanza el techo de repeticiones en `progression.service.ts`.
  - **RF**: RF-07, CA-07.2
  - **Hecho cuando**: El servicio sugiere aumentar 1 repetición por serie manteniendo el peso cuando no es viable subir carga en kilos.

- [x] **TASK-44**: Implementar manejo de fallos acumulados (1 fallo: mantener; 2 fallos: -5%; 3 fallos: deload -10%) y penalización por inactividad (>2 semanas: -10%) en `progression.service.ts`.
  - **RF**: RF-07, CA-07.3, CA-07.5
  - **Hecho cuando**: Los tests unitarios simulan 1, 2 y 3 fallos consecutivos y periodos de inactividad, confirmando los ajustes de carga correspondientes.

- [x] **TASK-45**: Implementar endpoint de sugerencia de progresión (`GET /api/assignments/:id/progression`) en `progression.controller.ts` y `progression.routes.ts`.
  - **RF**: RF-07, Constitución §3, §4
  - **Hecho cuando**: El endpoint retorna la acción calculada (`increase_load`, `increase_reps`, `maintain`, `reduce`, `deload`) con explicación detallada en español y pasa el test de contrato.

---

## Fase 11: Ajuste por fatiga y dolor articular (RF-08)

- [x] **TASK-46**: Implementar matriz de mapeo anatómico entre articulaciones y ejercicios en `fatigue-adjuster.service.ts`.
  - **RF**: RF-08, CA-08.1
  - **Hecho cuando**: La función mapea correctamente qué ejercicios estresan hombro, codo, muñeca, columna lumbar, cadera, rodilla y tobillo.

- [x] **TASK-47**: Implementar reglas de reducción por dolor articular moderado (1 sesión: -30% volumen; 2+ sesiones: -50% volumen y -10% carga) en `fatigue-adjuster.service.ts`.
  - **RF**: RF-08, CA-08.2
  - **Hecho cuando**: Los tests unitarios confirman el cálculo exacto de series reducidas y redondeo seguro hacia abajo.

- [x] **TASK-48**: Implementar exclusión por dolor severo, sustitución automática o advertencia de patrón completo comprometido en `fatigue-adjuster.service.ts`.
  - **RF**: RF-08, CA-08.3, CA-08.5, D-20
  - **Hecho cuando**: Un dolor severo excluye el ejercicio, busca sustituto seguro o emite aviso "Patrón no entrenable por dolor severo en rodilla" cuando no hay alternativa.

- [x] **TASK-49**: Implementar detección de fatiga pre-sesión sostenida (fatiga ≥ 4 durante 2 sesiones consecutivas) para gatillar deload reactivo en `fatigue-adjuster.service.ts`.
  - **RF**: RF-08, CA-08.4
  - **Hecho cuando**: El servicio detecta fatiga alta repetida y programa descarga reactiva inmediata reduciendo volumen en un 40%.

- [x] **TASK-50**: Integrar `fatigue-adjuster.service.ts` con `progression.service.ts` y verificar precedencia de reglas en tests unitarios.
  - **RF**: RF-07, RF-08, D-20
  - **Hecho cuando**: Ante múltiples reportes de dolor, prevalece la severidad máxima y los ajustes de dolor sobreescriben la sobrecarga estándar.

---

## Fase 12: Rotación de mesociclo y semana de descarga (RF-10)

- [x] **TASK-51**: Implementar lógica de generación y aplicación de semana de descarga programada (última semana: -40% volumen, -10% carga) en `mesocycle-rotation.service.ts`.
  - **RF**: RF-10, CA-10.2
  - **Hecho cuando**: La semana N del mesociclo (4, 6 u 8) contiene exactamente el 60% de las series habituales y 90% de la carga con RIR +1.

- [x] **TASK-52**: Implementar algoritmo de rotación de mesociclo (preservar compuestos principales, rotar ejercicios accesorios por variantes del mismo patrón) en `mesocycle-rotation.service.ts`.
  - **RF**: RF-10, CA-10.1, CA-10.4
  - **Hecho cuando**: Al generar un nuevo mesociclo, los ejercicios principales se mantienen con su progresión histórica y los accesorios se renuevan respetando historial de swaps previos.

- [x] **TASK-53**: Implementar verificación de historial de dolor articular durante la rotación de mesociclo para evitar sugerir ejercicios con molestias previas en `mesocycle-rotation.service.ts`.
  - **RF**: RF-10, CA-10.3
  - **Hecho cuando**: Los tests unitarios demuestran que ejercicios reportados con dolor severo en el mesociclo previo son descartados en la nueva selección.

- [x] **TASK-54**: Implementar endpoint de regeneración y rotación de mesociclo integrado en `mesocycle.controller.ts`.
  - **RF**: RF-10, Constitución §3, §4
  - **Hecho cuando**: El flujo de transición de mesociclo archiva el anterior, crea el nuevo con histórico preservado y pasa los tests de contrato.

---

## Fase 13: Sincronización offline backend (RNF-03)

- [x] **TASK-55**: Implementar endpoint de sincronización por lotes (`POST /api/sync`) en `sync.controller.ts` y `sync.routes.ts`.
  - **RF**: RNF-03, CL-10, Constitución §3
  - **Hecho cuando**: El endpoint procesa un array de operaciones mixtas (check-ins, set logs, pain reports) de forma atómica o con respuesta parcial HTTP 207.

- [x] **TASK-56**: Implementar resolución de conflictos basada en `client_timestamp` (last-write-wins) en `sync.service.ts`.
  - **RF**: RNF-03, DT-10
  - **Hecho cuando**: Al enviar dos registros del mismo set con distinta hora, el registro con `client_timestamp` más reciente sobrescribe al anterior en la base de datos.

- [x] **TASK-57**: Crear tests de integración y contrato para el endpoint de sincronización offline con múltiples dispositivos simulados.
  - **RF**: RNF-03, Constitución §4
  - **Hecho cuando**: `npm run test:contract` valida la sincronización correcta de lotes offline incluyendo casos con duplicados y marcas de tiempo desfasadas.

---

## Fase 14: Frontend — Shell base, diseño y componentes UI (RNF-01, RNF-02)

- [x] **TASK-58**: Configurar proyecto Vite + React + Tailwind CSS con layout mobile-first optimizado para viewport ≤ 390px.
  - **RF**: RNF-01, RNF-02, Constitución §2
  - **Hecho cuando**: La aplicación renderiza un contenedor centrado con max-width 390px y barra de estado adaptativa.

- [x] **TASK-59**: Crear componentes UI atómicos accesibles con touch targets ≥ 48px (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Slider`, `Toast`).
  - **RF**: RNF-02, Constitución §2
  - **Hecho cuando**: Todos los elementos interactivos tienen tamaño visual y zona táctil mínima de 48×48px verificados por tests de componentes.

- [x] **TASK-60**: Implementar barra de navegación inferior (Bottom Navigation) anclada en el 60% inferior de la pantalla para uso con una sola mano.
  - **RF**: RNF-01, Constitución §2
  - **Hecho cuando**: La barra de navegación permite alternar entre Rutina, Sesión Activa, Catálogo y Perfil sin requerir alcanzar la mitad superior de la pantalla.

- [x] **TASK-61**: Configurar cliente API tipado (`frontend/src/api/client.ts`) y provider de TanStack React Query con configuración de cache y reintentos.
  - **RF**: RNF-07, DT-05
  - **Hecho cuando**: Las llamadas a endpoints utilizan los tipos TypeScript auto-generados desde OpenAPI y manejan loading/error de forma reactiva.

---

## Fase 15: Frontend — Autenticación y Onboarding de perfil (RF-01)

- [x] **TASK-62**: Implementar `LoginPage.tsx` con botón de inicio de sesión con Google OAuth y manejo de sesión JWT en `useAuth.ts`.
  - **RF**: RF-01, CA-01.1
  - **Hecho cuando**: El usuario puede autenticarse con Google, almacenar el JWT en almacenamiento seguro local y ser redirigido según el estado de su perfil.

- [x] **TASK-63**: Implementar formulario de onboarding y perfil de atleta (`ProfilePage.tsx`) con selección de nivel, objetivo, días y selector múltiple de equipamiento.
  - **RF**: RF-01, CA-01.2, CA-01.4, CA-01.5
  - **Hecho cuando**: El formulario valida en cliente edad ≥ 16 años, restringe el equipamiento a la taxonomía cerrada de 20 ítems y crea el perfil exitosamente.

- [x] **TASK-64**: Implementar flujo de edición de perfil y confirmación de cambios de objetivo con aviso de generación de nuevo mesociclo.
  - **RF**: RF-01, CA-01.5
  - **Hecho cuando**: Al cambiar objetivo en el perfil se solicita confirmación explícita alertando sobre el archivado del mesociclo activo.

---

## Fase 16: Frontend — Dashboard de mesociclo y editor de rutina (RF-02, RF-03, RF-10)

- [x] **TASK-65**: Implementar `MesocyclePage.tsx` mostrando resumen del mesociclo activo, progreso semanal, distribución de patrones y aviso de semana de descarga.
  - **RF**: RF-02, RF-10, CA-10.2
  - **Hecho cuando**: El usuario visualiza la estructura de semanas, sesiones planificadas y un banner distintivo en la semana de deload.

- [x] **TASK-66**: Implementar `RoutineEditorPage.tsx` con listado de ejercicios por sesión y botón de cambio de ejercicio.
  - **RF**: RF-03, CA-03.3
  - **Hecho cuando**: El atleta puede inspeccionar series, reps y cargas planificadas de cada ejercicio y tocar "Cambiar ejercicio".

- [x] **TASK-67**: Implementar modal de ejercicios alternativos (`SwapExerciseModal.tsx`) con filtro de equipamiento y selector de motivo de cambio.
  - **RF**: RF-03, CA-03.1, CA-03.2, CA-03.4
  - **Hecho cuando**: Se muestran alternativas compatibles del mismo patrón muscular; si no hay equipamiento compatible, se muestra mensaje de advertencia y permite confirmar el swap con su motivo.

---

## Fase 17: Frontend — Flujo de ejecución de sesión y check-in (RF-04, RF-05, RF-06, RF-07, RF-08)

- [x] **TASK-68**: Implementar modal obligatorio de check-in pre-sesión (`CheckInModal.tsx`) con selector de fatiga 1–5 y mapa interactivo de articulaciones bilaterales con intensidad.
  - **RF**: RF-04, CA-04.1, CA-04.2, CA-04.3
  - **Hecho cuando**: El usuario no puede registrar series sin completar el check-in, seleccionando nivel de fatiga y molestias articulares (leve/moderada/severa).

- [x] **TASK-69**: Implementar componente de registro rápido de series (`SetLogger.tsx`) con inputs táctiles optimizados (≤ 4 toques por serie).
  - **RF**: RF-05, RNF-01, CA-05.1, CA-05.2
  - **Hecho cuando**: El atleta registra peso, reps y RIR mediante botones de incremento rápido y un botón grande de confirmación en el área inferior del viewport.

- [x] **TASK-70**: Implementar visualización de sugerencias dinámicas de sobrecarga progresiva y advertencias de ajuste por fatiga/dolor en `SessionPage.tsx`.
  - **RF**: RF-07, RF-08, CA-07.1, CA-08.3
  - **Hecho cuando**: Al iniciar un ejercicio, la tarjeta muestra la carga y reps sugeridas con el motivo, o un banner de reducción/exclusión si se reportó dolor.

- [x] **TASK-71**: Implementar modal de reporte de molestia articular post-ejercicio (`PainReportModal.tsx`) y botón de finalización de sesión con resumen de rendimiento.
  - **RF**: RF-05, RF-06, CA-06.1, CA-06.2
  - **Hecho cuando**: El atleta puede opcionalmente reportar dolor tras un ejercicio y finalizar la sesión visualizando el volumen total completado.

---

## Fase 18: Frontend — Catálogo y detalle de ejercicio con video (RF-09)

- [x] **TASK-72**: Implementar página de exploración del catálogo (`ExerciseCatalogPage.tsx`) con barra de búsqueda y filtros por patrón, músculo y equipamiento.
  - **RF**: RF-09, CA-09.1
  - **Hecho cuando**: El usuario puede buscar y filtrar interactivamente entre los 200 ejercicios con respuesta instantánea (<100ms).

- [x] **TASK-73**: Implementar vista de detalle de ejercicio (`ExerciseDetailPage.tsx`) con reproductor de video demostrativo y placeholder fallback offline.
  - **RF**: RF-09, CA-09.3, RNF-04
  - **Hecho cuando**: El video se reproduce en bucle con controles mínimos y muestra un fallback ilustrado en español si falla la conexión a internet.

---

## Fase 19: Frontend — Service Worker, PWA e IndexedDB offline (RNF-03)

- [x] **TASK-74**: Configurar manifest PWA (`manifest.json`), iconos de aplicación y registro del Service Worker con Workbox.
  - **RF**: RNF-03
  - **Hecho cuando**: La aplicación es instalable en dispositivos móviles y cumple con todos los criterios de auditoría PWA de Lighthouse.

- [x] **TASK-75**: Implementar capa de almacenamiento local con IndexedDB (`frontend/src/stores/offlineStore.ts`) para almacenar rutina del día, check-ins y series.
  - **RF**: RNF-03, DT-04
  - **Hecho cuando**: Las sesiones, check-ins y series registradas en modo avión se guardan localmente en IndexedDB sin pérdida de datos.

- [x] **TASK-76**: Implementar hook de sincronización automática (`useOfflineSync.ts`) y cola de Background Sync con indicador visual de estado offline/online.
  - **RF**: RNF-03, DT-10
  - **Hecho cuando**: Al recuperar la conexión a internet, los datos encolados se envían al backend (`POST /api/sync`) y el badge de sincronización pasa a "Sincronizado".

---

## Fase 20: Pipeline de CI, verificación y auditoría final

- [x] **TASK-77**: Configurar workflow de GitHub Actions (`.github/workflows/ci.yml`) con ejecución secuencial: `lint:openapi` → `generate:types` → `tsc` → `test:unit` → `test:contract`.
  - **RF**: Constitución §4, RNF-08
  - **Hecho cuando**: El pipeline de CI ejecuta en menos de 3 minutos y bloquea cualquier pull request con fallos de tipo, linter o tests.

- [x] **TASK-78**: Ejecutar suite completa de tests de contrato OpenAPI (`npm run test:contract`) cubriendo los 20 endpoints con casos válidos e inválidos.
  - **RF**: Todos los RF (RF-01 a RF-10), Constitución §4
  - **Hecho cuando**: Todos los endpoints verifican que sus respuestas cumplen el 100% de los schemas Zod generados sin discrepancias de contrato.

- [x] **TASK-79**: Realizar auditoría de accesibilidad táctil y performance Lighthouse en entorno móvil simulado (≤ 390px).
  - **RF**: RNF-01, RNF-02, RNF-06
  - **Hecho cuando**: Lighthouse reporta Performance ≥ 90, Accesibilidad ≥ 90, PWA válido y el 100% de los botones tienen touch targets ≥ 48px.

- [x] **TASK-80**: Verificación integral end-to-end del flujo completo del MVP: Registro → Perfil → Generación de Mesociclo → Check-in pre-entreno → Registro de Series → Sugerencia de Progresión → Reporte de Dolor → Ajuste de Carga.
  - **RF**: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
  - **Hecho cuando**: El flujo completo se ejecuta de inicio a fin en una sesión simulada sin errores de consola ni discrepancias en base de datos.
