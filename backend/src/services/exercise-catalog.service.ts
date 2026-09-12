import {
  ExerciseRepository,
  exerciseRepository,
  type ExerciseFilters
} from '../repositories/exercise.repository.js';
import type {
  Exercise,
  ExerciseAlternative,
  MovementPattern,
  MuscleGroup
} from '../schemas/generated/schemas.js';
import { NotFoundError } from '../errors/app-error.js';

export interface ListExercisesDto {
  pattern?: MovementPattern;
  primary_muscle?: MuscleGroup;
  equipment_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ExerciseCatalogService {
  constructor(private readonly repo: ExerciseRepository = exerciseRepository) {}

  async listExercises(filters: ListExercisesDto = {}): Promise<Exercise[]> {
    const repoFilters: ExerciseFilters = {
      movement_pattern: filters.pattern,
      primary_muscle: filters.primary_muscle,
      equipment_id: filters.equipment_id,
      search: filters.search,
      limit: filters.limit,
      offset: filters.offset
    };

    return this.repo.findAll(repoFilters);
  }

  async getExerciseById(id: string): Promise<Exercise> {
    const exercise = await this.repo.findById(id);
    if (!exercise) {
      throw new NotFoundError('Ejercicio no encontrado.');
    }
    return exercise;
  }

  async getAlternatives(
    exerciseId: string,
    equipmentId?: string
  ): Promise<ExerciseAlternative[]> {
    // Ensure original exercise exists
    await this.getExerciseById(exerciseId);

    const equipmentFilter = equipmentId ? [equipmentId] : undefined;
    return this.repo.findAlternatives(exerciseId, equipmentFilter);
  }
}

export const exerciseCatalogService = new ExerciseCatalogService();
