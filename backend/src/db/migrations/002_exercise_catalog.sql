-- =====================================================================
-- Migration 002: Exercise Catalog (exercise, exercise_alternative)
-- Source: specs/001-SmartForge-mvp/plan.md §2, docs/constitution.md §5
-- =====================================================================

-- Table 4: Exercise (Catálogo de ejercicios con metadatos biomecánicos y multimedia)
CREATE TABLE IF NOT EXISTS exercise (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    movement_pattern VARCHAR(30) NOT NULL CHECK (
        movement_pattern IN ('empuje', 'tiron', 'rodilla_dominante', 'cadera_dominante', 'core')
    ),
    primary_muscle VARCHAR(30) NOT NULL CHECK (
        primary_muscle IN ('pecho', 'espalda', 'cuadriceps', 'isquiosurales', 'gluteos', 'hombros', 'biceps', 'triceps', 'pantorrillas', 'core')
    ),
    secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    is_compound BOOLEAN NOT NULL DEFAULT false,
    initial_load_ratio NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
    video_url TEXT NOT NULL,
    video_fallback_url TEXT NOT NULL,
    instructions TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 5: Exercise Alternative (Equivalencias biomecánicas para swaps y adaptaciones)
CREATE TABLE IF NOT EXISTS exercise_alternative (
    original_exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    alternative_exercise_id VARCHAR(100) NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
    similarity_score NUMERIC(3, 2) NOT NULL CHECK (similarity_score BETWEEN 0.00 AND 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (original_exercise_id, alternative_exercise_id),
    CONSTRAINT check_not_self_alternative CHECK (original_exercise_id <> alternative_exercise_id)
);

-- Indexes for efficient catalog querying, filtering and swap lookups
CREATE INDEX IF NOT EXISTS idx_exercise_movement_pattern ON exercise(movement_pattern) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exercise_primary_muscle ON exercise(primary_muscle) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exercise_equipment_id ON exercise(equipment_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exercise_is_compound ON exercise(is_compound);
CREATE INDEX IF NOT EXISTS idx_exercise_alternative_original ON exercise_alternative(original_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternative_alt ON exercise_alternative(alternative_exercise_id);
