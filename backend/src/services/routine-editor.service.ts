import {
  ExerciseRepository,
  exerciseRepository
} from '../repositories/exercise.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import {
  ExerciseSwapRepository,
  exerciseSwapRepository
} from '../repositories/exercise-swap.repository.js';
import {
  MesocycleRepository,
  mesocycleRepository
} from '../repositories/mesocycle.repository.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';
import {
  SwapReasonSchema,
  type ExerciseAlternative,
  type ExerciseAssignment,
  type SwapExerciseRequest
} from '../schemas/generated/schemas.js';

export const NO_ALTERNATIVES_MESSAGE = 'No se encontró alternativa con tu equipamiento';

export interface AlternativesResult {
  exercise_id: string;
  alternatives: ExerciseAlternative[];
  message?: string;
}

export class RoutineEditorService {
  constructor(
    private readonly exerciseRepo: ExerciseRepository = exerciseRepository,
    private readonly athleteRepo: AthleteRepository = athleteRepository,
    private readonly swapRepo: ExerciseSwapRepository = exerciseSwapRepository,
    private readonly mesocycleRepo: MesocycleRepository = mesocycleRepository
  ) {}

  /**
   * Busca alternativas biomecánicamente compatibles para un ejercicio,
   * filtradas estrictamente por el equipamiento disponible del atleta (RF-03, CA-03.1, CA-03.2).
   */
  async getAlternativesForAthlete(
    athleteId: string,
    exerciseId: string
  ): Promise<AlternativesResult> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) {
      throw new NotFoundError('Ejercicio no encontrado.');
    }

    const equipmentIds = athlete.equipment ? athlete.equipment.map((eq) => eq.id) : [];
    const alternatives = await this.exerciseRepo.findAlternatives(exerciseId, equipmentIds);

    if (alternatives.length === 0) {
      return {
        exercise_id: exerciseId,
        alternatives: [],
        message: NO_ALTERNATIVES_MESSAGE
      };
    }

    return {
      exercise_id: exerciseId,
      alternatives,
      message: undefined
    };
  }

  /**
   * Busca alternativas para un ejercicio filtradas por una lista explícita de equipamientos.
   */
  async getAlternativesByEquipment(
    exerciseId: string,
    equipmentIds: string[]
  ): Promise<AlternativesResult> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) {
      throw new NotFoundError('Ejercicio no encontrado.');
    }

    const alternatives = await this.exerciseRepo.findAlternatives(exerciseId, equipmentIds);

    if (alternatives.length === 0) {
      return {
        exercise_id: exerciseId,
        alternatives: [],
        message: NO_ALTERNATIVES_MESSAGE
      };
    }

    return {
      exercise_id: exerciseId,
      alternatives,
      message: undefined
    };
  }

  /**
   * Sustituye un ejercicio en la asignación planificada y registra el motivo del cambio (RF-03, CA-03.3, CA-03.4).
   * Por defecto, propaga el cambio en cascada a las semanas restantes del mesociclo.
   */
  async swapExercise(
    assignmentId: string,
    data: SwapExerciseRequest,
    athleteId?: string,
    cascade = true
  ): Promise<ExerciseAssignment> {
    const reasonValidation = SwapReasonSchema.safeParse(data.reason);
    if (!reasonValidation.success) {
      throw new BadRequestError('Motivo de sustitución inválido.');
    }

    if (!data.new_exercise_id || data.new_exercise_id.trim() === '') {
      throw new BadRequestError('El nuevo ejercicio es obligatorio.');
    }

    const assignment = await this.mesocycleRepo.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Asignación de ejercicio no encontrada.');
    }

    if (athleteId && assignment.athlete_id !== athleteId) {
      throw new NotFoundError('Asignación de ejercicio no encontrada.');
    }

    if (assignment.exercise_id === data.new_exercise_id) {
      throw new BadRequestError('El nuevo ejercicio debe ser diferente al actual.');
    }

    const newExercise = await this.exerciseRepo.findById(data.new_exercise_id);
    if (!newExercise) {
      throw new NotFoundError('El nuevo ejercicio no existe en el catálogo.');
    }

    const targetAthleteId = athleteId || assignment.athlete_id;
    const athlete = await this.athleteRepo.findById(targetAthleteId);

    const availableEquipment = new Set<string>();
    if (athlete?.equipment) {
      for (const eq of athlete.equipment) {
        availableEquipment.add(eq.id);
      }
    }
    availableEquipment.add('bodyweight');
    availableEquipment.add('peso_corporal');
    availableEquipment.add('none');

    if (newExercise.equipment_id && !availableEquipment.has(newExercise.equipment_id)) {
      throw new BadRequestError('El nuevo ejercicio requiere un equipamiento que no posees.');
    }

    const originalExercise =
      assignment.exercise || (await this.exerciseRepo.findById(assignment.exercise_id));

    let isCompatible = false;
    if (originalExercise) {
      if (
        newExercise.movement_pattern === originalExercise.movement_pattern ||
        newExercise.primary_muscle === originalExercise.primary_muscle
      ) {
        isCompatible = true;
      } else {
        const alternatives = await this.exerciseRepo.findAlternatives(
          assignment.exercise_id,
          Array.from(availableEquipment)
        );
        isCompatible = alternatives.some((a) => a.alternative_exercise.id === newExercise.id);
      }
    }

    if (!isCompatible) {
      throw new BadRequestError('El ejercicio seleccionado no es una alternativa biomecánicamente compatible.');
    }

    let targetLoad = assignment.target_load_kg;
    if (athlete?.weight_kg && newExercise.initial_load_ratio) {
      targetLoad = Math.round(athlete.weight_kg * newExercise.initial_load_ratio * 2) / 2;
    }

    // Persist swap history
    await this.swapRepo.create({
      assignment_id: assignmentId,
      original_exercise_id: assignment.exercise_id,
      new_exercise_id: newExercise.id,
      reason: data.reason,
      notes: data.notes
    });

    // Update assignment
    const updated = await this.mesocycleRepo.updateAssignment(assignmentId, {
      exercise_id: newExercise.id,
      target_load_kg: targetLoad,
      is_swapped: true,
      notes: data.notes
    });

    if (!updated) {
      throw new NotFoundError('No se pudo actualizar la asignación.');
    }

    // Cascade to remaining weeks if enabled
    if (cascade && assignment.mesocycle_id) {
      await this.mesocycleRepo.cascadeAssignmentSwap(
        assignment.mesocycle_id,
        assignment.week_number,
        assignment.day_number,
        assignment.order_in_session,
        assignment.exercise_id,
        newExercise.id,
        targetLoad
      );
    }

    return updated;
  }
}

export const routineEditorService = new RoutineEditorService();
