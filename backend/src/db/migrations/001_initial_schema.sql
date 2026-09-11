-- =====================================================================
-- Migration 001: Initial Schema (equipment, athlete, athlete_equipment)
-- Source: specs/001-SmartForge-mvp/plan.md §2, docs/constitution.md §5
-- =====================================================================

-- Extension for UUID generation if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table 1: Equipment (Taxonomía cerrada de equipamiento)
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: Athlete (Perfil del atleta)
CREATE TABLE IF NOT EXISTS athlete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 16),
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 300),
    experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('principiante', 'intermedio', 'avanzado')),
    training_goal VARCHAR(20) NOT NULL CHECK (training_goal IN ('hipertrofia', 'fuerza', 'mixto')),
    available_days_per_week INT NOT NULL CHECK (available_days_per_week BETWEEN 1 AND 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Table 3: Athlete Equipment (Equipamiento accesible por el atleta)
CREATE TABLE IF NOT EXISTS athlete_equipment (
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (athlete_id, equipment_id)
);

-- Indexes for fast lookup and soft delete filtering
CREATE INDEX IF NOT EXISTS idx_athlete_google_id ON athlete(google_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_athlete_email ON athlete(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_athlete_equipment_athlete_id ON athlete_equipment(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_equipment_equipment_id ON athlete_equipment(equipment_id);
