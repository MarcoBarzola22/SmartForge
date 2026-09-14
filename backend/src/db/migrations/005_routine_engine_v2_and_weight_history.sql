-- =====================================================================
-- Migration 005: Routine Engine V2 and Weight History
-- Source: specs/003-smartforge-routine-engine/plan.md §2, docs/constitution.md §5
-- Tasks: TASK-01 (RF-01, RF-02), TASK-02 (RF-03, RF-07), TASK-03 (RF-02, RF-06), TASK-04 (RF-05, RF-06)
-- =====================================================================

-- 1. Table: Body Weight Log (Registro e historial de peso corporal semanal del atleta)
CREATE TABLE IF NOT EXISTS body_weight_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg >= 30.0 AND weight_kg <= 300.0),
    calendar_week_start DATE NOT NULL, -- Lunes de la semana calendario (garantiza máximo 1 pesaje por semana)
    logged_date DATE NOT NULL,          -- Fecha asignada al pesaje
    logged_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_athlete_calendar_week UNIQUE (athlete_id, calendar_week_start)
);

-- Index for fast chronological lookup by athlete
CREATE INDEX IF NOT EXISTS idx_body_weight_athlete_date 
    ON body_weight_log(athlete_id, logged_date DESC);

-- 2. Alter Table: Mesocycle (Nuevos estados, parámetros V2 y unicidad activa)
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

-- Restricción de unicidad: Máximo un mesociclo activo por atleta (Constitución Art. 5 y RF-07 CA-07.1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_mesocycle_per_athlete 
    ON mesocycle(athlete_id) 
    WHERE status = 'active';

-- 3. Alter Table: Exercise (Taxonomía de carga de ejercicio: RF-06 CA-06.2)
ALTER TABLE exercise 
    ADD COLUMN IF NOT EXISTS load_type VARCHAR(30) NOT NULL DEFAULT 'external_load' 
    CHECK (load_type IN ('bodyweight', 'bodyweight_loadable', 'assisted_bodyweight', 'external_load'));

-- 4. Alter Table: Set Log (Trazabilidad inmutable de rendimiento: RF-02 CA-02.5, RF-06 CA-06.2)
ALTER TABLE set_log 
    ADD COLUMN IF NOT EXISTS load_type VARCHAR(30) NOT NULL DEFAULT 'external_load' 
    CHECK (load_type IN ('bodyweight', 'bodyweight_loadable', 'assisted_bodyweight', 'external_load')),
    ADD COLUMN IF NOT EXISTS additional_or_assistance_kg NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS athlete_weight_at_session_kg NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS computed_e1rm_kg NUMERIC(6, 2);

-- 5. Table: Mesocycle Baseline Snapshot (Punto de partida inmutable por ejercicio: RF-05, RF-06)
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

-- Index for fast lookup by mesocycle
CREATE INDEX IF NOT EXISTS idx_baseline_snapshot_mesocycle 
    ON mesocycle_baseline_snapshot(mesocycle_id);
