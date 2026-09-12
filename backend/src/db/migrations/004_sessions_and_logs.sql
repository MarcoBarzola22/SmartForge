-- =====================================================================
-- Migration 004: Training Sessions, Check-ins, Sets and Pain Reports
-- Source: specs/001-SmartForge-mvp/plan.md §2, docs/constitution.md §5
-- =====================================================================

-- Table 11: Training Session (Instancia real de entrenamiento ejecutada por el atleta)
CREATE TABLE IF NOT EXISTS session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    session_plan_id UUID REFERENCES session_plan(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Table 12: Check-in (Evaluación previa de fatiga del atleta para la sesión)
CREATE TABLE IF NOT EXISTS checkin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES session(id) ON DELETE CASCADE,
    fatigue_level INT NOT NULL CHECK (fatigue_level BETWEEN 1 AND 5),
    client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 13: Check-in Pain (Detalle de articulación con molestia identificada en el check-in)
CREATE TABLE IF NOT EXISTS checkin_pain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES checkin(id) ON DELETE CASCADE,
    joint VARCHAR(30) NOT NULL CHECK (joint IN ('hombro', 'codo', 'muneca', 'columna_lumbar', 'cadera', 'rodilla', 'tobillo')),
    side VARCHAR(20) NOT NULL CHECK (side IN ('izquierda', 'derecha', 'bilateral')),
    intensity VARCHAR(20) NOT NULL CHECK (intensity IN ('leve', 'moderada', 'severa')),
    client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 14: Set Log (Registro de serie realizada con peso, repeticiones y RIR)
CREATE TABLE IF NOT EXISTS set_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    exercise_assignment_id UUID REFERENCES exercise_assignment(id) ON DELETE SET NULL,
    set_number INT NOT NULL CHECK (set_number >= 1),
    reps_completed INT NOT NULL CHECK (reps_completed >= 0),
    weight_kg NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (weight_kg >= 0),
    rir INT NOT NULL CHECK (rir BETWEEN 0 AND 5),
    client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 15: Exercise Pain Report (Reporte de molestia articular durante la ejecución del ejercicio)
CREATE TABLE IF NOT EXISTS exercise_pain_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE RESTRICT,
    exercise_assignment_id UUID REFERENCES exercise_assignment(id) ON DELETE SET NULL,
    joint VARCHAR(30) NOT NULL CHECK (joint IN ('hombro', 'codo', 'muneca', 'columna_lumbar', 'cadera', 'rodilla', 'tobillo')),
    side VARCHAR(20) NOT NULL CHECK (side IN ('izquierda', 'derecha', 'bilateral')),
    intensity VARCHAR(20) NOT NULL CHECK (intensity IN ('leve', 'moderada', 'severa')),
    notes TEXT,
    client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance, foreign keys, and offline synchronization
CREATE INDEX IF NOT EXISTS idx_session_athlete_id ON session(athlete_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_session_plan_id ON session(session_plan_id);
CREATE INDEX IF NOT EXISTS idx_session_client_timestamp ON session(client_timestamp);

CREATE INDEX IF NOT EXISTS idx_checkin_session_id ON checkin(session_id);
CREATE INDEX IF NOT EXISTS idx_checkin_client_timestamp ON checkin(client_timestamp);

CREATE INDEX IF NOT EXISTS idx_checkin_pain_checkin_id ON checkin_pain(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_pain_client_timestamp ON checkin_pain(client_timestamp);

CREATE INDEX IF NOT EXISTS idx_set_log_session_id ON set_log(session_id);
CREATE INDEX IF NOT EXISTS idx_set_log_exercise_id ON set_log(exercise_id);
CREATE INDEX IF NOT EXISTS idx_set_log_exercise_assignment_id ON set_log(exercise_assignment_id);
CREATE INDEX IF NOT EXISTS idx_set_log_client_timestamp ON set_log(client_timestamp);

CREATE INDEX IF NOT EXISTS idx_exercise_pain_report_session_id ON exercise_pain_report(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_pain_report_exercise_id ON exercise_pain_report(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_pain_report_assignment_id ON exercise_pain_report(exercise_assignment_id);
CREATE INDEX IF NOT EXISTS idx_exercise_pain_report_client_timestamp ON exercise_pain_report(client_timestamp);
