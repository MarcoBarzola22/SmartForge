# PLAN-003 — Evolución del Perfil y Motor de Rutinas V2 — Plan Técnico de Implementación

> **Referencia:** `specs/003-smartforge-routine-engine/spec.md` y `docs/constitution.md`.  
> **Propósito:** Documento de diseño arquitectónico y de ingeniería técnica. No contiene código ejecutable de la aplicación; define la estructura de módulos, componentes de interfaz de usuario, modelo de datos relacional, contratos de interfaz, algoritmos en pseudocódigo, decisiones justificadas y estrategia de pruebas.

---

## 1. Estructura de módulos y componentes UI

```
SmartForge/
├── contract/
│   └── openapi.yaml                         # Actualización: esquemas Zod y endpoints para V2 (Constitución Art. 1)
├── backend/
│   ├── src/
│   │   ├── routes/                          # Capa de enrutamiento HTTP (Constitución Art. 3)
│   │   │   ├── body-weight.routes.ts        → RF-01, RF-02
│   │   │   ├── mesocycle.routes.ts          → RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09
│   │   │   └── routine-config.routes.ts     → RF-03, RF-04
│   │   ├── controllers/                     # Validación Zod y delegación a Services
│   │   │   ├── body-weight.controller.ts    → RF-01, RF-02
│   │   │   ├── mesocycle.controller.ts      → RF-03, RF-05, RF-06, RF-07, RF-08, RF-09
│   │   │   └── routine-config.controller.ts → RF-03, RF-04
│   │   ├── services/                        # Lógica de negocio pura (Constitución Art. 3)
│   │   │   ├── body-weight.service.ts       → RF-01, RF-02 (guarda 120h, calendario, carry-forward)
│   │   │   ├── routine-engine-v2.service.ts → RF-03, RF-04 (viabilidad temporal, DME, poda jerárquica)
│   │   │   ├── baseline-snapshot.service.ts → RF-05 (snapshot inmutable, normalización RIR)
│   │   │   ├── mesocycle-history.service.ts → RF-06 (e1RM híbrido Brzycki/Wathan, comparativas, adherencia)
│   │   │   └── mesocycle-lifecycle.service.ts → RF-07, RF-08, RF-09 (cancelación, offline sync, fatiga)
│   │   ├── repositories/                    # Consultas SQL con pg (Constitución Art. 3)
│   │   │   ├── body-weight.repository.ts    → RF-01, RF-02
│   │   │   ├── mesocycle.repository.ts      → RF-03, RF-07, RF-08
│   │   │   ├── baseline-snapshot.repository.ts → RF-05, RF-06
│   │   │   └── exercise.repository.ts       → RF-04, RF-06
│   │   ├── schemas/generated/               # DTOs y validadores generados desde openapi.yaml
│   │   └── db/migrations/
│   │       └── 005_routine_engine_v2_and_weight_history.sql → RF-01 a RF-08
│   └── tests/
│       ├── unit/                            # Tests unitarios de Services (Constitución Art. 4)
│       └── contract/                        # Tests de contrato contra OpenAPI (Constitución Art. 4)
└── frontend/
    └── src/
        ├── api/                             # Clientes HTTP tipados generados desde contrato
        ├── components/
        │   ├── weight/                      # Componentes de pesaje semanal (RF-01, RF-02)
        │   │   ├── WeightLogModal.tsx       → RF-01 (registro/edición con advertencia contextual)
        │   │   └── WeightHistoryList.tsx    → RF-02 (lista cronológica con deltas y opción de carga retroactiva)
        │   ├── mesocycle/                   # Asistente y visualización de mesociclos (RF-03 a RF-07)
        │   │   ├── MesocycleWizardV2.tsx    → RF-03, RF-04 (bloques fijos, selector dinámico N, validaciones)
        │   │   ├── CancellationModal.tsx    → RF-07 (diálogo destructivo, advertencia de datos y soporte offline)
        │   │   └── EmptyMesocycleState.tsx  → RF-07 (estado "Sin mesociclo activo" con CTA a nueva rutina)
        │   └── history/                     # Comparativa y progreso de marcas (RF-06)
        │       ├── MesocycleHistoryCard.tsx → RF-06 (tarjeta móvil apilada ≤ 390px, cero scroll horizontal)
        │       └── ExerciseProgressionCard.tsx → RF-06 (comparativa Inicio ➔ Cierre, desglose e1RM)
        ├── pages/
        │   ├── profile/ProfilePage.tsx      # Integración de sección "Evolución de Peso Corporal"
        │   ├── mesocycle/MesocyclePage.tsx  # Vista de ciclo activo, botón de anulación y navegación a historial
        │   └── routine/RoutineHistoryPage.tsx # Listado cronológico de mesociclos completados y cancelados
        └── stores/
            ├── offlineSync.store.ts         # Encolado idempotente de cancelación en IndexedDB (RF-07)
            └── routineConfig.store.ts       # Cache local de matriz de bloques de tiempo y recomendación N (RF-03)
```

---

## 2. Modelo de datos relacional y contratos API

### 2.1. Migración SQL DDL (`backend/src/db/migrations/005_routine_engine_v2_and_weight_history.sql`)
Garantiza el cumplimiento estricto del Art. 5 de la Constitución: claves foráneas explícitas, `ON DELETE` definido, integridad referencial y restricción de unicidad activa.

```sql
-- =====================================================================
-- Migration 005: Routine Engine V2, Weight History and Baseline Snapshots
-- Cubre: RF-01, RF-02, RF-03, RF-05, RF-06, RF-07, RF-08
-- =====================================================================

-- 1. Tabla de Historial de Peso Corporal (RF-01, RF-02)
CREATE TABLE IF NOT EXISTS body_weight_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg >= 30.0 AND weight_kg <= 300.0),
    calendar_week_start DATE NOT NULL, -- Lunes de la semana calendario (evita colisiones en misma semana)
    logged_date DATE NOT NULL,          -- Fecha asignada al pesaje
    logged_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_athlete_calendar_week UNIQUE (athlete_id, calendar_week_start)
);

CREATE INDEX IF NOT EXISTS idx_body_weight_athlete_date 
    ON body_weight_log(athlete_id, logged_date DESC);

-- 2. Modificaciones a Mesociclo (RF-03, RF-07, RF-08)
-- Soporte de estados 'cancelled' y 'archived', duración de bloque y ejercicios diarios
ALTER TABLE mesocycle 
    DROP CONSTRAINT IF EXISTS mesocycle_status_check;

ALTER TABLE mesocycle 
    ADD CONSTRAINT mesocycle_status_check 
    CHECK (status IN ('active', 'completed', 'cancelled', 'archived'));

ALTER TABLE mesocycle 
    ADD COLUMN IF NOT EXISTS session_duration_minutes INT 
    CHECK (session_duration_minutes IN (30, 45, 60, 75, 90, 120)),
    ADD COLUMN IF NOT EXISTS target_exercises_per_session INT 
    CHECK (target_exercises_per_session BETWEEN 2 AND 7),
    ADD COLUMN IF NOT EXISTS completion_reason VARCHAR(30) 
    CHECK (completion_reason IN ('normal', 'deload_skipped', 'cancelled_user', 'cancelled_injury')),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Unicidad estricta: Máximo un mesociclo activo por atleta (Constitución Art. 5 y RF-07 CA-07.1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_mesocycle_per_athlete 
    ON mesocycle(athlete_id) 
    WHERE status = 'active';

-- 3. Modificaciones al Catálogo de Ejercicios: Taxonomía de carga (RF-06 CA-06.2)
ALTER TABLE exercise 
    ADD COLUMN IF NOT EXISTS load_type VARCHAR(30) NOT NULL DEFAULT 'external_load' 
    CHECK (load_type IN ('bodyweight', 'bodyweight_loadable', 'assisted_bodyweight', 'external_load'));

-- 4. Tabla de Snapshot de Punto de Partida Inmutable (RF-05, RF-06)
CREATE TABLE IF NOT EXISTS mesocycle_baseline_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesocycle_id UUID NOT NULL REFERENCES mesocycle(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    baseline_load_kg NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (baseline_load_kg >= 0),
    baseline_reps INT NOT NULL CHECK (baseline_reps >= 1),
    baseline_e1rm_kg NUMERIC(6, 2) NOT NULL CHECK (baseline_e1rm_kg >= 0),
    athlete_bodyweight_kg NUMERIC(5, 2) NOT NULL CHECK (athlete_bodyweight_kg > 0),
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('history_rir_le_3', 'history_rir_normalized', 'experience_ratio_default')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mesocycle_exercise_snapshot UNIQUE (mesocycle_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_baseline_snapshot_mesocycle 
    ON mesocycle_baseline_snapshot(mesocycle_id);

-- 5. Modificaciones a Set Log para Trazabilidad Inmutable de Rendimiento (RF-02 CA-02.5, RF-06 CA-06.2)
ALTER TABLE set_log 
    ADD COLUMN IF NOT EXISTS load_type VARCHAR(30) NOT NULL DEFAULT 'external_load' 
    CHECK (load_type IN ('bodyweight', 'bodyweight_loadable', 'assisted_bodyweight', 'external_load')),
    ADD COLUMN IF NOT EXISTS additional_or_assistance_kg NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS athlete_weight_at_session_kg NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS computed_e1rm_kg NUMERIC(6, 2);
```

### 2.2. Esquemas OpenAPI / Zod (Contrato Único - Constitución Art. 1)

#### Endpoints nuevos y modificados en `contract/openapi.yaml`:
- `GET /athletes/me/weight-logs`: Lista cronológica con deltas de peso (RF-02).
- `POST /athletes/me/weight-logs`: Registro de pesaje semanal con guarda de 120 h (RF-01).
- `PUT /athletes/me/weight-logs/{id}`: Edición de valor y fecha en misma semana (RF-02).
- `GET /routines/config/time-blocks`: Matriz de viabilidad y recomendación dinámica de ejercicios (RF-03, RF-04).
- `POST /mesocycles`: Creación de mesociclo V2 con captura de snapshot (RF-03, RF-04, RF-05).
- `POST /mesocycles/active/cancel`: Cancelación con preservación de historial (RF-07).
- `GET /mesocycles/history`: Historial con comparativas de 1RM estimado (RF-06).

```yaml
components:
  schemas:
    WeightLogInput:
      type: object
      required: [weightKg, loggedDate]
      properties:
        weightKg:
          type: number
          minimum: 30.0
          maximum: 300.0
          multipleOf: 0.1
          example: 74.5
        loggedDate:
          type: string
          format: date
          example: "2026-09-14"

    WeightLogItem:
      type: object
      required: [id, weightKg, calendarWeekStart, loggedDate, deltaKg]
      properties:
        id: { type: string, format: uuid }
        weightKg: { type: number }
        calendarWeekStart: { type: string, format: date }
        loggedDate: { type: string, format: date }
        deltaKg: { type: number, nullable: true }

    RoutineTimeBlockConfig:
      type: object
      required: [availableBlocks]
      properties:
        availableBlocks:
          type: array
          items:
            type: object
            required: [durationMinutes, minExercises, maxExercises, recommendedExercises]
            properties:
              durationMinutes: { type: integer, enum: [30, 45, 60, 75, 90, 120] }
              minExercises: { type: integer, example: 2 }
              maxExercises: { type: integer, example: 4 }
              recommendedExercises: { type: integer, example: 3 }

    MesocycleCreateV2Input:
      type: object
      required: [availableDays, sessionDurationMinutes, exercisesPerSessionPreference]
      properties:
        availableDays: { type: integer, minimum: 1, maximum: 7 }
        sessionDurationMinutes: { type: integer, enum: [30, 45, 60, 75, 90, 120] }
        exercisesPerSessionPreference:
          type: object
          required: [mode]
          properties:
            mode: { type: string, enum: [manual, recommended] }
            customCount: { type: integer, minimum: 2, maximum: 7, nullable: true }

    MesocycleHistoryItem:
      type: object
      required: [id, name, goal, startDate, status, adherencePercent, exerciseProgressions]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        goal: { type: string }
        startDate: { type: string, format: date }
        endDate: { type: string, format: date, nullable: true }
        status: { type: string, enum: [completed, deload_skipped, cancelled] }
        adherencePercent: { type: integer, minimum: 0, maximum: 100 }
        adherenceDetails: { type: string }
        exerciseProgressions:
          type: array
          items:
            type: object
            required: [exerciseId, exerciseName, loadType, baseline, final]
            properties:
              exerciseId: { type: string }
              exerciseName: { type: string }
              loadType: { type: string, enum: [bodyweight, bodyweight_loadable, assisted_bodyweight, external_load] }
              baseline:
                type: object
                required: [loadText, e1rmKg]
                properties:
                  loadText: { type: string }
                  e1rmKg: { type: number }
              final:
                type: object
                required: [loadText, e1rmKg, executed]
                properties:
                  loadText: { type: string }
                  e1rmKg: { type: number }
                  executed: { type: boolean }
              progress:
                type: object
                required: [deltaKg, deltaPercent]
                properties:
                  deltaKg: { type: number }
                  deltaPercent: { type: number }
```

---

## 3. Algoritmo de cálculo para el Motor de Rutinas V2

### 3.1. Estimación de tiempo por sesión y viabilidad en semana pico (RF-04)

```typescript
// ALGORITMO 1: Validación de Viabilidad Temporal en Semana Pico
function validateSessionFeasibility(
  durationMinutes: number,
  exercises: ExercisePlanned[],
  isPeakWeek: boolean
): FeasibilityResult {
  const WARMUP_TIME_MINUTES = 8; // Calentamiento y aproximaciones basales
  const availableTrainingMinutes = durationMinutes - WARMUP_TIME_MINUTES;

  let totalEstimatedSeconds = 0;

  for (const ex of exercises) {
    // Semana pico toma el máximo de series del bloque (ej. 3 o 4)
    const sets = isPeakWeek ? ex.peakSets : ex.baseSets;
    
    // Multiplicador biomecánico: 1.8x para ejercicios unilaterales
    const setDurationSeconds = ex.isUnilateral ? 80 : 45;
    
    // Descanso fisiológico según tipo de ejercicio
    const restDurationSeconds = ex.isCompound ? 150 : 75; // 2.5 min vs 1.25 min

    // Tiempo total por ejercicio: (duración_serie * sets) + (descanso * (sets - 1)) + transición
    const exerciseTotalSeconds = (setDurationSeconds * sets) + 
                                 (restDurationSeconds * (sets - 1)) + 
                                 90; // 1.5 min de ajuste/cambio de máquina

    totalEstimatedSeconds += exerciseTotalSeconds;
  }

  const totalEstimatedMinutes = Math.ceil(totalEstimatedSeconds / 60);

  if (totalEstimatedMinutes <= availableTrainingMinutes) {
    return { isFeasible: true, estimatedMinutes: totalEstimatedMinutes + WARMUP_TIME_MINUTES };
  } else {
    const deficitMinutes = (totalEstimatedMinutes + WARMUP_TIME_MINUTES) - durationMinutes;
    return {
      isFeasible: false,
      deficitMinutes,
      maxFeasibleExercises: calculateMaxExercisesForDuration(durationMinutes, exercises[0].experienceLevel),
      reason: `La sesión requiere ${totalEstimatedMinutes + WARMUP_TIME_MINUTES} min para series y pausas fisiológicas, superando tus ${durationMinutes} min asignados.`
    };
  }
}
```

### 3.2. Poda jerárquica ante el techo de 24 series/músculo/semana (RF-04 CA-04.6)

```typescript
// ALGORITMO 2: Regla Jerárquica de Poda de Volumen Semanal
function applyHierarchicalPruning(
  weeklyPlan: SessionPlan[],
  targetMuscleGroup: MuscleGroup
): SessionPlan[] {
  const MAX_SAFE_SETS = 24;
  let totalMuscleSets = calculateWeeklySetsForMuscle(weeklyPlan, targetMuscleGroup);

  if (totalMuscleSets <= MAX_SAFE_SETS) {
    return weeklyPlan; // Dentro del rango seguro
  }

  // PASO 1: Podar ejercicios monoarticulares / aislamiento
  for (const session of weeklyPlan) {
    for (const ex of session.exercises.filter(e => e.muscle === targetMuscleGroup && !e.isCompound)) {
      while (ex.targetSets > 2 && totalMuscleSets > MAX_SAFE_SETS) {
        ex.targetSets -= 1;
        totalMuscleSets -= 1;
      }
      if (totalMuscleSets <= MAX_SAFE_SETS) break;
    }
    if (totalMuscleSets <= MAX_SAFE_SETS) break;
  }

  // PASO 2: Podar accesorios compuestos secundarios si persiste el exceso
  if (totalMuscleSets > MAX_SAFE_SETS) {
    for (const session of weeklyPlan) {
      for (const ex of session.exercises.filter(e => e.muscle === targetMuscleGroup && e.isSecondaryCompound)) {
        while (ex.targetSets > 2 && totalMuscleSets > MAX_SAFE_SETS) {
          ex.targetSets -= 1;
          totalMuscleSets -= 1;
        }
        if (totalMuscleSets <= MAX_SAFE_SETS) break;
      }
      if (totalMuscleSets <= MAX_SAFE_SETS) break;
    }
  }

  // NOTA: Los ejercicios compuestos principales NUNCA se podan por debajo de 3 series.
  return weeklyPlan;
}
```

### 3.3. Cálculo de Punto de Partida y Fuerza Máxima Estimada (RF-05, RF-06)

```typescript
// ALGORITMO 3: Cálculo Híbrido de 1RM Estimado y Captura de Baseline
function computeE1RM(loadType: LoadType, rawLoadKg: number, reps: number, athleteWeightKg: number): number {
  let totalMassKg = 0;

  switch (loadType) {
    case 'bodyweight':
      totalMassKg = athleteWeightKg;
      break;
    case 'bodyweight_loadable':
      totalMassKg = athleteWeightKg + rawLoadKg; // rawLoadKg = lastre positivo
      break;
    case 'assisted_bodyweight':
      totalMassKg = Math.max(1.0, athleteWeightKg - rawLoadKg); // rawLoadKg = asistencia
      break;
    case 'external_load':
      totalMassKg = rawLoadKg;
      break;
  }

  const cappedReps = Math.min(30, reps); // Saturación a 30 reps para estabilidad

  if (cappedReps <= 10) {
    // Fórmula de Brzycki
    return Number((totalMassKg / (1.0278 - (0.0278 * cappedReps))).toFixed(2));
  } else {
    // Fórmula de Wathan (evita asíntotas)
    const denominator = 48.8 + (53.8 * Math.exp(-0.075 * cappedReps));
    return Number(((100 * totalMassKg) / denominator).toFixed(2));
  }
}

function resolveBaselineSnapshotForExercise(
  exerciseId: string,
  athleteId: string,
  currentWeightKg: number,
  experienceLevel: ExperienceLevel
): BaselineSnapshotData {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentSets = getSetLogsForExercise(athleteId, exerciseId, ninetyDaysAgo);

  // 1. Buscar series efectivas con RIR <= 3
  const validSets = recentSets.filter(s => s.rir <= 3);
  if (validSets.length > 0) {
    // Encontrar la serie con mayor e1RM
    const bestSet = validSets.reduce((best, curr) => {
      const e1rmCurr = computeE1RM(curr.loadType, curr.weightKg, curr.reps, currentWeightKg);
      const e1rmBest = computeE1RM(best.loadType, best.weightKg, best.reps, currentWeightKg);
      if (e1rmCurr > e1rmBest) return curr;
      if (e1rmCurr === e1rmBest && curr.weightKg > best.weightKg) return curr; // Desempate por kg
      return best;
    });

    return {
      loadKg: bestSet.weightKg,
      reps: bestSet.reps,
      e1rmKg: computeE1RM(bestSet.loadType, bestSet.weightKg, bestSet.reps, currentWeightKg),
      sourceType: 'history_rir_le_3'
    };
  }

  // 2. Normalizar series con RIR 4 o 5 si existen
  const submaxSets = recentSets.filter(s => s.rir === 4 || s.rir === 5);
  if (submaxSets.length > 0) {
    const highestSubmax = submaxSets.reduce((prev, curr) => curr.weightKg > prev.weightKg ? curr : prev);
    const normalizedLoad = highestSubmax.weightKg * (1 + (highestSubmax.rir - 2) * 0.025);
    return {
      loadKg: normalizedLoad,
      reps: highestSubmax.reps,
      e1rmKg: computeE1RM(highestSubmax.loadType, normalizedLoad, highestSubmax.reps, currentWeightKg),
      sourceType: 'history_rir_normalized'
    };
  }

  // 3. Fallback a ratio predeterminado según nivel y peso corporal (SPEC-001 CA-02.5)
  const defaultRatio = getDefaultRatioForExercise(exerciseId, experienceLevel);
  const estimatedLoad = Number((currentWeightKg * defaultRatio).toFixed(1));
  return {
    loadKg: estimatedLoad,
    reps: 10,
    e1rmKg: computeE1RM('external_load', estimatedLoad, 10, currentWeightKg),
    sourceType: 'experience_ratio_default'
  };
}
```

---

## 4. Decisiones técnicas justificadas y alternativas descartadas

| Decisión Técnica | Justificación | Alternativa Descartada y Motivo de Rechazo |
| :--- | :--- | :--- |
| **Piso de 1.0 kg en calisténicos asistidos (`assisted_bodyweight`)** (RF-06 CA-06.2) | Permite registrar matemáticamente la progresión de atletas novatos cuando la asistencia es muy cercana al peso corporal, evitando divisiones por cero y preservando la sensibilidad del delta de 1RM est. | **Piso fijo de 10.0 kg:** Descartado porque si un atleta pesa 55 kg y usa 50 kg de asistencia y luego 45 kg, ambas sesiones se saturaban a 10 kg, mostrando falsamente un 0% de progreso. |
| **Resolución de peso corporal por *Carry-Forward*** (RF-06 CA-06.3) | Toma el último pesaje con fecha ≤ a la fecha de la sesión. Es determinista, computacionalmente ligero y modela la realidad biológica de que el peso de los días previos es el valor vigente. | **Interpolación lineal entre pesajes:** Descartada porque introduce dependencia del futuro (requiere un pesaje posterior que puede no ocurrir) y recalcula valores pasados de forma no determinista. |
| **Modelo Híbrido Brzycki (≤10 reps) + Wathan (11–30 reps)** (RF-06 CA-06.4) | Brzycki es el estándar de máxima precisión para rangos pesados (≤10 reps). Wathan es asintótica y no presenta singularidades con denominador negativo en series de 15 a 30 repeticiones. | **Fórmula única de Brzycki o Epley para todo:** Descartada porque Brzycki diverge a infinito cuando reps se acercan a 36, y Epley sobreestima excesivamente la fuerza en repeticiones altas. |
| **Restricción condicional `UNIQUE WHERE status = 'active'` en PostgreSQL** (RF-07 CA-07.1) | Cumple con el Art. 5 de la Constitución garantizando integridad a nivel de base de datos e impidiendo que condiciones de carrera o sincronizaciones offline creen múltiples ciclos activos. | **Validación exclusivamente en capa de Service:** Descartada porque ante peticiones concurrentes de dos dispositivos podría violarse la regla de unicidad por race condition. |
| **Tarjeta vertical apilada (*Card Layout*) en historial** (RF-06 CA-06.4) | Garantiza el cumplimiento del Art. 2 de la Constitución (Mobile-First ≤ 390px, cero scroll horizontal) y permite mostrar nombres largos, inicio, cierre y deltas con legibilidad ergonómica. | **Tabla tradicional de 4 o 5 columnas:** Descartada porque en pantallas de 390px fuerza el desbordamiento y scroll horizontal, expresamente prohibido por la Constitución. |
| **Resolución de conflictos offline: Completado prevalece sobre Cancelación** (RF-07 CA-07.5) | El esfuerzo de entrenamiento efectivamente realizado y cerrado en el gimnasio tiene mayor jerarquía ontológica que una solicitud de cancelación desincronizada generada fuera de línea. | **Last-Write-Wins (LWW) por timestamp:** Descartado porque un dispositivo desfasado con reloj incorrecto podría anular destructivamente un mesociclo ya completado con éxito. |
| **Guarda temporal de 120 h evaluada sobre fechas de calendario** (RF-01 CA-01.2, RF-02 CA-02.2) | Permite que un atleta cargue legítimamente en lote semanas históricas olvidadas, bloqueando únicamente intentos de registrar dos pesajes en la misma semana o con menos de 5 días de diferencia real. | **Guarda sobre el timestamp de la transacción HTTP:** Descartada porque impedía la carga retroactiva legítima de múltiples pesajes en una misma sentada. |

---

## 5. Estrategia de tests (Constitución Art. 4)

De acuerdo con el Art. 4 de la Constitución, todo PR debe incluir tests unitarios del Service afectado y tests de contrato contra el esquema OpenAPI, completando la suite en < 3 minutos.

### 5.1. Tests unitarios de Services (`backend/tests/unit/`)
1. **`body-weight.service.test.ts` (RF-01, RF-02):**
   - Validación de rango (30–300 kg).
   - Bloqueo de segundo registro en la misma semana calendario habilitando modo edición.
   - Rechazo de nuevo registro con intervalo < 120 horas respecto al pesaje previo adyacente.
   - Carga retroactiva exitosa de múltiples semanas respetando las fechas del evento.
   - Inmutabilidad: verificar que editar un peso semanal no modifica los `computed_e1rm_kg` de `set_log` pasados.
2. **`routine-engine-v2.service.test.ts` (RF-03, RF-04):**
   - Viabilidad temporal en semana pico considerando factor 1.8x para unilaterales y descansos.
   - Bloqueo con mensaje pedagógico ante selecciones manuales incompatibles (ej. 30 min y 5 ejercicios).
   - Verificación de que la opción *"Recomendado por SmartForge"* es siempre viable para todos los bloques fijos.
   - Activación de Dosis Mínima Efectiva (DME: 6–8 series) ante bloques reducidos.
   - Ejecución de la poda jerárquica (monoarticulares primero, accesorios después) al alcanzar el techo de 24 series.
3. **`baseline-snapshot.service.test.ts` (RF-05):**
   - Captura inmutable al formalizar el ciclo.
   - Selección de la serie con mayor e1RM entre series con RIR ≤ 3 (desempate por kg).
   - Normalización de cargas en series con RIR 4 o 5 mediante la fórmula de proximidad.
   - Fallback a ratios teóricos por nivel en atletas sin historial previo en 90 días.
4. **`mesocycle-history.service.test.ts` (RF-06):**
   - Cálculo de e1RM con Brzycki (≤10 reps) y Wathan (11–30 reps) y saturación en > 30 reps.
   - Cálculo de masa neta para `load_type`: bodyweight, loadable y assisted (con piso de 1.0 kg).
   - Resolución de peso vigente mediante *carry-forward*.
   - Cálculo de adherencia proporcional en sesiones parciales (< 50% de series).
5. **`mesocycle-lifecycle.service.test.ts` (RF-07, RF-08, RF-09):**
   - Cancelación exitosa: transición de ciclo a `cancelled` y sesiones pendientes a `cancelled` (sin `DELETE` físico).
   - Descarte limpio de ciclos cancelados con 0 sesiones del historial principal.
   - Clasificación como `Completado (Descarga omitida)` si se anula durante la semana de deload habiendo cumplido el 100% de la sobrecarga.
   - Preservación de registros completados para el motor de progresión.
   - Regla del 50% de avance para la rotación de accesorios y preservación absoluta de compuestos principales.
   - Programación de descarga temprana (semana 3) si el ciclo cancelado acumuló ≥ 4 semanas de sobrecarga previa.

### 5.2. Tests de contrato OpenAPI (`backend/tests/contract/`)
1. **`body-weight.contract.test.ts`:**
   - Valida payloads de `GET /athletes/me/weight-logs` y `POST /athletes/me/weight-logs` contra los esquemas Zod derivados de `openapi.yaml`.
2. **`mesocycle-v2.contract.test.ts`:**
   - Valida `POST /mesocycles` con los nuevos campos de duración fija y cantidad homogénea de ejercicios.
   - Valida `GET /routines/config/time-blocks` asegurando la estructura de bloques y recomendaciones.
   - Valida `POST /mesocycles/active/cancel` y la respuesta de estado `Sin mesociclo activo`.
   - Valida `GET /mesocycles/history` asegurando la presencia de las tarjetas y deltas de fuerza máxima estimada.

### 5.3. Tests de interfaz y ergonomía a una mano (`frontend/src/`)
1. **`MesocycleWizardV2.test.tsx`:**
   - Verificación de renderizado en viewport de 390px sin desbordamiento ni scroll horizontal.
   - Verificación de altura mínima de 48px en los botones de bloques de tiempo y selector de ejercicios.
   - Actualización reactiva del texto recomendado de *N* al cambiar el bloque de tiempo.
2. **`WeightLogModal.test.tsx`:**
   - Verificación de controles táctiles en la mitad inferior de la pantalla.
   - Advertencia contextual visible al entrar en modo edición.
3. **`CancellationModal.test.tsx`:**
   - Verificación del diálogo de confirmación destructiva y funcionamiento sin red (IndexedDB).

---

## 6. Cobertura de requisitos funcionales

| Requisito Funcional | Componente Backend | Componente UI Frontend | Modelo de Datos / DDL | Test Automatizado |
| :--- | :--- | :--- | :--- | :--- |
| **RF-01 (Registro semanal de peso y guarda 120h)** | `body-weight.service.ts` | `WeightLogModal.tsx` | Tabla `body_weight_log` | `body-weight.service.test.ts` |
| **RF-02 (Historial, edición e inmutabilidad)** | `body-weight.service.ts` | `WeightHistoryList.tsx` | Tabla `body_weight_log`, inmutabilidad en `set_log` | `body-weight.service.test.ts` |
| **RF-03 (Parámetros Motor V2 y homogeneidad)** | `routine-engine-v2.service.ts` | `MesocycleWizardV2.tsx` | Campos en `mesocycle`, contrato `/routines/config/time-blocks` | `routine-engine-v2.service.test.ts` |
| **RF-04 (Viabilidad, DME y poda jerárquica)** | `routine-engine-v2.service.ts` | `MesocycleWizardV2.tsx` | Algoritmo 1 y 2 en Service | `routine-engine-v2.service.test.ts` |
| **RF-05 (Snapshot de inicio y normalización)** | `baseline-snapshot.service.ts` | `MesocycleWizardV2.tsx` | Tabla `mesocycle_baseline_snapshot` | `baseline-snapshot.service.test.ts` |
| **RF-06 (Historial, e1RM y taxonomía de carga)** | `mesocycle-history.service.ts` | `MesocycleHistoryCard.tsx`, `ExerciseProgressionCard.tsx` | Campo `load_type` en `exercise` y `set_log`, fórmulas Algoritmo 3 | `mesocycle-history.service.test.ts` |
| **RF-07 (Cancelación, offline y unicidad)** | `mesocycle-lifecycle.service.ts` | `CancellationModal.tsx`, `EmptyMesocycleState.tsx` | `UNIQUE` en `mesocycle`, estados en `session` | `mesocycle-lifecycle.service.test.ts` |
| **RF-08 (Preservación, rotación 50% y descarga temprana)** | `mesocycle-lifecycle.service.ts` | `RoutineHistoryPage.tsx` | Reglas en Service, índices relacionales | `mesocycle-lifecycle.service.test.ts` |
| **RF-09 (Cambio de disponibilidad a mitad de ciclo)** | `mesocycle.controller.ts` | `ProfilePage.tsx` | Flujo educativo y CTA a cancelación | `mesocycle.contract.test.ts` |
