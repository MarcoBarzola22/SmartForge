import React, { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SetLogger } from './SetLogger';
import { PainReportModal } from './PainReportModal';
import { apiClient } from '../../api/client';
import { queryClient } from '../../api/query-client';
import { offlineStore } from '../../stores/offlineStore';
import type {
  TrainingSession,
  SessionPlan,
  ExerciseAssignment,
  ProgressionSuggestion,
  CreateSetLogRequest,
  CreatePainReportRequest,
  PainReport,
  JointPainItem
} from '../../api';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle,
  Dumbbell,
  ArrowRight,
  Clock,
  ShieldAlert,
  HeartCrack,
  Trophy
} from 'lucide-react';

export interface ProgressionDetail {
  action: string;
  suggested_load_kg: number;
  suggested_reps: number;
  reason_es: string;
}

export interface SessionPageProps {
  session: TrainingSession;
  sessionPlan: SessionPlan;
  onFinishSession?: () => void;
  onBack?: () => void;
  className?: string;
}

export const SessionPage: React.FC<SessionPageProps> = ({
  session: initialSession,
  sessionPlan,
  onFinishSession,
  onBack: _onBack,
  className = ''
}) => {
  const [session, setSession] = useState<TrainingSession>(initialSession);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(0);
  const [progressionSuggestion, setProgressionSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState<boolean>(false);
  const [isLoggingSet, setIsLoggingSet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pain report modal state (RF-06)
  const [isPainModalOpen, setIsPainModalOpen] = useState<boolean>(false);
  const [isSubmittingPain, setIsSubmittingPain] = useState<boolean>(false);

  // Session completion state (RF-05, RF-06)
  const [isCompletedView, setIsCompletedView] = useState<boolean>(
    initialSession.status === 'completed'
  );
  const [isCompletingSession, setIsCompletingSession] = useState<boolean>(false);

  const assignments = useMemo(() => {
    return sessionPlan.exercise_assignments || [];
  }, [sessionPlan]);

  const activeAssignment: ExerciseAssignment | undefined = assignments[selectedExerciseIndex];

  // Restore active session state from offlineStore on mount (T-91, RF-04, RNF-03)
  useEffect(() => {
    let isMounted = true;

    const restoreActiveSession = async () => {
      try {
        const stored = await offlineStore.getActiveSession();
        if (stored?.session && isMounted) {
          const storedSession = stored.session;
          if (
            storedSession.id === session.id ||
            storedSession.session_plan_id === session.session_plan_id ||
            !session.id
          ) {
            setSession((prev) => {
              const currentSetsCount = prev.set_logs?.length || 0;
              const storedSetsCount = storedSession.set_logs?.length || 0;
              if (storedSetsCount >= currentSetsCount) {
                return {
                  ...prev,
                  ...storedSession,
                  set_logs: storedSession.set_logs || prev.set_logs,
                  pain_reports: storedSession.pain_reports || prev.pain_reports,
                  checkin: storedSession.checkin || prev.checkin
                };
              }
              return prev;
            });
          }
        } else if (session.status === 'in_progress') {
          // Immediately persist active session to offlineStore so tab-switching won't lose it
          await offlineStore.saveActiveSession(session, sessionPlan);
        }
      } catch (err) {
        console.error('Failed to restore active session from offlineStore:', err);
      }
    };

    restoreActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch progression suggestion whenever the active assignment changes
  useEffect(() => {
    if (!activeAssignment) {
      setProgressionSuggestion(null);
      return;
    }

    let isMounted = true;
    const fetchSuggestion = async () => {
      setIsLoadingSuggestion(true);
      try {
        const data = await apiClient.progression.getSuggestion(activeAssignment.id);
        if (isMounted) {
          setProgressionSuggestion(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Failed to fetch progression suggestion:', err);
          setProgressionSuggestion(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuggestion(false);
        }
      }
    };

    fetchSuggestion();

    return () => {
      isMounted = false;
    };
  }, [activeAssignment?.id]);

  // Safely extract suggestion details
  const suggestionDetail = useMemo<ProgressionDetail | null>(() => {
    if (!progressionSuggestion?.suggestion) return null;
    const s = progressionSuggestion.suggestion as Record<string, unknown>;
    return {
      action: String(s.action || 'maintain'),
      suggested_load_kg: Number(s.suggested_load_kg ?? activeAssignment?.target_load_kg ?? 0),
      suggested_reps: Number(s.suggested_reps ?? activeAssignment?.target_reps ?? 0),
      reason_es: String(s.reason_es || '')
    };
  }, [progressionSuggestion, activeAssignment]);

  // Determine relevant joint pains for the active exercise
  const relevantJointPains = useMemo<JointPainItem[]>(() => {
    if (!session.checkin?.joint_pains || !activeAssignment?.exercise) {
      return [];
    }

    const exercise = activeAssignment.exercise;
    const pattern = (exercise.movement_pattern || '').toLowerCase();
    const primary = (exercise.primary_muscle || '').toLowerCase();
    const secondaries = (exercise.secondary_muscles || []).map((m: string) => m.toLowerCase());
    const allMuscles = [primary, ...secondaries];

    return session.checkin.joint_pains.filter((pain) => {
      const jointLower = pain.joint.toLowerCase();

      if (['hombro', 'codo', 'muneca'].includes(jointLower)) {
        if (['empuje', 'tiron'].includes(pattern)) return true;
        if (allMuscles.some((m) => ['pecho', 'hombros', 'triceps', 'biceps', 'espalda', 'trapecios', 'antebrazos'].includes(m))) {
          return true;
        }
      }

      if (['columna_lumbar'].includes(jointLower)) {
        if (['cadera_dominante', 'rodilla_dominante'].includes(pattern) && exercise.is_compound) return true;
        if (allMuscles.some((m) => ['espalda_baja', 'isquiosurales', 'gluteos'].includes(m))) return true;
      }

      if (['cadera', 'rodilla', 'tobillo'].includes(jointLower)) {
        if (['rodilla_dominante', 'cadera_dominante'].includes(pattern)) return true;
        if (allMuscles.some((m) => ['cuadriceps', 'isquiosurales', 'gluteos', 'pantorrillas', 'aductores'].includes(m))) {
          return true;
        }
      }

      return false;
    });
  }, [session.checkin?.joint_pains, activeAssignment?.exercise]);

  // Handle logging a set
  const handleLogSet = async (setData: CreateSetLogRequest) => {
    setIsLoggingSet(true);
    setErrorMessage(null);
    try {
      const createdSet = await apiClient.sessions.logSet(session.id, setData);
      setSession((prev) => {
        const updated = {
          ...prev,
          set_logs: [...(prev.set_logs || []), createdSet]
        };
        offlineStore.saveActiveSession(updated, sessionPlan).catch((err) => {
          console.error('Failed to persist active session after logging set:', err);
        });
        return updated;
      });
    } catch (err: unknown) {
      console.error('Error logging set:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar serie');
    } finally {
      setIsLoggingSet(false);
    }
  };

  // Handle submitting a pain report for the active exercise (RF-06)
  const handleReportPain = async (painData: CreatePainReportRequest) => {
    setIsSubmittingPain(true);
    setErrorMessage(null);
    try {
      const report: PainReport = await apiClient.sessions.reportPain(session.id, painData);
      setSession((prev) => {
        const updated = {
          ...prev,
          pain_reports: [...(prev.pain_reports || []), report]
        };
        offlineStore.saveActiveSession(updated, sessionPlan).catch((err) => {
          console.error('Failed to persist active session after reporting pain:', err);
        });
        return updated;
      });
      setIsPainModalOpen(false);
    } catch (err: unknown) {
      console.error('Error reporting pain:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al reportar molestia');
    } finally {
      setIsSubmittingPain(false);
    }
  };

  // Handle finishing/completing the entire session via React Query mutation (RF-05, T-86, T-91, T-92)
  const completeSessionMutation = useMutation(
    {
      mutationFn: (sessionId: string) => apiClient.sessions.complete(sessionId),
      onSuccess: async (completedSession) => {
        await offlineStore.clearActiveSession(session.id);
        if (session.session_plan_id) {
          try {
            const stored = JSON.parse(localStorage.getItem('smartforge_completed_plans') || '[]');
            if (!stored.includes(session.session_plan_id)) {
              stored.push(session.session_plan_id);
              localStorage.setItem('smartforge_completed_plans', JSON.stringify(stored));
            }
          } catch {
            // ignore
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
        setSession(completedSession);
        setIsCompletedView(true);
        onFinishSession?.();
      },
      onError: async (err: unknown) => {
        console.error('Error completing session:', err);
        await offlineStore.clearActiveSession(session.id);
        if (session.session_plan_id) {
          try {
            const stored = JSON.parse(localStorage.getItem('smartforge_completed_plans') || '[]');
            if (!stored.includes(session.session_plan_id)) {
              stored.push(session.session_plan_id);
              localStorage.setItem('smartforge_completed_plans', JSON.stringify(stored));
            }
          } catch {
            // ignore
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
        // Fallback: update local state if already completed
        setSession((prev) => ({
          ...prev,
          status: 'completed',
          completed_at: new Date().toISOString()
        }));
        setIsCompletedView(true);
      }
    },
    queryClient
  );

  const handleCompleteSession = async () => {
    setIsCompletingSession(true);
    setErrorMessage(null);
    try {
      await completeSessionMutation.mutateAsync(session.id);
    } catch {
      // Error is handled in onError callback of mutation
    } finally {
      setIsCompletingSession(false);
    }
  };

  // Filter completed sets for the active exercise
  const completedSetsForActiveExercise = useMemo(() => {
    if (!activeAssignment) return [];
    return (session.set_logs || []).filter(
      (s) => s.exercise_id === activeAssignment.exercise_id
    );
  }, [session.set_logs, activeAssignment?.exercise_id]);

  // Calculate overall session progress & metrics
  const totalTargetSets = useMemo(() => {
    return assignments.reduce((acc, curr) => acc + curr.target_sets, 0);
  }, [assignments]);

  const totalCompletedSets = session.set_logs?.length || 0;
  const progressPercent = totalTargetSets > 0 ? Math.min(100, Math.round((totalCompletedSets / totalTargetSets) * 100)) : 0;

  // Calculate total session volume (kg * reps)
  const totalVolumeKg = useMemo(() => {
    return (session.set_logs || []).reduce((acc, s) => acc + s.weight_kg * s.reps_completed, 0);
  }, [session.set_logs]);

  const formattedVolume = useMemo(() => {
    return totalVolumeKg.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }, [totalVolumeKg]);

  const getActionBadgeVariant = (action: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' => {
    switch (action) {
      case 'increase_load':
      case 'increase_reps':
        return 'success';
      case 'deload':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'increase_load':
        return 'Incrementar Carga';
      case 'increase_reps':
        return 'Incrementar Repeticiones';
      case 'maintain':
        return 'Mantener Carga';
      case 'deload':
        return 'Semana de Descarga';
      default:
        return 'Objetivo Planificado';
    }
  };

  // Render Performance Summary Screen if session is completed
  if (isCompletedView) {
    return (
      <div
        data-testid="session-summary-view"
        className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 ${className}`}
      >
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-center animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              ¡Sesión Completada!
            </Badge>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Resumen de Rendimiento
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {sessionPlan.name} • Día {sessionPlan.day_number}
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
              <span className="text-xs text-neutral-400 font-medium">Volumen Total</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formattedVolume} kg
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
              <span className="text-xs text-neutral-400 font-medium">Series Realizadas</span>
              <span className="text-xl font-bold font-mono text-white">
                {totalCompletedSets} / {totalTargetSets}
              </span>
            </div>
          </div>

          {/* Breakdown per exercise */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Desglose de Ejercicios
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {assignments.map((assignment, idx) => {
                const sets = (session.set_logs || []).filter(
                  (s) => s.exercise_id === assignment.exercise_id
                );
                return (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-200">
                        {assignment.exercise?.name || `Ejercicio ${idx + 1}`}
                      </div>
                      <div className="text-neutral-500 font-mono text-[11px] mt-0.5">
                        {sets.length} de {assignment.target_sets} series completadas
                      </div>
                    </div>
                    {sets.length >= assignment.target_sets ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-neutral-500 font-mono">{sets.length}/{assignment.target_sets}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finish Button */}
          <Button
            variant="primary"
            onClick={onFinishSession || (() => {})}
            className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50"
          >
            Volver al Mesociclo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col ${className}`}>
      {/* Session Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-xl font-bold text-white tracking-tight">Sesión en Curso</h1>
              </div>
              <p className="text-sm text-neutral-400 font-medium mt-0.5">
                <span>{sessionPlan.name}</span>
                <span className="mx-1.5">•</span>
                <span>Día {sessionPlan.day_number}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompleteSession}
              isLoading={isCompletingSession || completeSessionMutation.isPending}
              disabled={isCompletingSession || completeSessionMutation.isPending}
              className="text-xs border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40 touch-target min-h-[48px]"
            >
              Finalizar Sesión
            </Button>
          </div>

          {/* Session Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Progreso de series</span>
              <span className="font-mono font-medium text-emerald-400">
                {totalCompletedSets} / {totalTargetSets} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Exercise Tabs Navigator */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            {assignments.map((assignment, index) => {
              const isSelected = index === selectedExerciseIndex;
              const setsDone = (session.set_logs || []).filter(
                (s) => s.exercise_id === assignment.exercise_id
              ).length;
              const isCompleted = setsDone >= assignment.target_sets;
              const shortName = assignment.exercise?.name.split(' ')[0] || `Ejercicio ${index + 1}`;

              return (
                <button
                  key={assignment.id}
                  onClick={() => setSelectedExerciseIndex(index)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-target min-h-[48px] transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                      : isCompleted
                      ? 'bg-neutral-800/80 text-emerald-300 border-emerald-800/40 hover:bg-neutral-800'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800/60'
                  }`}
                >
                  <span>
                    {index + 1}. {shortName}
                  </span>
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/30 font-mono">
                      {setsDone}/{assignment.target_sets}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-5">
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-red-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real-time Pain & Fatigue Adjustment Banner (RF-08, CA-08.1, CA-08.2, CA-08.3) */}
        {relevantJointPains.length > 0 && (
          <div className="flex flex-col gap-2">
            {relevantJointPains.map((pain, idx) => {
              const isSevere = pain.intensity === 'severa';
              const isModerate = pain.intensity === 'moderada';
              const isLight = pain.intensity === 'leve';

              const bannerColor = isSevere
                ? 'bg-red-950/80 border-red-700/80 text-red-200'
                : isModerate
                ? 'bg-amber-950/80 border-amber-700/80 text-amber-200'
                : 'bg-blue-950/70 border-blue-700/60 text-blue-200';

              const IconComponent = isSevere
                ? ShieldAlert
                : isModerate
                ? AlertTriangle
                : Info;

              return (
                <div
                  key={idx}
                  data-testid="pain-adjustment-banner"
                  className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg ${bannerColor}`}
                >
                  <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">
                      {isSevere && `Alerta de dolor severo en ${pain.joint} (${pain.side})`}
                      {isModerate && `Aviso de molestia moderada en ${pain.joint} (${pain.side})`}
                      {isLight && `Molestia leve en ${pain.joint} (${pain.side})`}
                    </div>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {isSevere &&
                        'Se recomienda sustituir este ejercicio por una variante segura o excluir el patrón articular para prevenir lesiones.'}
                      {isModerate &&
                        'Se recomienda reducir el volumen o carga planificada, o sustituir por una variante con menor impacto biomecánico.'}
                      {isLight &&
                        'Se mantiene la carga planificada para seguimiento. Si la molestia aumenta durante las series, detén el ejercicio.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Exercise Progression Suggestion Card (RF-07, CA-07.1) */}
        {activeAssignment && (
          <Card
            data-testid="progression-suggestion-card"
            className="bg-neutral-900/90 border-neutral-800 rounded-xl shadow-xl relative min-w-0 flex flex-col gap-4 w-full p-4 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Encabezado y Texto en bloque (w-full), sin botones a los costados */}
            <div className="w-full flex flex-col gap-1 border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2 w-full min-w-0">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 flex-shrink-0" />
                <h2 className="text-base font-semibold text-white">Sobrecarga Progresiva Sugerida</h2>
              </div>
              <p className="w-full text-sm text-neutral-400 whitespace-normal break-words text-left">
                Recomendación basada en el historial de rendimiento de las últimas sesiones
              </p>
            </div>

            {isLoadingSuggestion ? (
              <div className="py-4 flex items-center justify-center gap-2 text-neutral-400 text-sm animate-pulse">
                <Clock className="w-4 h-4 shrink-0 flex-shrink-0" />
                <span>Calculando sugerencia de progresión...</span>
              </div>
            ) : suggestionDetail ? (
              <>
                {/* Grid de Métricas (2 mini-cards) */}
                <div className="grid grid-cols-2 gap-2 w-full mt-4">
                  {/* Fila 1 - Columna 1: Carga Sugerida */}
                  <div className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800 min-w-0">
                    <div className="p-1.5 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/40 shrink-0 flex-shrink-0">
                      <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] sm:text-xs text-neutral-400 leading-tight">Carga Sugerida</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white">
                        {suggestionDetail.suggested_load_kg} kg
                      </div>
                    </div>
                  </div>

                  {/* Fila 1 - Columna 2: Repeticiones */}
                  <div className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800 min-w-0">
                    <div className="p-1.5 bg-blue-950/60 text-blue-400 rounded-lg border border-blue-800/40 shrink-0 flex-shrink-0">
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] sm:text-xs text-neutral-400 leading-tight">Repeticiones</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white">
                        {suggestionDetail.suggested_reps} reps
                      </div>
                    </div>
                  </div>
                </div>

                {suggestionDetail.reason_es && (
                  <span className="sr-only">{suggestionDetail.reason_es}</span>
                )}

                {/* Botones de Acción apilados verticalmente */}
                <div className="flex flex-col gap-2 w-full mt-4">
                  {suggestionDetail && (
                    <Badge
                      variant={getActionBadgeVariant(suggestionDetail.action)}
                      className="w-full justify-center font-semibold text-xs py-2.5 min-h-[48px] rounded-xl flex items-center shrink-0"
                    >
                      {getActionLabel(suggestionDetail.action)}
                    </Badge>
                  )}
                  {/* Optional Pain Report Button (RF-06, CA-06.1) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPainModalOpen(true)}
                    className="w-full text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/30 flex items-center justify-center gap-1.5 touch-target min-h-[48px] px-3 shrink-0 rounded-xl border border-neutral-800/80"
                  >
                    <HeartCrack className="w-3.5 h-3.5 text-red-400 shrink-0 flex-shrink-0" />
                    <span className="whitespace-nowrap">Reportar Molestia</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-xs text-neutral-400 py-2">
                Objetivo estándar del plan: {activeAssignment.target_sets} series × {activeAssignment.target_reps} reps @ {activeAssignment.target_load_kg} kg (RIR {activeAssignment.target_rir}).
              </div>
            )}
          </Card>
        )}

        {/* Set Logger Component (RF-05, RNF-01, CA-05.1, CA-05.2) */}
        {activeAssignment && (
          <SetLogger
            key={activeAssignment.exercise_id}
            exerciseId={activeAssignment.exercise_id}
            exerciseName={activeAssignment.exercise?.name || `Ejercicio ${selectedExerciseIndex + 1}`}
            targetSets={activeAssignment.target_sets}
            targetReps={
              suggestionDetail?.suggested_reps ?? activeAssignment.target_reps
            }
            targetLoadKg={
              suggestionDetail?.suggested_load_kg ?? activeAssignment.target_load_kg
            }
            targetRir={activeAssignment.target_rir}
            completedSets={completedSetsForActiveExercise}
            onLogSet={handleLogSet}
            isLoading={isLoggingSet}
          />
        )}

        {/* Optional Pain Report Modal (RF-06, CA-06.1, CA-06.2) */}
        {activeAssignment && (
          <PainReportModal
            isOpen={isPainModalOpen}
            onClose={() => setIsPainModalOpen(false)}
            exerciseId={activeAssignment.exercise_id}
            exerciseName={activeAssignment.exercise?.name || `Ejercicio ${selectedExerciseIndex + 1}`}
            onSubmit={handleReportPain}
            isLoading={isSubmittingPain}
          />
        )}
      </main>
    </div>
  );
};
