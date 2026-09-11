-- =====================================================================
-- Migration 003: Mesocycles and Training Plans
-- Source: specs/001-SmartForge-mvp/plan.md §2, docs/constitution.md §5
-- =====================================================================

-- Table 6: Mesocycle (Mesociclo planificado de 4 a 8 semanas)
CREATE TABLE IF NOT EXISTS mesocycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('principiante', 'intermedio', 'avanzado')),
    training_goal VARCHAR(20) NOT NULL CHECK (training_goal IN ('hipertrofia', 'fuerza', 'mixto')),
    periodization_type VARCHAR(20) NOT NULL CHECK (periodization_type IN ('lineal', 'ondulante')),
    duration_weeks INT NOT NULL CHECK (duration_weeks BETWEEN 4 AND 8),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 7: Week Plan (Plan semanal dentro de un mesociclo)
CREATE TABLE IF NOT EXISTS week_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesocycle_id UUID NOT NULL REFERENCES mesocycle(id) ON DELETE CASCADE,
    week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 8),
    is_deload BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mesocycle_id, week_number)
);

-- Table 8: Session Plan (Plan de sesión para un día específico)
CREATE TABLE IF NOT EXISTS session_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_plan_id UUID NOT NULL REFERENCES week_plan(id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (week_plan_id, day_number)
);

-- Table 9: Exercise Assignment (Asignación de ejercicio a una sesión planificada)
CREATE TABLE IF NOT EXISTS exercise_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_plan_id UUID NOT NULL REFERENCES session_plan(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    order_in_session INT NOT NULL CHECK (order_in_session >= 1),
    target_sets INT NOT NULL CHECK (target_sets >= 1),
    target_reps INT NOT NULL CHECK (target_reps >= 1),
    target_rir INT NOT NULL CHECK (target_rir BETWEEN 0 AND 5),
    target_load_kg NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (target_load_kg >= 0),
    notes TEXT,
    is_swapped BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_plan_id, order_in_session)
);

-- Table 10: Exercise Swap (Historial de sustitución de ejercicios y motivo)
CREATE TABLE IF NOT EXISTS exercise_swap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES exercise_assignment(id) ON DELETE CASCADE,
    original_exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    new_exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('falta_equipamiento', 'preferencia_personal', 'molestia_articular')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and relationship lookups
CREATE INDEX IF NOT EXISTS idx_mesocycle_athlete_status ON mesocycle(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_week_plan_mesocycle_id ON week_plan(mesocycle_id);
CREATE INDEX IF NOT EXISTS idx_session_plan_week_plan_id ON session_plan(week_plan_id);
CREATE INDEX IF NOT EXISTS idx_exercise_assignment_session_plan_id ON exercise_assignment(session_plan_id);
CREATE INDEX IF NOT EXISTS idx_exercise_assignment_exercise_id ON exercise_assignment(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_swap_assignment_id ON exercise_swap(assignment_id);
