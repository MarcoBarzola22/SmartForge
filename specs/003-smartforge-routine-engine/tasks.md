# TASKS-003 — Evolución del Perfil y Motor de Rutinas V2 — Plan de Tareas de Implementación

> **Referencia:** `specs/003-smartforge-routine-engine/spec.md`, `specs/003-smartforge-routine-engine/plan.md` y `docs/constitution.md`.  
> **Estimación por tarea:** 20–30 minutos (tareas atómicas, independientes y secuenciadas lógicamente).  
> **Convención:** Código, pruebas, commits y ramas en inglés; interfaz de usuario, mensajes de error y documentación en español (Constitución Art. 6).

---

## Índice de Fases

1. [Fase 1: Base de datos, DDL y migraciones](#fase-1-base-de-datos-ddl-y-migraciones)
2. [Fase 2: Contrato OpenAPI y esquemas Zod](#fase-2-contrato-openapi-y-esquemas-zod)
3. [Fase 3: Backend — Repositorios y acceso a datos](#fase-3-backend--repositorios-y-acceso-a-datos)
4. [Fase 4: Backend — Servicios y lógica de negocio](#fase-4-backend--servicios-y-lógica-de-negocio)
5. [Fase 5: Backend — Controladores, rutas y middlewares](#fase-5-backend--controladores-rutas-y-middlewares)
6. [Fase 6: Backend — Tests unitarios y de contrato](#fase-6-backend--tests-unitarios-y-de-contrato)
7. [Fase 7: Frontend — Clientes API y almacenes locales](#fase-7-frontend--clientes-api-y-almacenes-locales)
8. [Fase 8: Frontend — Componentes UI ergonómicos (Mobile-First ≤ 390px)](#fase-8-frontend--componentes-ui-ergonómicos-mobile-first--390px)
9. [Fase 9: Frontend — Integración de páginas y flujos](#fase-9-frontend--integración-de-páginas-y-flujos)
10. [Fase 10: Tests UI, verificación E2E y auditoría de CI](#fase-10-tests-ui-verificación-e2e-y-auditoría-de-ci)

---

## Fase 1: Base de datos, DDL y migraciones

- [x] **TASK-01**: Crear archivo de migración `005_routine_engine_v2_and_weight_history.sql` con la tabla `body_weight_log`.
  - **RF**: RF-01, RF-02
  - **Hecho cuando**: La tabla `body_weight_log` cuenta con FK hacia `athlete(id) ON DELETE CASCADE`, restricción `CHECK (weight_kg >= 30.0 AND weight_kg <= 300.0)`, restricción `UNIQUE (athlete_id, calendar_week_start)` e índice sobre `(athlete_id, logged_date DESC)`.

- [x] **TASK-02**: Modificar tabla `mesocycle` en la migración 005 para soportar nuevos estados, parámetros V2 y unicidad activa.
  - **RF**: RF-03, RF-07
  - **Hecho cuando**: La tabla `mesocycle` incluye columnas `session_duration_minutes` (30 a 120), `target_exercises_per_session` (2 a 7), `completion_reason`, `cancelled_at`, status ampliado a `cancelled`, y el índice único condicional `idx_unique_active_mesocycle_per_athlete` sobre `(athlete_id) WHERE status = 'active'` (Constitución Art. 5).

- [x] **TASK-03**: Modificar tablas `exercise` y `set_log` en la migración 005 para soportar la taxonomía de cargas y trazabilidad inmutable.
  - **RF**: RF-02, RF-06
  - **Hecho cuando**: La tabla `exercise` incorpora la columna `load_type` (`bodyweight`, `bodyweight_loadable`, `assisted_bodyweight`, `external_load`) y la tabla `set_log` añade `load_type`, `additional_or_assistance_kg`, `athlete_weight_at_session_kg` y `computed_e1rm_kg`.

- [x] **TASK-04**: Crear tabla `mesocycle_baseline_snapshot` en la migración 005 para almacenar la línea base de partida.
  - **RF**: RF-05, RF-06
  - **Hecho cuando**: La tabla `mesocycle_baseline_snapshot` se crea con FK a `mesocycle(id) ON DELETE CASCADE`, FK a `exercise(id) ON DELETE RESTRICT`, campos numéricos para carga y e1RM, tipo de fuente y restricción `UNIQUE (mesocycle_id, exercise_id)`.

- [x] **TASK-05**: Ejecutar y validar la migración 005 contra PostgreSQL local verificando integridad relacional y rollback.
  - **RF**: RF-01 a RF-08, Constitución Art. 5
  - **Hecho cuando**: `npm run db:migrate` en `backend/` ejecuta exitosamente la migración 005 sin errores de sintaxis y las relaciones foráneas quedan activas en la base de datos de desarrollo.

---

## Fase 2: Contrato OpenAPI y esquemas Zod

- [x] **TASK-06**: Definir esquemas y endpoints para peso corporal en `contract/openapi.yaml`.
  - **RF**: RF-01, RF-02, Constitución Art. 1
  - **Hecho cuando**: Las operaciones `GET /athletes/me/weight-logs`, `POST /athletes/me/weight-logs` y `PUT /athletes/me/weight-logs/{id}` quedan formalizadas con sus esquemas de request/response y validaciones de rango (30–300 kg).

- [x] **TASK-07**: Definir esquemas y endpoints para configuración de bloques de tiempo en `contract/openapi.yaml`.
  - **RF**: RF-03, RF-04, Constitución Art. 1
  - **Hecho cuando**: La operación `GET /routines/config/time-blocks` queda descrita en OpenAPI retornando la lista de bloques válidos (30 a 120 min), rangos y la recomendación por defecto de ejercicios *N*.

- [x] **TASK-08**: Actualizar endpoints de mesociclos en `contract/openapi.yaml` para generación V2, cancelación e historial.
  - **RF**: RF-03, RF-05, RF-06, RF-07, RF-08, Constitución Art. 1
  - **Hecho cuando**: `POST /mesocycles` acepta `sessionDurationMinutes` y `exercisesPerSessionPreference`; se define `POST /mesocycles/active/cancel` y `GET /mesocycles/history` con el esquema de tarjetas `MesocycleHistoryItem`.

- [x] **TASK-09**: Compilar y validar el contrato OpenAPI y generar los esquemas Zod derivados en `backend/src/schemas/generated/`.
  - **RF**: Constitución Art. 1
  - **Hecho cuando**: El comando de validación OpenAPI pasa con 0 advertencias y se generan los tipos y esquemas Zod para `WeightLogInput`, `RoutineTimeBlockConfig`, `MesocycleCreateV2Input` y `MesocycleHistoryItem`.

---

## Fase 3: Backend — Repositorios y acceso a datos

- [x] **TASK-10**: Implementar `body-weight.repository.ts` para persistencia y consultas de pesajes.
  - **RF**: RF-01, RF-02, RF-06
  - **Hecho cuando**: El repositorio provee métodos para insertar pesajes, actualizar pesajes existentes dentro de la misma semana, obtener historial cronológico y resolver el peso corporal vigente por carry-forward a una fecha dada.

- [x] **TASK-11**: Actualizar `mesocycle.repository.ts` con soporte para parámetros V2, cancelación y unicidad activa.
  - **RF**: RF-03, RF-07, RF-08
  - **Hecho cuando**: El repositorio permite cancelar el mesociclo activo actualizando su estado a `cancelled`, cancela en lote las sesiones no realizadas (`status = 'cancelled'`) y obtiene el ciclo activo respetando el índice único.

- [x] **TASK-12**: Implementar `baseline-snapshot.repository.ts` para registro y lectura de puntos de partida.
  - **RF**: RF-05, RF-06
  - **Hecho cuando**: El repositorio permite insertar en bloque los snapshots basales inmutables vinculados al nuevo mesociclo y recuperarlos filtrados por `mesocycle_id`.

- [x] **TASK-13**: Actualizar `exercise.repository.ts` para mapear el atributo `load_type` y alternativas compatibles.
  - **RF**: RF-04, RF-06
  - **Hecho cuando**: Las consultas de ejercicios devuelven tipado el campo `load_type` y permiten filtrar ejercicios compatibles según requerimiento de carga.

---

## Fase 4: Backend — Servicios y lógica de negocio

- [x] **TASK-14**: Implementar `body-weight.service.ts` con lógica de guarda de 120 h, calendario y edición controlada.
  - **RF**: RF-01, RF-02
  - **Hecho cuando**: El servicio valida la guarda de 120 horas entre fechas de pesaje adyacentes, permite edición de valor/día en la misma semana y habilita cargas retroactivas en lote sin violar la unicidad semanal.

- [x] **TASK-15**: Implementar algoritmo de viabilidad temporal en `routine-engine-v2.service.ts`.
  - **RF**: RF-03, RF-04
  - **Hecho cuando**: El servicio calcula la duración de la sesión en la semana pico sumando calentamiento, ejecución bilateral/unilateral (factor 1.8×) y descansos fisiológicos (≥60s monoarticular, ≥120s compuesto), bloqueando selecciones inviables con detalle pedagógico.

- [x] **TASK-16**: Implementar Dosis Mínima Efectiva (DME) y regla jerárquica de poda para techo de 24 series en `routine-engine-v2.service.ts`.
  - **RF**: RF-04
  - **Hecho cuando**: Ante tiempo reducido se ajustan series a DME (6–8 series); ante selecciones de alto volumen se podan series de monoarticulares y luego accesorios secundarios sin reducir los compuestos principales por debajo de 3 series ni superar 24 series semanales.

- [x] **TASK-17**: Implementar `baseline-snapshot.service.ts` con desempate de e1RM y normalización de RIR submáximo.
  - **RF**: RF-05
  - **Hecho cuando**: El servicio genera el snapshot inmutable seleccionando la serie con mayor e1RM (desempatando por kg) para RIR ≤ 3, normaliza a RIR 2 series con RIR 4–5 y utiliza ratios de catálogo como fallback cuando no hay datos en 90 días.

- [x] **TASK-18**: Implementar `mesocycle-history.service.ts` con modelo híbrido Brzycki/Wathan y taxonomía de cargas.
  - **RF**: RF-06
  - **Hecho cuando**: El servicio calcula el 1RM est. con Brzycki (≤10 reps) y Wathan (11–30 reps, saturando en >30), computa la masa neta para calisténicos asistidos con piso de 1.0 kg y calcula la adherencia proporcional para sesiones parciales (< 50% de series).

- [x] **TASK-19**: Implementar `mesocycle-lifecycle.service.ts` para cancelación controlada y preservación de datos.
  - **RF**: RF-07
  - **Hecho cuando**: La anulación del ciclo finaliza la sesión en curso si existiera, cancela las sesiones futuras sin `DELETE` físico, descarta del historial ciclos con 0 sesiones y clasifica como `Completado (Descarga omitida)` las anulaciones durante el deload con sobrecarga completa.

- [x] **TASK-20**: Implementar reglas de preservación de cargas básicas, rotación del 50% y descarga temprana en `mesocycle-lifecycle.service.ts`.
  - **RF**: RF-08
  - **Hecho cuando**: Los nuevos mesociclos preservan la carga acumulada en sentadilla/banca/peso muerto del ciclo cancelado, aplican la regla del 50% de avance para rotar accesorios y programan descarga en la semana 3 si se canceló con ≥ 4 semanas consecutivas previas.

---

## Fase 5: Backend — Controladores, rutas y middlewares

- [x] **TASK-21**: Implementar `body-weight.controller.ts` y registrar `body-weight.routes.ts`.
  - **RF**: RF-01, RF-02, Constitución Art. 3
  - **Hecho cuando**: Las rutas HTTP `/athletes/me/weight-logs` validan el input con esquemas Zod, invocan `body-weight.service.ts` y retornan códigos HTTP estándar (200, 201, 400, 409).

- [x] **TASK-22**: Implementar `routine-config.controller.ts` y registrar `routine-config.routes.ts`.
  - **RF**: RF-03, RF-04, Constitución Art. 3
  - **Hecho cuando**: La ruta `GET /routines/config/time-blocks` devuelve la matriz de viabilidad y recomendación de ejercicios *N* según la lógica centralizada del backend.

- [x] **TASK-23**: Actualizar `mesocycle.controller.ts` y `mesocycle.routes.ts` para soportar generación V2, cancelación e historial.
  - **RF**: RF-03, RF-05, RF-06, RF-07, RF-08, RF-09, Constitución Art. 3
  - **Hecho cuando**: Las rutas manejan la creación de ciclo V2, cancelación del ciclo activo, consulta del historial de tarjetas y el aviso pedagógico al intentar modificar disponibilidad a mitad de ciclo.

---

## Fase 6: Backend — Tests unitarios y de contrato

- [x] **TASK-24**: Crear test unitario `body-weight.service.test.ts`.
  - **RF**: RF-01, RF-02, Constitución Art. 4
  - **Hecho cuando**: La suite cubre validación de rango (30–300 kg), colisión en la misma semana, rechazo por intervalo < 120 h e inmutabilidad de registros calisténicos pasados, pasando al 100%.

- [x] **TASK-25**: Crear test unitario `routine-engine-v2.service.test.ts`.
  - **RF**: RF-03, RF-04, Constitución Art. 4
  - **Hecho cuando**: La suite cubre el cálculo de viabilidad con factor unilateral 1.8×, el bloqueo por déficit de tiempo, la opción recomendada viable y la poda jerárquica ante el techo de 24 series.

- [x] **TASK-26**: Crear tests unitarios `baseline-snapshot.service.test.ts` y `mesocycle-history.service.test.ts`.
  - **RF**: RF-05, RF-06, Constitución Art. 4
  - **Hecho cuando**: Las suites verifican la captura inmutable del snapshot, desempate de e1RM, cálculo híbrido Brzycki/Wathan, piso de 1.0 kg en calisténicos asistidos y adherencia proporcional en sesiones incompletas.

- [x] **TASK-27**: Crear test unitario `mesocycle-lifecycle.service.test.ts`.
  - **RF**: RF-07, RF-08, Constitución Art. 4
  - **Hecho cuando**: La suite verifica la cancelación con sesiones pendientes en estado `cancelled`, clasificación de descarga omitida, preservación de sobrecarga en compuestos principales y descarga temprana por fatiga acumulada.

- [x] **TASK-28**: Crear tests de contrato OpenAPI `body-weight.contract.test.ts` y `mesocycle-v2.contract.test.ts`.
  - **RF**: Constitución Art. 1, Art. 4
  - **Hecho cuando**: Todos los endpoints de peso corporal, configuración V2, cancelación e historial validan sus payloads de entrada y respuesta contra los esquemas Zod derivados de `openapi.yaml`.

---

## Fase 7: Frontend — Clientes API y almacenes locales

- [x] **TASK-29**: Implementar métodos cliente en `frontend/src/api/` para peso corporal, configuración V2 y mesociclos.
  - **RF**: RF-01, RF-02, RF-03, RF-06, RF-07, Constitución Art. 1
  - **Hecho cuando**: El frontend cuenta con funciones fuertemente tipadas `fetchWeightLogs()`, `createWeightLog()`, `fetchTimeBlockConfig()`, `createMesocycleV2()`, `cancelActiveMesocycle()` y `fetchMesocycleHistory()`.

- [x] **TASK-30**: Implementar `routineConfig.store.ts` para caché y cálculo reactivo de ejercicios recomendados.
  - **RF**: RF-03, RF-04
  - **Hecho cuando**: El store almacena la matriz de bloques de tiempo y recalcula instantáneamente en tiempo real el valor de *N* al cambiar el bloque seleccionado en el cliente.

- [x] **TASK-31**: Actualizar `offlineSync.store.ts` para soportar cancelación offline en IndexedDB con reconciliación determinista.
  - **RF**: RF-07, RNF-05
  - **Hecho cuando**: Si se cancela el ciclo sin red, se actualiza el estado local a `cancelled`, se guarda la mutación en IndexedDB y se sincroniza idempotentemente al recuperar conexión.

---

## Fase 8: Frontend — Componentes UI ergonómicos (Mobile-First ≤ 390px)

- [x] **TASK-32**: Implementar `WeightLogModal.tsx` para registro y edición semanal de peso.
  - **RF**: RF-01, RF-02, Constitución Art. 2, Art. 6
  - **Hecho cuando**: El modal se ubica en la mitad inferior de la pantalla (operable con una mano en ≤390px), posee botones ≥ 48px, valida rangos numéricos y muestra la advertencia contextual al editar datos históricos.

- [ ] **TASK-33**: Implementar `WeightHistoryList.tsx` para visualización cronológica de peso y pesajes retroactivos.
  - **RF**: RF-02, Constitución Art. 2
  - **Hecho cuando**: El componente lista los pesajes con su fecha, peso en kg y delta respecto a la semana previa, sin scroll horizontal, permitiendo seleccionar semanas vacías para carga retroactiva.

- [ ] **TASK-34**: Implementar `MesocycleWizardV2.tsx` con selección de bloques fijos uniformes y ejercicios por día.
  - **RF**: RF-03, RF-04, Constitución Art. 2
  - **Hecho cuando**: La interfaz permite seleccionar días (1–7), bloques fijos (30–120 min), conmutar entre recomendación dinámica o manual (2–7 ej/día) y muestra alertas pedagógicas ante combinaciones inviables.

- [ ] **TASK-35**: Implementar `CancellationModal.tsx` con diálogo de confirmación destructiva.
  - **RF**: RF-07, Constitución Art. 2, Art. 6
  - **Hecho cuando**: El diálogo explica claramente que se descartará la planificación futura pero se conservarán los pesos levantados, con botón destructivo de confirmación ≥ 48px y soporte de aviso offline.

- [ ] **TASK-36**: Implementar `EmptyMesocycleState.tsx` para el estado "Sin mesociclo activo".
  - **RF**: RF-07, Constitución Art. 2
  - **Hecho cuando**: Muestra un estado vacío estilizado en la vista principal con un CTA prominente a *"Generar nuevo mesociclo"* cuando el usuario no tiene una rutina activa.

- [ ] **TASK-37**: Implementar `MesocycleHistoryCard.tsx` y `ExerciseProgressionCard.tsx` en tarjetas verticales apiladas.
  - **RF**: RF-06, Constitución Art. 2, Art. 6
  - **Hecho cuando**: Cada tarjeta muestra nombre, grupo muscular, Punto de Partida, Carga Final alcanzada y el delta en kg sobre 1RM est. (`delta_kg = e1RM_cierre - e1RM_inicio`) y porcentaje, con cero scroll horizontal en ≤ 390px.

---

## Fase 9: Frontend — Integración de páginas y flujos

- [ ] **TASK-38**: Integrar módulo de peso corporal e historial en `ProfilePage.tsx` y advertencia de cambio de disponibilidad.
  - **RF**: RF-01, RF-02, RF-09
  - **Hecho cuando**: El atleta puede consultar y registrar su peso desde el perfil, y si intenta alterar días o tiempos con ciclo activo recibe el modal educativo sugiriendo cancelar y regenerar el ciclo.

- [ ] **TASK-39**: Integrar `MesocycleWizardV2`, botón de anulación y estado vacío en `MesocyclePage.tsx`.
  - **RF**: RF-03, RF-04, RF-05, RF-07
  - **Hecho cuando**: La página renderiza el asistente V2 para nuevos ciclos, el botón de cancelar en el ciclo activo y transiciona inmediatamente al estado vacío tras confirmar la cancelación.

- [ ] **TASK-40**: Integrar `RoutineHistoryPage.tsx` para listar mesociclos completados y cancelados.
  - **RF**: RF-06
  - **Hecho cuando**: La página carga el historial cronológico inverso distinguiendo con insignias visibles los ciclos *Completados*, *Completados (Descarga omitida)* y *Cancelados*, desplegando las tarjetas de progresión por ejercicio.

---

## Fase 10: Tests UI, verificación E2E y auditoría de CI

- [ ] **TASK-41**: Crear tests de componentes en `frontend/src/` (`WeightLogModal.test.tsx`, `MesocycleWizardV2.test.tsx`, `CancellationModal.test.tsx`).
  - **RF**: RF-01 a RF-07, Constitución Art. 4
  - **Hecho cuando**: Vitest ejecuta los tests de componentes verificando el flujo de registro de peso, cálculo reactivo de *N* en el wizard y confirmación de cancelación con 100% de éxito.

- [ ] **TASK-42**: Validar diseño mobile-first a una mano en viewport de 390px de ancho.
  - **RF**: Constitución Art. 2
  - **Hecho cuando**: Se comprueba programáticamente y visualmente que ningún elemento genera scroll horizontal (`document.body.scrollWidth <= 390`) y todos los botones primarios cumplen altura ≥ 48px en la mitad inferior.

- [ ] **TASK-43**: Ejecutar suite completa de CI (linters, typecheck, unit tests y contract tests).
  - **RF**: Constitución Art. 4, Art. 6
  - **Hecho cuando**: Los comandos `npm run lint`, `npm run typecheck` y `npm run test` pasan limpiamente con 0 errores en backend y frontend, completando la ejecución en menos de 3 minutos.
