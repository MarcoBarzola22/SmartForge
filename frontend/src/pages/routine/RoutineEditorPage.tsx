import React, { useState, useEffect } from 'react';
import { MobileLayout } from '../../components/layout/MobileLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type {
  SessionPlan,
  ExerciseAssignment,
  MovementPattern
} from '../../api';
import {
  ArrowLeft,
  RefreshCw,
  Dumbbell,
  CheckCircle,
  Play,
  Layers,
  Repeat,
  Weight,
  Flame,
  Info
} from 'lucide-react';

import { SwapExerciseModal } from './SwapExerciseModal';

export interface RoutineEditorPageProps {
  sessionId?: string;
  sessionPlan?: SessionPlan | null;
  onSwapExercise?: (assignment: ExerciseAssignment) => void;
  onAcceptRoutine?: () => void;
  onBack?: () => void;
  onStartSession?: (sessionId: string) => void;
}

export const RoutineEditorPage: React.FC<RoutineEditorPageProps> = ({
  sessionId,
  sessionPlan: initialSessionPlan,
  onSwapExercise,
  onAcceptRoutine,
  onBack,
  onStartSession
}) => {
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(
    initialSessionPlan ?? null
  );
  const [activeSwapAssignment, setActiveSwapAssignment] = useState<ExerciseAssignment | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialSessionPlan && Boolean(sessionId)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSessionPlan) {
      setSessionPlan(initialSessionPlan);
      return;
    }

    if (sessionId) {
      const fetchSession = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const meso = await apiClient.mesocycles.getCurrent();
          let foundSession: SessionPlan | null = null;
          for (const week of meso.weeks || []) {
            const match = week.sessions?.find((s) => s.id === sessionId);
            if (match) {
              foundSession = match;
              break;
            }
          }
          setSessionPlan(foundSession);
        } catch (err: any) {
          setError(
            err?.data?.error?.message ||
            err?.message ||
            'Error al cargar la rutina'
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchSession();
    }
  }, [sessionId, initialSessionPlan]);

  const patternLabels: Record<MovementPattern, string> = {
    empuje: 'Empuje',
    tiron: 'Tirón',
    rodilla_dominante: 'Rodilla dominante',
    cadera_dominante: 'Cadera dominante',
    core: 'Core'
  };

  if (isLoading) {
    return (
      <MobileLayout title="Editor de Rutina" subtitle="Cargando sesión..." isOnline={true}>
        <div className="flex flex-col gap-4 py-4 animate-pulse">
          <div className="h-24 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800" />
        </div>
      </MobileLayout>
    );
  }

  if (!sessionPlan) {
    return (
      <MobileLayout title="Editor de Rutina" subtitle="Sesión no encontrada" isOnline={true}>
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-zinc-100 mb-1">
            Sesión no encontrada
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-6">
            No se pudo localizar la sesión planificada en el mesociclo activo.
          </p>
          {onBack && (
            <Button
              variant="secondary"
              size="md"
              onClick={onBack}
              iconLeft={<ArrowLeft className="w-4 h-4" />}
            >
              Volver al Mesociclo
            </Button>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Editor de Rutina"
      subtitle="Personalización de Ejercicios"
      isOnline={true}
    >
      <div className="flex flex-col gap-4 pb-8">
        {error && (
          <Toast
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {successMessage && (
          <Toast
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}

        {/* Header de la Sesión */}
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Badge variant="amber" size="sm">
                Día {sessionPlan.day_number}
              </Badge>
              <span className="text-[11px] text-zinc-400 font-medium">
                {sessionPlan.exercise_assignments?.length || 0} ejercicios planificados
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 leading-snug">
              {sessionPlan.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Revisá las cargas objetivo y cambiá ejercicios compatibles sin límite (CA-03.3).
              </span>
            </div>
          </div>
        </Card>

        {/* Lista de Ejercicios Asignados */}
        <div className="flex flex-col gap-3">
          {sessionPlan.exercise_assignments?.map((assignment, index) => {
            const ex = assignment.exercise;
            const pattern = ex?.movement_pattern;

            return (
              <div
                key={assignment.id || index}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/90 flex flex-col gap-3.5 shadow-sm transition-all hover:border-zinc-700/80"
              >
                {/* Cabecera del Ejercicio */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                      {assignment.order_in_session || index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                        {ex?.name || 'Ejercicio'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {pattern && (
                          <Badge variant="default" size="sm">
                            {patternLabels[pattern] || pattern}
                          </Badge>
                        )}
                        {ex?.primary_muscle && (
                          <Badge variant="default" size="sm">
                            {ex.primary_muscle}
                          </Badge>
                        )}
                        {assignment.is_swapped && (
                          <Badge variant="warning" size="sm">
                            Reemplazado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parámetros de Carga y Prescripción */}
                <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>Series</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-200">
                      {assignment.target_sets} series
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                      <Repeat className="w-3 h-3 text-amber-400" />
                      <span>Reps</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-200">
                      {assignment.target_reps} reps
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                      <Weight className="w-3 h-3 text-amber-400" />
                      <span>Carga</span>
                    </div>
                    <span className="text-xs font-bold text-amber-300">
                      {assignment.target_load_kg} kg
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>RIR</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-300">
                      RIR {assignment.target_rir}
                    </span>
                  </div>
                </div>

                {/* Botón Cambiar Ejercicio (CA-03.3) */}
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setActiveSwapAssignment(assignment);
                    onSwapExercise?.(assignment);
                  }}
                  iconLeft={<RefreshCw className="w-4 h-4" />}
                  className="touch-target min-h-[48px]"
                >
                  Cambiar ejercicio
                </Button>
              </div>
            );
          })}
        </div>

        {/* Acciones de la Rutina */}
        <div className="pt-2 sticky bottom-4 z-20 flex flex-col gap-2">
          {onStartSession && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => onStartSession(sessionPlan.id)}
              iconLeft={<Play className="w-5 h-5 fill-current" />}
              className="shadow-xl"
            >
              Iniciar Sesión
            </Button>
          )}

          {onAcceptRoutine && (
            <Button
              type="button"
              variant={onStartSession ? 'secondary' : 'primary'}
              size="lg"
              fullWidth
              onClick={onAcceptRoutine}
              iconLeft={<CheckCircle className="w-5 h-5" />}
              className="shadow-xl"
            >
              Aceptar Rutina
            </Button>
          )}

          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={onBack}
              iconLeft={<ArrowLeft className="w-4 h-4" />}
            >
              Volver al Mesociclo
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Sustitución Inteligente (RF-03, CA-03.1, CA-03.2, CA-03.4) */}
      <SwapExerciseModal
        isOpen={Boolean(activeSwapAssignment)}
        onClose={() => setActiveSwapAssignment(null)}
        assignment={activeSwapAssignment}
        onSwapSuccess={(updatedAssignment) => {
          setSessionPlan((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              exercise_assignments: prev.exercise_assignments?.map((a) =>
                a.id === updatedAssignment.id ? updatedAssignment : a
              )
            };
          });
          setSuccessMessage('Ejercicio sustituido exitosamente');
        }}
      />
    </MobileLayout>
  );
};

export default RoutineEditorPage;
