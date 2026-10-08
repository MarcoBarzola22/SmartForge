import React, { useState, useEffect, useMemo } from 'react';
import { Toast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { queryClient } from '../../api/query-client';
import type {
  MesocycleDetail,
  SessionPlan,
  MovementPattern,
  GenerateMesocycleRequest
} from '../../api';
import {
  Calendar,
  Zap,
  Activity,
  ChevronRight,
  Target,
  Flame,
  CheckCircle2,
  CalendarX,
  Play,
  ArrowUpFromLine,
  ArrowDownToLine,
  Footprints,
  Dumbbell
} from 'lucide-react';
import { EmptyMesocycleState } from '../../components/mesocycle/EmptyMesocycleState';
import { CancellationModal } from '../../components/mesocycle/CancellationModal';
import { MesocycleWizardV2 } from '../../components/mesocycle/MesocycleWizardV2';

export interface MesocyclePageProps {
  initialMesocycle?: MesocycleDetail | null;
  onSelectSession?: (session: SessionPlan) => void;
  onStartSession?: (sessionPlanId: string) => void;
  onNavigateToRoutineEditor?: (sessionPlanId: string) => void;
  onNavigateToHistory?: () => void;
  onNavigateToProfile?: () => void;
}

function getSessionIcon(session: SessionPlan) {
  const patterns = session.exercise_assignments?.map(
    (a) => a.exercise?.movement_pattern || ''
  ) || [];
  const muscles = session.exercise_assignments?.map(
    (a) => a.exercise?.primary_muscle || ''
  ) || [];
  const allText = `${session.name} ${patterns.join(' ')} ${muscles.join(' ')}`.toLowerCase();

  if (
    allText.includes('empuje') ||
    allText.includes('pecho') ||
    allText.includes('hombro') ||
    allText.includes('triceps')
  ) {
    return ArrowUpFromLine;
  }
  if (
    allText.includes('tiron') ||
    allText.includes('tirón') ||
    allText.includes('espalda') ||
    allText.includes('biceps')
  ) {
    return ArrowDownToLine;
  }
  if (
    allText.includes('pierna') ||
    allText.includes('rodilla') ||
    allText.includes('cadera') ||
    allText.includes('cuadriceps') ||
    allText.includes('sentadilla')
  ) {
    return Footprints;
  }
  return Dumbbell;
}

export const MesocyclePage: React.FC<MesocyclePageProps> = ({
  initialMesocycle,
  onSelectSession,
  onStartSession,
  onNavigateToRoutineEditor,
  onNavigateToHistory,
  onNavigateToProfile
}) => {
  const [mesocycle, setMesocycle] = useState<MesocycleDetail | null>(
    initialMesocycle ?? null
  );
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialMesocycle);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const fetchMesocycle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.mesocycles.getCurrent();
      setMesocycle(data);
      if (data.weeks && data.weeks.length > 0 && data.weeks[0]) {
        setSelectedWeekNumber(data.weeks[0].week_number);
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'MESOCYCLE_NOT_FOUND') {
        setMesocycle(null);
      } else {
        setError(
          err?.data?.error?.message ||
          err?.message ||
          'Error al cargar el mesociclo activo'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialMesocycle) {
      fetchMesocycle();
    } else {
      setMesocycle(initialMesocycle);
      if (initialMesocycle.weeks && initialMesocycle.weeks.length > 0 && initialMesocycle.weeks[0]) {
        setSelectedWeekNumber(initialMesocycle.weeks[0].week_number);
      }
    }
  }, [initialMesocycle]);

  // Listen to React Query invalidations on ['mesocycle'] (T-92)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const isMesocycleQuery =
        event?.query?.queryKey &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === 'mesocycle';

      if (isMesocycleQuery && event.type === 'updated' && (event.action as any)?.type === 'invalidate') {
        fetchMesocycle();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleGenerateMesocycleV2 = async (data: GenerateMesocycleRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const created = await apiClient.mesocycles.create(data);
      setMesocycle(created);
      queryClient.setQueryData(['mesocycle'], created);
      await queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
      if (created.weeks && created.weeks.length > 0 && created.weeks[0]) {
        setSelectedWeekNumber(created.weeks[0].week_number);
      }
      setIsWizardOpen(false);
    } catch (err: any) {
      setError(
        err?.data?.error?.message ||
        err?.message ||
        'Error al generar un nuevo mesociclo'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const completedPlanIds = useMemo<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartforge_completed_plans') || '[]');
    } catch {
      return [];
    }
  }, [mesocycle]);

  const selectedWeek = useMemo(() => {
    if (!mesocycle?.weeks) return null;
    return (
      mesocycle.weeks.find((w) => w.week_number === selectedWeekNumber) ||
      mesocycle.weeks[0] ||
      null
    );
  }, [mesocycle, selectedWeekNumber]);

  // Calculate mesocycle progress percentage
  const progressPercent = useMemo(() => {
    if (!mesocycle?.weeks || mesocycle.weeks.length === 0) return 0;
    const allSessions = mesocycle.weeks.flatMap((w) => w.sessions || []);
    if (allSessions.length === 0) return 0;
    const doneCount = allSessions.filter(
      (s) =>
        (s as any).is_completed ||
        (s as any).status === 'completed' ||
        completedPlanIds.includes(s.id)
    ).length;
    return Math.round((doneCount / allSessions.length) * 100);
  }, [mesocycle, completedPlanIds]);

  // Movement patterns summary for the selected week
  const patternCounts = useMemo(() => {
    if (!selectedWeek?.sessions) return {};
    const counts: Partial<Record<MovementPattern, number>> = {};
    selectedWeek.sessions.forEach((sess) => {
      sess.exercise_assignments?.forEach((assign) => {
        const pattern = assign.exercise?.movement_pattern;
        if (pattern) {
          counts[pattern] = (counts[pattern] || 0) + 1;
        }
      });
    });
    return counts;
  }, [selectedWeek]);

  const patternLabels: Record<MovementPattern, string> = {
    empuje: 'Empuje',
    tiron: 'Tirón',
    rodilla_dominante: 'Rodilla dominante',
    cadera_dominante: 'Cadera dominante',
    core: 'Core'
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        data-testid="mesocycle-loading-state"
        className="w-full max-w-[390px] mx-auto flex flex-col gap-4 py-4 animate-pulse overflow-x-hidden"
      >
        <div className="h-44 bg-surface-1 rounded-2xl border border-line" />
        <div className="h-12 bg-surface-1 rounded-xl border border-line" />
        <div className="h-44 bg-surface-1 rounded-2xl border border-line" />
        <div className="h-44 bg-surface-1 rounded-2xl border border-line" />
      </div>
    );
  }

  // Empty state (RF-07, TASK-39)
  if (!mesocycle) {
    return (
      <div
        data-testid="mesocycle-container"
        className="w-full max-w-[390px] mx-auto flex flex-col gap-4 pb-8 overflow-x-hidden"
      >
        {error && (
          <Toast
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <EmptyMesocycleState
          title="No tenés un mesociclo activo"
          description="Generá tu primer plan estructurado con periodización científica adaptada a tu nivel y equipamiento disponible."
          onGenerate={() => setIsWizardOpen(true)}
          onCreate={() => setIsWizardOpen(true)}
          onViewHistory={onNavigateToHistory}
          onViewProfile={onNavigateToProfile}
        />

        {/* Wizard V2 Modal para generación de nuevo mesociclo (RF-03, RF-04, RF-05) */}
        {isWizardOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <MesocycleWizardV2
              isOpen={isWizardOpen}
              onClose={() => setIsWizardOpen(false)}
              onGenerate={handleGenerateMesocycleV2}
              onSubmit={handleGenerateMesocycleV2}
              isSubmitting={isGenerating}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="mesocycle-container"
      className="w-full max-w-[390px] mx-auto flex flex-col gap-4 pb-8 overflow-x-hidden"
    >
      {error && (
        <Toast
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Mesocycle Hero Gradient Card (RF-02, T-16) */}
      <section className="hero-gradient animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-2xl border border-line p-4 shadow-lg shadow-brand/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-content-2">
            Mesociclo activo
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success shadow-lg shadow-success/20">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Activo
          </span>
        </div>
        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-content">
          {mesocycle.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            {
              i: Calendar,
              t: `${mesocycle.duration_weeks} semanas`
            },
            {
              i: Target,
              t:
                mesocycle.training_goal === 'hipertrofia'
                  ? 'Hipertrofia'
                  : mesocycle.training_goal === 'fuerza'
                  ? 'Fuerza'
                  : 'Mixto'
            },
            {
              i: Flame,
              t: mesocycle.periodization_type === 'ondulante' ? 'Ondulante' : 'Lineal'
            }
          ].map(({ i: Icon, t }) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-[11px] text-content-2"
            >
              <Icon className="h-3 w-3" /> {t}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-content-2">
            <span>Progreso</span>
            <span className="font-mono font-semibold text-content">{progressPercent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="progress-gradient h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
        </div>

        {/* Botón de anulación / cancelación del ciclo activo (RF-07, TASK-39) */}
        <div className="mt-4 pt-3 border-t border-line/60">
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="press touch-target min-h-[48px] w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-fatigue-text bg-fatigue/10 hover:bg-fatigue/20 border border-fatigue/30 transition-colors flex items-center justify-center gap-2"
          >
            <CalendarX className="w-4 h-4 text-fatigue-text" />
            <span>Cancelar mesociclo actual</span>
          </button>
        </div>
      </section>

      {/* Week Selector in 4 columns grid (RF-02, T-16) */}
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-content">Semanas</h2>
          <span className="text-[11px] text-content-3 font-medium">
            Semana <span className="font-mono font-bold text-content">{selectedWeekNumber}</span> de <span className="font-mono">{mesocycle.duration_weeks}</span>
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {mesocycle.weeks?.map((w) => {
            const isSelected = w.week_number === selectedWeekNumber;
            const isWeekDeload = Boolean(w.is_deload || w.week_number === 6);
            return (
              <button
                key={w.id || w.week_number}
                type="button"
                aria-label={`Semana ${w.week_number}`}
                onClick={() => setSelectedWeekNumber(w.week_number)}
                className={`press touch-target min-h-12 min-h-[48px] rounded-xl text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-amber text-ink shadow-lg shadow-amber/30'
                    : 'bg-surface-1 text-content-2 border border-line'
                }`}
              >
                <span>S</span>
                <span className="font-mono">{w.week_number}</span>
                {isWeekDeload && <Zap className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Deload Notice Banner (RF-10, CA-10.2, T-16) */}
      {selectedWeek?.is_deload && (
        <div
          data-testid="deload-banner"
          className="animate-in fade-in slide-in-from-bottom-2 duration-200 flex gap-3 rounded-2xl border-l-4 border-amber bg-amber/10 p-3 shadow-lg shadow-amber/10"
        >
          <Zap className="h-7 w-7 shrink-0 text-amber" />
          <div>
            <p className="text-sm font-bold text-amber">Semana de Descarga (Deload)</p>
            <p className="text-[13px] text-content-2">
              Reducción de volumen (−40%) e intensidad (−10%) para facilitar la recuperación neuromuscular y supercompensación.
            </p>
          </div>
        </div>
      )}

      {/* Movement Patterns Summary (RF-02) */}
      {Object.keys(patternCounts).length > 0 && (
        <section className="rounded-2xl border border-line bg-surface-1 p-3.5 shadow-lg shadow-brand/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-content flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber" />
              Distribución de patrones
            </span>
            <span className="text-[11px] text-content-3 font-medium">Volumen muscular semanal</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(patternCounts) as [MovementPattern, number][]).map(
              ([pattern, count]) => (
                <div
                  key={pattern}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-line text-xs font-medium text-content-2"
                >
                  <span>{patternLabels[pattern] || pattern}</span>
                  <span className="text-[10px] font-bold text-content-3 bg-surface-1 px-1.5 py-0.5 rounded font-mono">
                    {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Planned Sessions for the Selected Week in Lovable format (RF-02, T-16) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-content">
            Sesiones · Semana <span className="font-mono">{selectedWeekNumber}</span>
          </h2>
          <span className="text-[11px] text-content-3 font-medium">
            {selectedWeek?.sessions?.length || 0} sesiones
          </span>
        </div>

        {selectedWeek?.sessions && selectedWeek.sessions.length > 0 ? (
          selectedWeek.sessions.map((session, idx) => {
            const isSessionCompleted = Boolean(
              (session as any).is_completed ||
              (session as any).status === 'completed' ||
              completedPlanIds.includes(session.id)
            );
            const Icon = getSessionIcon(session);

            return (
              <article
                key={session.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`animate-in fade-in slide-in-from-bottom-2 duration-200 fill-mode-both rounded-2xl border p-3.5 shadow-lg ${
                  isSessionCompleted
                    ? 'border-success/40 bg-success/10 shadow-success/10'
                    : 'border-line bg-surface-1 shadow-brand/5'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                        isSessionCompleted
                          ? 'bg-success/20 text-success'
                          : 'bg-brand/15 text-brand-focus'
                      }`}
                    >
                      {isSessionCompleted ? (
                        <CheckCircle2 className="h-6 w-6 animate-in zoom-in-50 duration-300" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] uppercase tracking-wider text-content-3 font-semibold">
                          Día {session.day_number}
                        </p>
                        {isSessionCompleted && (
                          <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                            Completado
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-bold text-content mt-0.5">
                        {session.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Ver detalles de sesión ${session.name}`}
                    onClick={() => {
                      onSelectSession?.(session);
                      onNavigateToRoutineEditor?.(session.id);
                    }}
                    className="touch-target press min-h-[48px] min-w-[48px] inline-flex items-center justify-center p-2 rounded-xl text-content-3 hover:text-content hover:bg-surface-2 transition-colors shrink-0"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Chips de ejercicios */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {session.exercise_assignments && session.exercise_assignments.length > 0 ? (
                    session.exercise_assignments.map((assign) => (
                      <span
                        key={assign.id}
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-content-2"
                      >
                        {assign.exercise?.name || 'Ejercicio'}
                        {assign.is_swapped && (
                          <span className="ml-1 text-amber">· Reemplazado</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-3 italic">
                      Sin ejercicios asignados
                    </span>
                  )}
                </div>

                {/* Acciones de la sesión */}
                {isSessionCompleted ? (
                  <div className="mt-3 flex min-h-12 items-center justify-between gap-2 rounded-xl bg-success/15 px-3 py-2 text-sm font-bold text-success border border-success/20">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Día Completado
                    </span>
                    {onStartSession && (
                      <button
                        type="button"
                        onClick={() => onStartSession(session.id)}
                        className="touch-target press min-h-[48px] text-xs font-semibold text-content-2 hover:text-content px-2 py-1 rounded-lg transition-colors"
                      >
                        Repetir
                      </button>
                    )}
                  </div>
                ) : (
                  onStartSession && (
                    <button
                      type="button"
                      onClick={() => onStartSession(session.id)}
                      className="press touch-target min-h-12 min-h-[48px] mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-content shadow-lg shadow-brand/30 transition-all"
                    >
                      <Play className="h-4 w-4 fill-current" /> Iniciar Sesión
                    </button>
                  )
                )}
              </article>
            );
          })
        ) : (
          <p className="text-xs text-content-3 italic py-4 text-center">
            No hay sesiones planificadas para esta semana.
          </p>
        )}
      </section>

      {/* Modal de Cancelación Destructiva (RF-07, TASK-39) */}
      {isCancelModalOpen && mesocycle && (
        <CancellationModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          activeMesocycleName={mesocycle.name}
          onConfirm={async (reason) => {
            await apiClient.mesocycles.cancelActive(reason);
            setMesocycle(null);
            queryClient.setQueryData(['mesocycle'], null);
            await queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
            setIsCancelModalOpen(false);
          }}
          onCancelSuccess={() => {
            setMesocycle(null);
            setIsCancelModalOpen(false);
            queryClient.setQueryData(['mesocycle'], null);
            queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
          }}
        />
      )}

      {/* Wizard V2 Modal para generación de nuevo ciclo si se abre (RF-03, RF-04, RF-05) */}
      {isWizardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <MesocycleWizardV2
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onGenerate={handleGenerateMesocycleV2}
            onSubmit={handleGenerateMesocycleV2}
            isSubmitting={isGenerating}
          />
        </div>
      )}
    </div>
  );
};

export default MesocyclePage;
