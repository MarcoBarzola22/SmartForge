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
import { cn } from 'cn';
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
  Clock,
  ShieldAlert,
  HeartCrack,
  Trophy,
  ChevronLeft,
  ChevronRight
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

  // Live timer state for "EN VIVO" counter
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const startTime = session.started_at ? new Date(session.started_at).getTime() : Date.now();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [session.started_at]);

  const formattedElapsed = useMemo(() => {
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [elapsedSeconds]);

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

  // Calculate delta vs target load
  const deltaLoadKg = useMemo(() => {
    if (!suggestionDetail || !activeAssignment?.target_load_kg) return 0;
    return Number((suggestionDetail.suggested_load_kg - activeAssignment.target_load_kg).toFixed(1));
  }, [suggestionDetail, activeAssignment?.target_load_kg]);

  // Render Performance Summary Screen if session is completed
  if (isCompletedView) {
    return (
      <div
        data-testid="session-summary-view"
        className={`min-h-screen bg-ink text-content flex flex-col items-center justify-center p-4 ${className}`}
      >
        <div className="max-w-md w-full bg-surface-1 border border-line rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-center animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-success/15 border border-success/30 text-success flex items-center justify-center shadow-lg shadow-success/20">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              ¡Sesión Completada!
            </Badge>
            <h1 className="text-2xl font-black text-content tracking-tight">
              Resumen de Rendimiento
            </h1>
            <p className="text-sm text-content-2 mt-1">
              {sessionPlan.name} • Día {sessionPlan.day_number}
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-surface-2 border border-line flex flex-col gap-1">
              <span className="text-xs text-content-2 font-medium">Volumen Total</span>
              <span className="text-xl font-bold font-mono text-neon">
                {formattedVolume} kg
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-line flex flex-col gap-1">
              <span className="text-xs text-content-2 font-medium">Series Realizadas</span>
              <span className="text-xl font-bold font-mono text-content">
                {totalCompletedSets} / {totalTargetSets}
              </span>
            </div>
          </div>

          {/* Breakdown per exercise */}
          <div className="text-left space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-content-2 block">
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
                    className="p-3 bg-surface-2/70 border border-line rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-content">
                        {assignment.exercise?.name || `Ejercicio ${idx + 1}`}
                      </div>
                      <div className="text-content-3 font-mono text-[11px] mt-0.5">
                        {sets.length} de {assignment.target_sets} series completadas
                      </div>
                    </div>
                    {sets.length >= assignment.target_sets ? (
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <span className="text-content-3 font-mono">{sets.length}/{assignment.target_sets}</span>
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
            className="w-full min-h-[48px] bg-brand hover:bg-brand/90 text-content font-bold rounded-xl shadow-lg shadow-brand/30 press"
          >
            Volver al Mesociclo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-ink text-content flex flex-col space-y-4 ${className}`}>
      {/* Session Header estilo Lovable: glass sticky, beacon EN VIVO y progress-gradient */}
      <header className="glass sticky top-0 z-20 -mx-4 -mt-4 border-b border-white/5 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-success">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                EN VIVO · <span className="font-mono">{formattedElapsed}</span>
              </span>
              <span className="text-content-3">·</span>
              <h1 className="text-base font-bold text-content tracking-tight">Sesión en Curso</h1>
            </div>
            <p className="text-xs text-content-2 font-medium mt-0.5">
              <span>{sessionPlan.name}</span>
              <span className="mx-1.5">•</span>
              <span>Día {sessionPlan.day_number}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteSession}
            disabled={isCompletingSession || completeSessionMutation.isPending}
            className="press min-h-12 rounded-xl bg-fatigue/15 px-4 text-[13px] font-bold text-fatigue-text touch-target flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isCompletingSession || completeSessionMutation.isPending ? 'Finalizando...' : 'Finalizar Sesión'}
          </button>
        </div>

        {/* Barra animada de progreso de la sesión */}
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-content-2">
            <span>Progreso de series</span>
            <span className="font-mono font-medium text-neon">
              {totalCompletedSets} / {totalTargetSets} ({progressPercent}%)
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="progress-gradient h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col gap-4">
        {errorMessage && (
          <div className="p-3 bg-fatigue/15 border border-fatigue/40 rounded-xl text-fatigue-text text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selector de Ejercicios estilo Lovable: tarjeta con Chevrons 48x48px + Tabs de navegación rápida */}
        <div className="flex flex-col gap-2 w-full">
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-200 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 rounded-2xl border border-line bg-surface-1 p-2 shadow-lg shadow-brand/5">
            <button
              type="button"
              aria-label="Ejercicio anterior"
              disabled={selectedExerciseIndex === 0}
              onClick={() => setSelectedExerciseIndex((prev) => Math.max(0, prev - 1))}
              className="press grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-content disabled:opacity-30 touch-target"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[11px] text-content-2">
                Ejercicio <span className="font-mono">{selectedExerciseIndex + 1}/{assignments.length}</span>
              </p>
              <h2
                key={selectedExerciseIndex}
                className="animate-in fade-in duration-200 truncate text-lg font-extrabold tracking-tight text-content"
              >
                {activeAssignment?.exercise?.name || `Ejercicio ${selectedExerciseIndex + 1}`}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Ejercicio siguiente"
              disabled={selectedExerciseIndex >= assignments.length - 1}
              onClick={() => setSelectedExerciseIndex((prev) => Math.min(assignments.length - 1, prev + 1))}
              className="press grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-content disabled:opacity-30 touch-target"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </section>

          {/* Pills de acceso rápido por ejercicio */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
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
                  type="button"
                  onClick={() => setSelectedExerciseIndex(index)}
                  className={cn(
                    'press flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap touch-target min-h-[48px] transition-all border shrink-0 select-none',
                    isSelected
                      ? 'bg-brand text-content border-brand shadow-lg shadow-brand/30'
                      : isCompleted
                      ? 'bg-surface-2 text-success border-success/30 hover:bg-surface-2/80'
                      : 'bg-surface-1 text-content-3 border-line hover:text-content'
                  )}
                >
                  <span>
                    {index + 1}. {shortName}
                  </span>
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success ml-1" />
                  ) : (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono text-content-2">
                      {setsDone}/{assignment.target_sets}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerta Técnica y Molestias Articulares (RF-08, CA-08.1, CA-08.2, CA-08.3) con estilo border-l-4 de Lovable */}
        {relevantJointPains.length > 0 && (
          <div className="flex flex-col gap-2">
            {relevantJointPains.map((pain, idx) => {
              const isSevere = pain.intensity === 'severa';
              const isModerate = pain.intensity === 'moderada';
              const isLight = pain.intensity === 'leve';

              const bannerColor = isSevere
                ? 'border-fatigue bg-fatigue/10 text-fatigue-text'
                : isModerate
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-brand bg-brand/10 text-brand-focus';

              const IconComponent = isSevere
                ? ShieldAlert
                : isModerate
                ? AlertTriangle
                : Info;

              return (
                <section
                  key={idx}
                  data-testid="pain-adjustment-banner"
                  className={cn(
                    'animate-in fade-in slide-in-from-bottom-2 duration-200 flex gap-3 rounded-2xl border-l-4 p-3.5 shadow-lg',
                    bannerColor
                  )}
                >
                  <IconComponent className="h-6 w-6 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[13px] leading-relaxed">
                    <div className="font-bold">
                      {isSevere && `Alerta de dolor severo en ${pain.joint} (${pain.side})`}
                      {isModerate && `Aviso de molestia moderada en ${pain.joint} (${pain.side})`}
                      {isLight && `Molestia leve en ${pain.joint} (${pain.side})`}
                    </div>
                    <p className="text-content-2">
                      {isSevere &&
                        'Se recomienda sustituir este ejercicio por una variante segura o excluir el patrón articular para prevenir lesiones.'}
                      {isModerate &&
                        'Se recomienda reducir el volumen o carga planificada, o sustituir por una variante con menor impacto biomecánico.'}
                      {isLight &&
                        'Se mantiene la carga planificada para seguimiento. Si la molestia aumenta durante las series, detén el ejercicio.'}
                    </p>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Tarjeta de Sobrecarga Progresiva Sugerida (RF-07, CA-07.1) estilo exacto Lovable */}
        {activeAssignment && (
          <Card
            data-testid="progression-suggestion-card"
            className="animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden rounded-2xl border border-line bg-surface-elevated shadow-lg shadow-neon/10 p-0 relative min-w-0 flex flex-col w-full"
          >
            {/* Línea corona luminosa superior */}
            <div className="top-gradient h-1" />

            <div className="space-y-3 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-content-2">
                Sobrecarga Progresiva Sugerida
              </p>

              {isLoadingSuggestion ? (
                <div className="py-4 flex items-center justify-center gap-2 text-content-2 text-sm animate-pulse">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Calculando sugerencia de progresión...</span>
                </div>
              ) : suggestionDetail ? (
                <>
                  {/* Badge de acción animado con pulso */}
                  <div
                    className={cn(
                      'flex min-h-12 w-full animate-pulse items-center justify-center gap-2 rounded-full text-[13px] font-extrabold uppercase tracking-wide shadow-lg',
                      suggestionDetail.action === 'increase_load' || suggestionDetail.action === 'increase_reps'
                        ? 'bg-neon/15 text-neon shadow-neon/20'
                        : suggestionDetail.action === 'deload'
                        ? 'bg-amber/15 text-amber shadow-amber/20'
                        : 'bg-surface-2 text-content-2'
                    )}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>{getActionLabel(suggestionDetail.action)}</span>
                  </div>

                  {/* Bloque Carga Sugerida */}
                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="text-[11px] text-content-2">Carga sugerida</p>
                    <p className="font-mono text-4xl font-bold text-content">
                      {suggestionDetail.suggested_load_kg} <span className="text-sm text-content-2 font-sans">kg</span>
                    </p>
                    {deltaLoadKg > 0 ? (
                      <p className="mt-1 text-[11px] font-bold text-neon">
                        +{deltaLoadKg} kg vs. sesión anterior
                      </p>
                    ) : deltaLoadKg < 0 ? (
                      <p className="mt-1 text-[11px] font-bold text-amber">
                        {deltaLoadKg} kg vs. sesión anterior
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold text-content-3">
                        Misma carga vs. sesión anterior
                      </p>
                    )}
                  </div>

                  {/* Bloque Objetivo */}
                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="text-[11px] text-content-2">Objetivo</p>
                    <p className="font-mono text-2xl font-bold text-content">
                      {activeAssignment.target_sets} × {suggestionDetail.suggested_reps}{' '}
                      <span className="text-sm text-content-2 font-sans">@ RIR {activeAssignment.target_rir}</span>
                    </p>
                  </div>

                  {/* Justificación técnica en prosa (visible obligatoriamente por RF-07) */}
                  {suggestionDetail.reason_es && (
                    <p className="text-[13px] leading-relaxed text-content-2">
                      <span className="font-bold text-content">Por qué: </span>
                      {suggestionDetail.reason_es}
                    </p>
                  )}

                  {/* Botón de reporte de molestia */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPainModalOpen(true)}
                    className="w-full text-xs text-content-2 hover:text-fatigue-text hover:bg-fatigue/15 flex items-center justify-center gap-1.5 touch-target min-h-[48px] px-3 shrink-0 rounded-xl border border-line"
                  >
                    <HeartCrack className="w-3.5 h-3.5 text-fatigue-text shrink-0" />
                    <span className="whitespace-nowrap">Reportar Molestia</span>
                  </Button>
                </>
              ) : (
                <div className="text-xs text-content-2 py-2">
                  Objetivo estándar del plan: {activeAssignment.target_sets} series × {activeAssignment.target_reps} reps @ {activeAssignment.target_load_kg} kg (RIR {activeAssignment.target_rir}).
                </div>
              )}
            </div>
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
