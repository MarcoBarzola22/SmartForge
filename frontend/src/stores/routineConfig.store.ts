import { useSyncExternalStore } from 'react';
import type { RoutineTimeBlockItem } from '../api/generated/types';
import { fetchTimeBlockConfig } from '../api';

export type SessionDurationMinutes = 30 | 45 | 60 | 75 | 90 | 120;
export type ExercisesMode = 'recommended' | 'manual';

export interface ExercisesPreference {
  mode: ExercisesMode;
  customCount?: number;
}

export interface ViabilityResult {
  viable: boolean;
  reason?: string;
  minAllowed?: number;
  maxAllowed?: number;
  recommended?: number;
}

export interface RoutineConfigState {
  timeBlocks: RoutineTimeBlockItem[];
  selectedDuration: SessionDurationMinutes;
  selectedPreference: ExercisesPreference;
  recommendedExercises: number; // Value N for the selected duration
  currentBlock: RoutineTimeBlockItem;
  minExercises: number;
  maxExercises: number;
  viability: ViabilityResult;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  lastFetchedAt?: string;
}

export const STORAGE_KEY_TIME_BLOCKS = 'smartforge_routine_config_blocks';

export const DEFAULT_ROUTINE_TIME_BLOCKS: RoutineTimeBlockItem[] = [
  { duration_minutes: 30, min_exercises: 2, max_exercises: 3, recommended_exercises: 2 },
  { duration_minutes: 45, min_exercises: 2, max_exercises: 4, recommended_exercises: 3 },
  { duration_minutes: 60, min_exercises: 2, max_exercises: 5, recommended_exercises: 4 },
  { duration_minutes: 75, min_exercises: 2, max_exercises: 6, recommended_exercises: 5 },
  { duration_minutes: 90, min_exercises: 3, max_exercises: 7, recommended_exercises: 6 },
  { duration_minutes: 120, min_exercises: 4, max_exercises: 7, recommended_exercises: 7 }
];

export class RoutineConfigStore {
  private state: RoutineConfigState;
  private listeners: Set<(state: RoutineConfigState) => void> = new Set();

  constructor() {
    this.state = this.createInitialState(60);
    this.initFromStorage();
  }

  private createInitialState(initialDuration: SessionDurationMinutes = 60): RoutineConfigState {
    const blocks = [...DEFAULT_ROUTINE_TIME_BLOCKS];
    const currentBlock = this.findBlock(blocks, initialDuration);
    const preference: ExercisesPreference = { mode: 'recommended' };
    const viability = this.computeViability(currentBlock, preference);

    return {
      timeBlocks: blocks,
      selectedDuration: initialDuration,
      selectedPreference: preference,
      recommendedExercises: currentBlock.recommended_exercises,
      currentBlock,
      minExercises: currentBlock.min_exercises,
      maxExercises: currentBlock.max_exercises,
      viability,
      isLoading: false,
      error: null,
      isCached: false
    };
  }

  private findBlock(blocks: RoutineTimeBlockItem[], duration: SessionDurationMinutes): RoutineTimeBlockItem {
    return (
      blocks.find((b) => b.duration_minutes === duration) ||
      DEFAULT_ROUTINE_TIME_BLOCKS.find((b) => b.duration_minutes === duration) ||
      DEFAULT_ROUTINE_TIME_BLOCKS[2]!
    );
  }

  private computeViability(
    block: RoutineTimeBlockItem,
    preference: ExercisesPreference
  ): ViabilityResult {
    if (preference.mode === 'recommended') {
      return {
        viable: true,
        recommended: block.recommended_exercises,
        minAllowed: block.min_exercises,
        maxAllowed: block.max_exercises
      };
    }

    const count = preference.customCount ?? block.recommended_exercises;

    if (count > block.max_exercises) {
      return {
        viable: false,
        reason: `El número de ejercicios manual (${count}) excede el presupuesto para ${block.duration_minutes} minutos (máx ${block.max_exercises}).`,
        minAllowed: block.min_exercises,
        maxAllowed: block.max_exercises,
        recommended: block.recommended_exercises
      };
    }

    if (count < block.min_exercises) {
      return {
        viable: false,
        reason: `El número de ejercicios manual (${count}) es inferior al mínimo efectivo para ${block.duration_minutes} minutos (mín ${block.min_exercises}).`,
        minAllowed: block.min_exercises,
        maxAllowed: block.max_exercises,
        recommended: block.recommended_exercises
      };
    }

    return {
      viable: true,
      minAllowed: block.min_exercises,
      maxAllowed: block.max_exercises,
      recommended: block.recommended_exercises
    };
  }

  private notify(): void {
    const currentState = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in routineConfigStore listener:', err);
      }
    });
  }

  public getState(): RoutineConfigState {
    return this.state;
  }

  public subscribe(listener: (state: RoutineConfigState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Intenta restaurar los bloques cacheados desde localStorage de forma segura.
   */
  public initFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY_TIME_BLOCKS);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.setTimeBlocks(parsed as RoutineTimeBlockItem[]);
      }
    } catch {
      // Ignorar datos corruptos de almacenamiento local
    }
  }

  /**
   * Selecciona el bloque de tiempo (RF-03 CA-03.2, CA-03.4).
   * Recalcula instantáneamente el valor de N y la viabilidad temporal.
   */
  public selectDuration(duration: SessionDurationMinutes): void {
    const currentBlock = this.findBlock(this.state.timeBlocks, duration);
    const viability = this.computeViability(currentBlock, this.state.selectedPreference);

    this.state = {
      ...this.state,
      selectedDuration: duration,
      currentBlock,
      recommendedExercises: currentBlock.recommended_exercises,
      minExercises: currentBlock.min_exercises,
      maxExercises: currentBlock.max_exercises,
      viability
    };

    this.notify();
  }

  /**
   * Selecciona la preferencia de cantidad de ejercicios (recomendado o manual).
   * Valida la viabilidad en tiempo real (RF-04 CA-04.2).
   */
  public selectPreference(preference: ExercisesPreference): void {
    const viability = this.computeViability(this.state.currentBlock, preference);

    this.state = {
      ...this.state,
      selectedPreference: preference,
      viability
    };

    this.notify();
  }

  /**
   * Actualiza la matriz de bloques de tiempo y la persiste en caché local.
   */
  public setTimeBlocks(blocks: RoutineTimeBlockItem[]): void {
    const currentBlock = this.findBlock(blocks, this.state.selectedDuration);
    const viability = this.computeViability(currentBlock, this.state.selectedPreference);

    this.state = {
      ...this.state,
      timeBlocks: blocks,
      currentBlock,
      recommendedExercises: currentBlock.recommended_exercises,
      minExercises: currentBlock.min_exercises,
      maxExercises: currentBlock.max_exercises,
      viability,
      isCached: true
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_TIME_BLOCKS, JSON.stringify(blocks));
      }
    } catch {
      // Entornos con localStorage bloqueado
    }

    this.notify();
  }

  /**
   * Evalúa si una cantidad arbitraria de ejercicios es físicamente viable.
   */
  public isCountViable(
    count: number,
    duration?: SessionDurationMinutes
  ): ViabilityResult {
    const targetBlock = duration
      ? this.findBlock(this.state.timeBlocks, duration)
      : this.state.currentBlock;

    return this.computeViability(targetBlock, { mode: 'manual', customCount: count });
  }

  /**
   * Carga la configuración de bloques desde la API o caché.
   */
  public async loadConfig(
    fetchFn: () => Promise<RoutineTimeBlockItem[]> = fetchTimeBlockConfig
  ): Promise<RoutineTimeBlockItem[]> {
    this.state = { ...this.state, isLoading: true, error: null };
    this.notify();

    try {
      const blocks = await fetchFn();
      if (Array.isArray(blocks) && blocks.length > 0) {
        this.setTimeBlocks(blocks);
        this.state = {
          ...this.state,
          isLoading: false,
          error: null,
          lastFetchedAt: new Date().toISOString()
        };
        this.notify();
        return blocks;
      }
      throw new Error('La respuesta de bloques de tiempo no es válida');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar configuración de rutinas';
      this.state = {
        ...this.state,
        isLoading: false,
        error: errorMsg
      };
      this.notify();
      return this.state.timeBlocks;
    }
  }

  /**
   * Restablece el store a su estado por defecto.
   */
  public reset(initialDuration: SessionDurationMinutes = 60): void {
    this.state = this.createInitialState(initialDuration);
    this.notify();
  }
}

export const routineConfigStore = new RoutineConfigStore();

/**
 * Hook de React para acceder reactivamente al store con suscripción externa sincronizada (React 18).
 */
export function useRoutineConfigStore() {
  const state = useSyncExternalStore(
    (listener) => routineConfigStore.subscribe(listener),
    () => routineConfigStore.getState(),
    () => routineConfigStore.getState()
  );

  return {
    ...state,
    selectDuration: (duration: SessionDurationMinutes) => routineConfigStore.selectDuration(duration),
    selectPreference: (preference: ExercisesPreference) => routineConfigStore.selectPreference(preference),
    setTimeBlocks: (blocks: RoutineTimeBlockItem[]) => routineConfigStore.setTimeBlocks(blocks),
    loadConfig: (fetchFn?: () => Promise<RoutineTimeBlockItem[]>) => routineConfigStore.loadConfig(fetchFn),
    isCountViable: (count: number, duration?: SessionDurationMinutes) =>
      routineConfigStore.isCountViable(count, duration),
    reset: (initialDuration?: SessionDurationMinutes) => routineConfigStore.reset(initialDuration)
  };
}
