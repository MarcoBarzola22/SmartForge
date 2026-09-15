import React, { useState, useEffect, useRef } from 'react';
import { cn } from 'cn';
import { ModularSetCard } from './ModularSetCard';
import { Card } from '../../components/ui/Card';
import { CheckCircle2, Trophy } from 'lucide-react';
import type { SetLog, CreateSetLogRequest } from '../../api';

export interface ActiveExerciseWorkspaceProps extends React.HTMLAttributes<HTMLDivElement> {
  exerciseId?: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetLoadKg: number;
  targetRir: number;
  completedSets?: SetLog[];
  previousHistory?: string;
  onLogSet: (set: CreateSetLogRequest) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

export const ActiveExerciseWorkspace: React.FC<ActiveExerciseWorkspaceProps> = ({
  exerciseId = 'active-exercise',
  exerciseName: _exerciseName,
  targetSets,
  targetReps,
  targetLoadKg,
  targetRir,
  completedSets = [],
  previousHistory,
  onLogSet,
  isLoading = false,
  className = '',
  ...props
}) => {
  const activeSetRef = useRef<HTMLDivElement>(null);
  const nextSetNumber = completedSets.length + 1;
  const isAllSetsCompleted = completedSets.length >= targetSets;

  const lastCompletedSet = completedSets[completedSets.length - 1];

  // Pre-carga con la última serie realizada o con los targets prescritos
  const [weightKg, setWeightKg] = useState<number>(
    lastCompletedSet ? lastCompletedSet.weight_kg : targetLoadKg
  );
  const [reps, setReps] = useState<number>(
    lastCompletedSet ? lastCompletedSet.reps_completed : targetReps
  );
  const [rir, setRir] = useState<number>(
    lastCompletedSet ? lastCompletedSet.rir : targetRir
  );

  // Sincronizar pre-carga cuando cambia el set completado o los targets
  useEffect(() => {
    if (lastCompletedSet) {
      setWeightKg(lastCompletedSet.weight_kg);
      setReps(lastCompletedSet.reps_completed);
      setRir(lastCompletedSet.rir);
    } else {
      setWeightKg(targetLoadKg);
      setReps(targetReps);
      setRir(targetRir);
    }
  }, [completedSets.length, targetLoadKg, targetReps, targetRir]);

  // Auto-scroll suave hacia la mitad inferior (zona de pulgar) al completar un set
  useEffect(() => {
    if (activeSetRef.current) {
      activeSetRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [completedSets.length]);

  const handleCompleteActiveSet = () => {
    onLogSet({
      exercise_id: exerciseId,
      set_number: nextSetNumber,
      weight_kg: weightKg,
      reps_completed: reps,
      rir: rir,
      client_timestamp: new Date().toISOString(),
    });
  };

  return (
    <div
      data-testid="active-exercise-workspace"
      className={cn(
        'w-full max-w-[390px] mx-auto flex flex-col gap-4 overflow-x-hidden select-none min-w-0',
        className
      )}
      {...props}
    >
      {/* 1. Lista de Series Completadas Previas (si existen) */}
      {completedSets.length > 0 && (
        <Card
          title="Series Completadas"
          subtitle={`${completedSets.length} de ${targetSets} series completadas`}
          className="bg-surface-2/60 border-border-subtle w-full min-w-0"
        >
          <div className="flex flex-col gap-2 pt-1 w-full min-w-0">
            {completedSets.map((set) => (
              <div
                key={set.id || set.set_number}
                className="p-3 rounded-xl bg-surface-1 border border-border-interactive/40 flex items-center justify-between text-xs w-full min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-brand-primary/10 border border-brand-primary/30 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {set.set_number}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-content-primary font-mono truncate">
                      {set.weight_kg} kg × {set.reps_completed} reps
                    </span>
                    <span className="text-[10px] text-content-secondary truncate">
                      RIR {set.rir}
                    </span>
                  </div>
                </div>

                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. Sticky Workspace: Serie en curso activa anclada en mitad inferior */}
      {!isAllSetsCompleted ? (
        <div
          ref={activeSetRef}
          data-testid="active-set-container"
          className="sticky bottom-0 z-10 w-full pt-1 pb-2 bg-gradient-to-t from-surface-base via-surface-base/95 to-transparent min-w-0"
        >
          <ModularSetCard
            setNumber={nextSetNumber}
            totalSets={targetSets}
            previousHistory={previousHistory}
            weightKg={weightKg}
            reps={reps}
            rir={rir}
            onWeightChange={setWeightKg}
            onRepsChange={setReps}
            onRirChange={setRir}
            onCompleteSet={handleCompleteActiveSet}
            isLoading={isLoading}
            className="w-full min-w-0"
          />
        </div>
      ) : (
        <Card className="p-6 text-center flex flex-col items-center gap-3 bg-surface-1 border-border-interactive w-full min-w-0">
          <div className="w-12 h-12 rounded-full bg-status-success/10 border border-status-success/30 flex items-center justify-center text-status-success shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1 w-full min-w-0">
            <h4 className="text-base font-bold text-content-primary">
              ¡Todas las series completadas!
            </h4>
            <p className="text-xs text-content-secondary">
              Has alcanzado el objetivo de {targetSets} series prescritas para este ejercicio.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ActiveExerciseWorkspace;
