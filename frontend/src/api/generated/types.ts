/**
 * AUTO-GENERATED FILE FROM contract/openapi.yaml. DO NOT EDIT DIRECTLY.
 * Source of truth: Constitution §1, RNF-07.
 */
export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzado';

export type TrainingGoal = 'hipertrofia' | 'fuerza' | 'mixto';

export type PeriodizationType = 'lineal' | 'ondulante';

export type MesocycleStatus = 'active' | 'completed' | 'cancelled' | 'archived' | 'deload_skipped';

export type SwapReason = 'falta_equipamiento' | 'preferencia_personal' | 'molestia_articular';

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export type Joint = 'hombro' | 'codo' | 'muneca' | 'columna_lumbar' | 'cadera' | 'rodilla' | 'tobillo';

export type BodySide = 'izquierda' | 'derecha' | 'bilateral';

export type PainIntensity = 'leve' | 'moderada' | 'severa';

export type JointPainItem = {
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
};

export type CheckInRequest = {
  fatigue_level: number;
  joint_pains: JointPainItem[];
};

export type CheckInResponse = {
  id: string;
  session_id: string;
  fatigue_level: number;
  joint_pains: JointPainItem[];
  created_at: string;
};

export type CreateSetLogRequest = {
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  rir: number;
  client_timestamp: string;
};

export type UpdateSetLogRequest = {
  reps_completed?: number;
  weight_kg?: number;
  rir?: number;
  client_timestamp?: string;
};

export type SetLog = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  rir: number;
  client_timestamp: string;
  created_at: string;
  updated_at?: string;
};

export type CreatePainReportRequest = {
  exercise_id: string;
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
  notes?: string;
};

export type PainReport = {
  id: string;
  session_id: string;
  exercise_id: string;
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
  notes?: string;
  created_at: string;
};

export type TrainingSession = {
  id: string;
  athlete_id: string;
  session_plan_id: string;
  status: SessionStatus;
  started_at: string;
  completed_at?: string;
  checkin?: CheckInResponse;
  set_logs?: SetLog[];
  pain_reports?: PainReport[];
};

export type ProgressionAction = 'increase_load' | 'increase_reps' | 'maintain' | 'reduce' | 'deload' | 'initial';

export type ProgressionSuggestion = {
  assignment_id: string;
  exercise_name: string;
  current_load_kg: number;
  suggestion: Record<string, unknown>;
  streak_count: number;
  window_sessions: number;
};

export type SyncRequest = {
  checkins?: CheckInRequest[];
  sets?: CreateSetLogRequest[];
  pain_reports?: CreatePainReportRequest[];
};

export type SyncResponse = {
  processed_count: number;
  conflicts_count: number;
  errors?: string[];
  synced_at: string;
};

export type MovementPattern = 'empuje' | 'tiron' | 'rodilla_dominante' | 'cadera_dominante' | 'core';

export type MuscleGroup = 'pecho' | 'espalda' | 'cuadriceps' | 'isquiosurales' | 'gluteos' | 'hombros' | 'biceps' | 'triceps' | 'pantorrillas' | 'core';

export type EquipmentItem = {
  id: string;
  name: string;
  category: string;
};

export type Exercise = {
  id: string;
  name: string;
  movement_pattern: MovementPattern;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment_id: string;
  is_compound: boolean;
  initial_load_ratio: number;
  video_url: string;
  video_fallback_url: string;
  instructions: string;
  is_active: boolean;
};

export type ExerciseAlternative = {
  original_exercise_id: string;
  alternative_exercise: Exercise;
  similarity_score: number;
};

export type ExerciseAssignment = {
  id: string;
  session_plan_id: string;
  exercise_id: string;
  exercise: Exercise;
  order_in_session: number;
  target_sets: number;
  target_reps: number;
  target_rir: number;
  target_load_kg: number;
  notes?: string;
  is_swapped: boolean;
};

export type SessionPlan = {
  id: string;
  week_plan_id: string;
  day_number: number;
  name: string;
  exercise_assignments: ExerciseAssignment[];
};

export type WeekPlan = {
  id: string;
  mesocycle_id: string;
  week_number: number;
  is_deload: boolean;
  sessions: SessionPlan[];
};

export type MesocycleDetail = {
  id: string;
  athlete_id: string;
  name: string;
  experience_level: ExperienceLevel;
  training_goal: TrainingGoal;
  periodization_type: PeriodizationType;
  duration_weeks: number;
  status: MesocycleStatus;
  start_date: string;
  end_date?: string;
  weeks: WeekPlan[];
};

export type ExercisesPerSessionPreference = {
  mode: 'manual' | 'recommended';
  customCount?: number | null;
};

export type GenerateMesocycleRequest = {
  target_goal?: TrainingGoal;
  custom_duration_weeks?: number;
  availableDays?: number;
  sessionDurationMinutes?: 30 | 45 | 60 | 75 | 90 | 120;
  exercisesPerSessionPreference?: ExercisesPerSessionPreference;
};

export type SwapExerciseRequest = {
  new_exercise_id: string;
  reason: SwapReason;
  notes?: string;
};

export type AthleteProfile = {
  id: string;
  google_id: string;
  email: string;
  name: string;
  age: number;
  weight_kg: number;
  experience_level: ExperienceLevel;
  training_goal: TrainingGoal;
  available_days_per_week: number;
  equipment: EquipmentItem[];
  created_at: string;
  updated_at: string;
};

export type CreateProfileRequest = {
  name: string;
  age: number;
  weight_kg: number;
  experience_level: ExperienceLevel;
  training_goal: TrainingGoal;
  available_days_per_week: number;
  equipment_ids: string[];
};

export type UpdateProfileRequest = {
  name?: string;
  weight_kg?: number;
  experience_level?: ExperienceLevel;
  training_goal?: TrainingGoal;
  available_days_per_week?: number;
  equipment_ids?: string[];
};

export type AuthResponse = {
  token: string;
  is_profile_complete: boolean;
  profile?: AthleteProfile;
};

export type ErrorDetail = {
  field: string;
  message: string;
};

export type ErrorResponse = {
  error: string;
  code: string;
};

export type ValidationErrorResponse = {
  error: string;
  code: string;
  details: ErrorDetail[];
};

export type WeightLogInput = {
  weightKg: number;
  loggedDate: string;
};

export type CreateWeightLogRequest = {
  weight_kg: number;
  logged_date: string;
};

export type UpdateWeightLogRequest = {
  weight_kg: number;
  logged_date?: string;
};

export type WeightLogItem = {
  id: string;
  athlete_id: string;
  weight_kg: number;
  calendar_week_start: string;
  logged_date: string;
  delta_kg?: number | null;
  created_at: string;
  updated_at?: string;
};

export type WeightLogResponse = {
  log: WeightLogItem;
};

export type WeightLogListResponse = {
  logs: WeightLogItem[];
};

export type RoutineTimeBlockItem = {
  duration_minutes: 30 | 45 | 60 | 75 | 90 | 120;
  min_exercises: number;
  max_exercises: number;
  recommended_exercises: number;
};

export type RoutineTimeBlockConfigResponse = {
  available_blocks: RoutineTimeBlockItem[];
};

export type RoutineTimeBlockConfig = {
  availableBlocks: RoutineTimeBlockItem[];
};

export type LoadType = 'bodyweight' | 'bodyweight_loadable' | 'assisted_bodyweight' | 'external_load';

export type MesocycleCreateV2Input = {
  availableDays: number;
  sessionDurationMinutes: 30 | 45 | 60 | 75 | 90 | 120;
  exercisesPerSessionPreference: ExercisesPerSessionPreference;
  targetGoal?: TrainingGoal;
  customDurationWeeks?: number;
};

export type ExerciseBaselineSnapshot = {
  loadText: string;
  e1rmKg: number;
};

export type ExerciseFinalPerformance = {
  loadText: string;
  e1rmKg: number;
  executed: boolean;
};

export type ExerciseProgressionDelta = {
  deltaKg: number;
  deltaPercent: number;
};

export type ExerciseProgressionItem = {
  exerciseId: string;
  exerciseName: string;
  loadType: LoadType;
  baseline: ExerciseBaselineSnapshot;
  final: ExerciseFinalPerformance;
  progress?: ExerciseProgressionDelta;
};

export type MesocycleHistoryItem = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate?: string | null;
  status: 'completed' | 'deload_skipped' | 'cancelled';
  adherencePercent: number;
  adherenceDetails?: string;
  exerciseProgressions: ExerciseProgressionItem[];
};

export type MesocycleHistoryResponse = {
  mesocycles: MesocycleHistoryItem[];
};

export type CancelActiveMesocycleRequest = {
  reason?: string;
};

export type CancelActiveMesocycleResponse = {
  status: 'cancelled' | 'completed' | 'deload_skipped';
  message: string;
  cancelled_at?: string | null;
};

