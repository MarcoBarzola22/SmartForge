/**
 * AUTO-GENERATED FILE FROM contract/openapi.yaml. DO NOT EDIT DIRECTLY.
 * Source of truth: Constitution §1, RNF-07.
 */
import { z } from 'zod';

export const ExperienceLevelSchema = z.enum(['principiante', 'intermedio', 'avanzado']);
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const TrainingGoalSchema = z.enum(['hipertrofia', 'fuerza', 'mixto']);
export type TrainingGoal = z.infer<typeof TrainingGoalSchema>;

export const PeriodizationTypeSchema = z.enum(['lineal', 'ondulante']);
export type PeriodizationType = z.infer<typeof PeriodizationTypeSchema>;

export const MesocycleStatusSchema = z.enum(['active', 'completed', 'cancelled', 'archived', 'deload_skipped']);
export type MesocycleStatus = z.infer<typeof MesocycleStatusSchema>;

export const SwapReasonSchema = z.enum(['falta_equipamiento', 'preferencia_personal', 'molestia_articular']);
export type SwapReason = z.infer<typeof SwapReasonSchema>;

export const SessionStatusSchema = z.enum(['in_progress', 'completed', 'cancelled']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const JointSchema = z.enum(['hombro', 'codo', 'muneca', 'columna_lumbar', 'cadera', 'rodilla', 'tobillo']);
export type Joint = z.infer<typeof JointSchema>;

export const BodySideSchema = z.enum(['izquierda', 'derecha', 'bilateral']);
export type BodySide = z.infer<typeof BodySideSchema>;

export const PainIntensitySchema = z.enum(['leve', 'moderada', 'severa']);
export type PainIntensity = z.infer<typeof PainIntensitySchema>;

export const JointPainItemSchema = z.object({
  joint: JointSchema,
  side: BodySideSchema,
  intensity: PainIntensitySchema
});
export type JointPainItem = z.infer<typeof JointPainItemSchema>;

export const CheckInRequestSchema = z.object({
  fatigue_level: z.number().int().min(1).max(5),
  joint_pains: z.array(JointPainItemSchema)
});
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;

export const CheckInResponseSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  fatigue_level: z.number().int().min(1).max(5),
  joint_pains: z.array(JointPainItemSchema),
  created_at: z.string()
});
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;

export const CreateSetLogRequestSchema = z.object({
  exercise_id: z.string(),
  set_number: z.number().int().min(1),
  reps_completed: z.number().int().min(0),
  weight_kg: z.number().min(0),
  rir: z.number().int().min(0).max(5),
  client_timestamp: z.string()
});
export type CreateSetLogRequest = z.infer<typeof CreateSetLogRequestSchema>;

export const UpdateSetLogRequestSchema = z.object({
  reps_completed: z.number().int().min(0).optional(),
  weight_kg: z.number().min(0).optional(),
  rir: z.number().int().min(0).max(5).optional(),
  client_timestamp: z.string().optional()
});
export type UpdateSetLogRequest = z.infer<typeof UpdateSetLogRequestSchema>;

export const SetLogSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  exercise_id: z.string(),
  set_number: z.number().int(),
  reps_completed: z.number().int(),
  weight_kg: z.number(),
  rir: z.number().int().min(0).max(5),
  client_timestamp: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional()
});
export type SetLog = z.infer<typeof SetLogSchema>;

export const CreatePainReportRequestSchema = z.object({
  exercise_id: z.string(),
  joint: JointSchema,
  side: BodySideSchema,
  intensity: PainIntensitySchema,
  notes: z.string().optional()
});
export type CreatePainReportRequest = z.infer<typeof CreatePainReportRequestSchema>;

export const PainReportSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  exercise_id: z.string(),
  joint: JointSchema,
  side: BodySideSchema,
  intensity: PainIntensitySchema,
  notes: z.string().optional(),
  created_at: z.string()
});
export type PainReport = z.infer<typeof PainReportSchema>;

export const TrainingSessionSchema = z.object({
  id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  session_plan_id: z.string().uuid(),
  status: SessionStatusSchema,
  started_at: z.string(),
  completed_at: z.string().optional(),
  checkin: CheckInResponseSchema.optional(),
  set_logs: z.array(SetLogSchema).optional(),
  pain_reports: z.array(PainReportSchema).optional()
});
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const ProgressionActionSchema = z.enum(['increase_load', 'increase_reps', 'maintain', 'reduce', 'deload', 'initial']);
export type ProgressionAction = z.infer<typeof ProgressionActionSchema>;

export const ProgressionSuggestionSchema = z.object({
  assignment_id: z.string().uuid(),
  exercise_name: z.string(),
  current_load_kg: z.number(),
  suggestion: z.object({
  action: ProgressionActionSchema,
  next_load_kg: z.number(),
  next_reps_target: z.number().int(),
  reason: z.string()
}),
  streak_count: z.number().int(),
  window_sessions: z.number().int()
});
export type ProgressionSuggestion = z.infer<typeof ProgressionSuggestionSchema>;

export const SyncRequestSchema = z.object({
  checkins: z.array(CheckInRequestSchema).optional(),
  sets: z.array(CreateSetLogRequestSchema).optional(),
  pain_reports: z.array(CreatePainReportRequestSchema).optional()
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export const SyncResponseSchema = z.object({
  processed_count: z.number().int(),
  conflicts_count: z.number().int(),
  errors: z.array(z.string()).optional(),
  synced_at: z.string()
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const MovementPatternSchema = z.enum(['empuje', 'tiron', 'rodilla_dominante', 'cadera_dominante', 'core']);
export type MovementPattern = z.infer<typeof MovementPatternSchema>;

export const MuscleGroupSchema = z.enum(['pecho', 'espalda', 'cuadriceps', 'isquiosurales', 'gluteos', 'hombros', 'biceps', 'triceps', 'pantorrillas', 'core']);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

export const EquipmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string()
});
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  movement_pattern: MovementPatternSchema,
  primary_muscle: MuscleGroupSchema,
  secondary_muscles: z.array(MuscleGroupSchema),
  equipment_id: z.string(),
  is_compound: z.boolean(),
  initial_load_ratio: z.number(),
  video_url: z.string().url(),
  video_fallback_url: z.string().url(),
  instructions: z.string(),
  is_active: z.boolean()
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const ExerciseAlternativeSchema = z.object({
  original_exercise_id: z.string(),
  alternative_exercise: ExerciseSchema,
  similarity_score: z.number().min(0).max(1)
});
export type ExerciseAlternative = z.infer<typeof ExerciseAlternativeSchema>;

export const ExerciseAssignmentSchema = z.object({
  id: z.string().uuid(),
  session_plan_id: z.string().uuid(),
  exercise_id: z.string(),
  exercise: ExerciseSchema,
  order_in_session: z.number().int(),
  target_sets: z.number().int(),
  target_reps: z.number().int(),
  target_rir: z.number().int().min(0).max(5),
  target_load_kg: z.number(),
  notes: z.string().optional(),
  is_swapped: z.boolean()
});
export type ExerciseAssignment = z.infer<typeof ExerciseAssignmentSchema>;

export const SessionPlanSchema = z.object({
  id: z.string().uuid(),
  week_plan_id: z.string().uuid(),
  day_number: z.number().int().min(1).max(7),
  name: z.string(),
  exercise_assignments: z.array(ExerciseAssignmentSchema)
});
export type SessionPlan = z.infer<typeof SessionPlanSchema>;

export const WeekPlanSchema = z.object({
  id: z.string().uuid(),
  mesocycle_id: z.string().uuid(),
  week_number: z.number().int().min(1).max(8),
  is_deload: z.boolean(),
  sessions: z.array(SessionPlanSchema)
});
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

export const MesocycleDetailSchema = z.object({
  id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  name: z.string(),
  experience_level: ExperienceLevelSchema,
  training_goal: TrainingGoalSchema,
  periodization_type: PeriodizationTypeSchema,
  duration_weeks: z.number().int().min(4).max(8),
  status: MesocycleStatusSchema,
  start_date: z.string(),
  end_date: z.string().optional(),
  weeks: z.array(WeekPlanSchema)
});
export type MesocycleDetail = z.infer<typeof MesocycleDetailSchema>;

export const ExercisesPerSessionPreferenceSchema = z.object({
  mode: z.enum(['manual', 'recommended']),
  customCount: z.number().int().min(2).max(7).nullable().optional()
});
export type ExercisesPerSessionPreference = z.infer<typeof ExercisesPerSessionPreferenceSchema>;

export const GenerateMesocycleRequestSchema = z.object({
  target_goal: TrainingGoalSchema.optional(),
  custom_duration_weeks: z.number().int().min(4).max(8).optional(),
  availableDays: z.number().int().min(1).max(7).optional(),
  sessionDurationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90), z.literal(120)]).optional(),
  exercisesPerSessionPreference: ExercisesPerSessionPreferenceSchema.optional()
});
export type GenerateMesocycleRequest = z.infer<typeof GenerateMesocycleRequestSchema>;

export const SwapExerciseRequestSchema = z.object({
  new_exercise_id: z.string(),
  reason: SwapReasonSchema,
  notes: z.string().optional()
});
export type SwapExerciseRequest = z.infer<typeof SwapExerciseRequestSchema>;

export const AthleteProfileSchema = z.object({
  id: z.string().uuid(),
  google_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  age: z.number().int().min(16),
  weight_kg: z.number().min(20).max(300),
  experience_level: ExperienceLevelSchema,
  training_goal: TrainingGoalSchema,
  available_days_per_week: z.number().int().min(1).max(7),
  equipment: z.array(EquipmentItemSchema),
  created_at: z.string(),
  updated_at: z.string()
});
export type AthleteProfile = z.infer<typeof AthleteProfileSchema>;

export const CreateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(16).max(120),
  weight_kg: z.number().min(20).max(300),
  experience_level: ExperienceLevelSchema,
  training_goal: TrainingGoalSchema,
  available_days_per_week: z.number().int().min(1).max(7),
  equipment_ids: z.array(z.string()).min(1)
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  weight_kg: z.number().min(20).max(300).optional(),
  experience_level: ExperienceLevelSchema.optional(),
  training_goal: TrainingGoalSchema.optional(),
  available_days_per_week: z.number().int().min(1).max(7).optional(),
  equipment_ids: z.array(z.string()).min(1).optional()
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  is_profile_complete: z.boolean(),
  profile: AthleteProfileSchema.optional()
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const ErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string()
});
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string()
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ValidationErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.array(ErrorDetailSchema)
});
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

export const WeightLogInputSchema = z.object({
  weightKg: z.number().min(30).max(300),
  loggedDate: z.string()
});
export type WeightLogInput = z.infer<typeof WeightLogInputSchema>;

export const CreateWeightLogRequestSchema = z.object({
  weight_kg: z.number().min(30).max(300),
  logged_date: z.string()
});
export type CreateWeightLogRequest = z.infer<typeof CreateWeightLogRequestSchema>;

export const UpdateWeightLogRequestSchema = z.object({
  weight_kg: z.number().min(30).max(300),
  logged_date: z.string().optional()
});
export type UpdateWeightLogRequest = z.infer<typeof UpdateWeightLogRequestSchema>;

export const WeightLogItemSchema = z.object({
  id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  weight_kg: z.number(),
  calendar_week_start: z.string(),
  logged_date: z.string(),
  delta_kg: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional()
});
export type WeightLogItem = z.infer<typeof WeightLogItemSchema>;

export const WeightLogResponseSchema = z.object({
  log: WeightLogItemSchema
});
export type WeightLogResponse = z.infer<typeof WeightLogResponseSchema>;

export const WeightLogListResponseSchema = z.object({
  logs: z.array(WeightLogItemSchema)
});
export type WeightLogListResponse = z.infer<typeof WeightLogListResponseSchema>;

export const RoutineTimeBlockItemSchema = z.object({
  duration_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90), z.literal(120)]),
  min_exercises: z.number().int().min(2).max(7),
  max_exercises: z.number().int().min(2).max(7),
  recommended_exercises: z.number().int().min(2).max(7)
});
export type RoutineTimeBlockItem = z.infer<typeof RoutineTimeBlockItemSchema>;

export const RoutineTimeBlockConfigResponseSchema = z.object({
  available_blocks: z.array(RoutineTimeBlockItemSchema)
});
export type RoutineTimeBlockConfigResponse = z.infer<typeof RoutineTimeBlockConfigResponseSchema>;

export const RoutineTimeBlockConfigSchema = z.object({
  availableBlocks: z.array(RoutineTimeBlockItemSchema)
});
export type RoutineTimeBlockConfig = z.infer<typeof RoutineTimeBlockConfigSchema>;

export const LoadTypeSchema = z.enum(['bodyweight', 'bodyweight_loadable', 'assisted_bodyweight', 'external_load']);
export type LoadType = z.infer<typeof LoadTypeSchema>;

export const MesocycleCreateV2InputSchema = z.object({
  availableDays: z.number().int().min(1).max(7),
  sessionDurationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90), z.literal(120)]),
  exercisesPerSessionPreference: ExercisesPerSessionPreferenceSchema,
  targetGoal: TrainingGoalSchema.optional(),
  customDurationWeeks: z.number().int().min(4).max(8).optional()
});
export type MesocycleCreateV2Input = z.infer<typeof MesocycleCreateV2InputSchema>;

export const ExerciseBaselineSnapshotSchema = z.object({
  loadText: z.string(),
  e1rmKg: z.number()
});
export type ExerciseBaselineSnapshot = z.infer<typeof ExerciseBaselineSnapshotSchema>;

export const ExerciseFinalPerformanceSchema = z.object({
  loadText: z.string(),
  e1rmKg: z.number(),
  executed: z.boolean()
});
export type ExerciseFinalPerformance = z.infer<typeof ExerciseFinalPerformanceSchema>;

export const ExerciseProgressionDeltaSchema = z.object({
  deltaKg: z.number(),
  deltaPercent: z.number()
});
export type ExerciseProgressionDelta = z.infer<typeof ExerciseProgressionDeltaSchema>;

export const ExerciseProgressionItemSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  loadType: LoadTypeSchema,
  baseline: ExerciseBaselineSnapshotSchema,
  final: ExerciseFinalPerformanceSchema,
  progress: ExerciseProgressionDeltaSchema.optional()
});
export type ExerciseProgressionItem = z.infer<typeof ExerciseProgressionItemSchema>;

export const MesocycleHistoryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  goal: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  status: z.enum(['completed', 'deload_skipped', 'cancelled']),
  adherencePercent: z.number().int().min(0).max(100),
  adherenceDetails: z.string().optional(),
  exerciseProgressions: z.array(ExerciseProgressionItemSchema)
});
export type MesocycleHistoryItem = z.infer<typeof MesocycleHistoryItemSchema>;

export const MesocycleHistoryResponseSchema = z.object({
  mesocycles: z.array(MesocycleHistoryItemSchema)
});
export type MesocycleHistoryResponse = z.infer<typeof MesocycleHistoryResponseSchema>;

