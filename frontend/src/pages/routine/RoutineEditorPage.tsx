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
        <div className="flex flex-col gap-4 py-4 animate-pulse w-full">
          <div className="h-24 bg-surface-1 rounded-2xl border border-border-subtle" />
          <div className="h-48 bg-surface-1 rounded-2xl border border-border-subtle" />
          <div className="h-48 bg-surface-1 rounded-2xl border border-border-subtle" />
        </div>
      </MobileLayout>
    );
  }

  if (!sessionPlan) {
    return (
      <MobileLayout title="Editor de Rutina" subtitle="Sesión no encontrada" isOnline={true}>
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 w-full">
          <div className="w-16 h-16 rounded-2xl bg-surface-1 border border-border-subtle flex items-center justify-center mb-4 text-content-secondary">
            <Dumbbell className="w-8 h-8 text-brand-primary/60" />
          </div>
          <h2 className="text-base font-bold text-content-primary mb-1">
            Sesión no encontrada
          </h2>
          <p className="text-xs text-content-secondary max-w-xs mb-6">
            No se pudo localizar la sesión planificada en el mesociclo activo.
          </p>
          {onBack && (
            <Button
              variant="secondary"
              size="md"
              onClick={onBack}
              iconLeft={<ArrowLeft className="w-4 h-4" />}
              className="touch-target min-h-[48px]"
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
      <div className="flex flex-col gap-4 pb-8 w-full overflow-x-hidden">
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
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between">
              <Badge variant="brand" size="sm">
                Día {sessionPlan.day_number}
              </Badge>
              <span className="text-[11px] text-content-secondary font-medium">
                {sessionPlan.exercise_assignments?.length || 0} ejercicios planificados
              </span>
            </div>
            <h2 className="text-lg font-bold text-content-primary leading-snug">
              {sessionPlan.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-content-secondary pt-1">
              <Info className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>
                Revisá las cargas objetivo y cambiá ejercicios compatibles sin límite (CA-03.3).
              </span>
            </div>
          </div>
        </Card>

        {/* Lista de Ejercicios Asignados en Tarjetas Modulares Apiladas (RF-11, T-24) */}
        <div className="flex flex-col gap-3.5 w-full">
          {sessionPlan.exercise_assignments?.map((assignment, index) => {
            const ex = assignment.exercise;
            const pattern = ex?.movement_pattern;

            return (
              <div
                key={assignment.id || index}
                data-testid="modular-exercise-card"
                className="p-4 rounded-2xl bg-surface-1 border border-border-subtle flex flex-col gap-3.5 shadow-sm transition-all hover:border-border-interactive w-full"
              >
                {/* Cabecera del Ejercicio */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold shrink-0 mt-0.5">
                      {assignment.order_in_session || index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-content-primary leading-snug">
                        {ex?.name || 'Ejercicio'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {pattern && (
                          <Badge variant="brand" size="sm">
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

                {/* Parámetros Modulares de Carga y Prescripción */}
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-surface-2 border border-border-interactive/60 text-center w-full">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-content-secondary font-medium uppercase tracking-wider mb-0.5">
                      <Layers className="w-3 h-3 text-brand-primary" />
                      <span>Series</span>
                    </div>
                    <span className="text-xs font-bold text-content-primary">
                      {assignment.target_sets} series
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-content-secondary font-medium uppercase tracking-wider mb-0.5">
                      <Repeat className="w-3 h-3 text-brand-primary" />
                      <span>Reps</span>
                    </div>
                    <span className="text-xs font-bold text-content-primary">
                      {assignment.target_reps} reps
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-content-secondary font-medium uppercase tracking-wider mb-0.5">
                      <Weight className="w-3 h-3 text-brand-primary" />
                      <span>Carga</span>
                    </div>
                    <span className="text-xs font-bold text-brand-primary font-mono">
                      {assignment.target_load_kg} kg
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-content-secondary font-medium uppercase tracking-wider mb-0.5">
                      <Flame className="w-3 h-3 text-brand-primary" />
                      <span>RIR</span>
                    </div>
                    <span className="text-xs font-bold text-content-primary font-mono">
                      RIR {assignment.target_rir}
                    </span>
                  </div>
                </div>

                {/* Botón Cambiar Ejercicio (CA-03.3) */}
                <Button
                  type="button"
                  variant="secondary"
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

        {/* Acciones de la Rutina Ancladas en Mitad Inferior (RF-04, RF-14, T-24) */}
        <div
          data-testid="routine-bottom-actions"
          className="sticky bottom-0 z-30 w-full bg-surface-1/95 backdrop-blur-md border-t border-border-interactive p-3 flex flex-col gap-2 rounded-t-2xl shadow-2xl pb-[calc(12px+env(safe-area-inset-bottom))]"
        >
          {onStartSession && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => onStartSession(sessionPlan.id)}
              iconLeft={<Play className="w-5 h-5 fill-current" />}
              className="shadow-xl min-h-[48px] touch-target font-bold"
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
              className="shadow-xl min-h-[48px] touch-target font-bold"
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
              className="min-h-[48px] touch-target text-content-secondary"
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
