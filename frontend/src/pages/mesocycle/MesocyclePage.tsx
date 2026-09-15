import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  CalendarX
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
        <div className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
        <div className="h-12 bg-zinc-900 rounded-xl border border-zinc-800/80" />
        <div className="h-44 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
        <div className="h-44 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
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

      {/* Mesocycle Header Summary (RF-02) */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                Plan Activo
              </span>
              <h2 className="text-base font-bold text-zinc-100 mt-0.5 leading-snug">
                {mesocycle.name}
              </h2>
            </div>
            <Badge variant="success" size="sm">
              Activo
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="default" size="sm">
              {mesocycle.periodization_type === 'ondulante' ? 'Ondulante' : 'Lineal'}
            </Badge>
            <Badge variant="default" size="sm">
              {mesocycle.training_goal === 'hipertrofia'
                ? 'Hipertrofia'
                : mesocycle.training_goal === 'fuerza'
                ? 'Fuerza'
                : 'Mixto'}
            </Badge>
            <Badge variant="default" size="sm">
              Nivel {mesocycle.experience_level}
            </Badge>
            <Badge variant="default" size="sm">
              {mesocycle.duration_weeks} semanas
            </Badge>
          </div>

          {/* Botón de anulación / cancelación del ciclo activo (RF-07, TASK-39) */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-colors flex items-center gap-2"
            >
              <CalendarX className="w-4 h-4 text-red-400" />
              <span>Cancelar mesociclo actual</span>
            </button>
          </div>
        </div>
      </Card>

        {/* Week Selector / Carousel (RF-02) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Semanas del Mesociclo
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              Semana {selectedWeekNumber} de {mesocycle.duration_weeks}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {mesocycle.weeks?.map((w) => {
              const isSelected = w.week_number === selectedWeekNumber;
              return (
                <button
                  key={w.id || w.week_number}
                  type="button"
                  onClick={() => setSelectedWeekNumber(w.week_number)}
                  className={`touch-target min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span>Semana {w.week_number}</span>
                  {w.is_deload && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-extrabold ${
                        isSelected
                          ? 'bg-zinc-950/20 text-zinc-950'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      Deload
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deload Notice Banner (RF-10, CA-10.2) */}
        {selectedWeek?.is_deload && (
          <div
            data-testid="deload-banner"
            className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-lg shadow-amber-500/5 animate-in fade-in duration-200"
          >
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Semana de Descarga (Deload)
              </span>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Reducción de volumen (−40%) e intensidad (−10%) para facilitar la recuperación neuromuscular y supercompensación.
              </p>
            </div>
          </div>
        )}

        {/* Movement Patterns Summary (RF-02) */}
        {Object.keys(patternCounts).length > 0 && (
          <Card title="Distribución de patrones" subtitle="Volumen muscular semanal">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(Object.entries(patternCounts) as [MovementPattern, number][]).map(
                ([pattern, count]) => (
                  <div
                    key={pattern}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/90 text-xs font-medium text-zinc-300"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>{patternLabels[pattern] || pattern}</span>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded">
                      {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                  </div>
                )
              )}
            </div>
          </Card>
        )}

        {/* Planned Sessions for the Selected Week (RF-02) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Sesiones Planificadas
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              {selectedWeek?.sessions?.length || 0} sesiones
            </span>
          </div>

          {selectedWeek?.sessions && selectedWeek.sessions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {selectedWeek.sessions.map((session) => {
                const isSessionCompleted = Boolean(
                  (session as any).is_completed ||
                  (session as any).status === 'completed' ||
                  completedPlanIds.includes(session.id)
                );

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-2xl bg-zinc-900 border transition-all hover:border-zinc-700 shadow-sm flex flex-col gap-3 ${
                      isSessionCompleted ? 'border-emerald-500/30 bg-zinc-900/95' : 'border-zinc-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Día {session.day_number}
                          </span>
                          {isSessionCompleted && (
                            <Badge
                              variant="success"
                              size="sm"
                              className="bg-emerald-950/80 text-emerald-400 border-emerald-500/40 flex items-center gap-1 font-medium text-[10px] px-2 py-0.5"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Completado</span>
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100 mt-0.5">
                          {session.name}
                        </h3>
                      </div>

                      <button
                        type="button"
                        aria-label={`Ver detalles de sesión ${session.name}`}
                        onClick={() => {
                          onSelectSession?.(session);
                          onNavigateToRoutineEditor?.(session.id);
                        }}
                        className="touch-target min-h-[48px] min-w-[48px] inline-flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Exercises list in session */}
                    {session.exercise_assignments &&
                    session.exercise_assignments.length > 0 ? (
                      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/70">
                        {session.exercise_assignments.map((assign, idx) => (
                          <div
                            key={assign.id || idx}
                            className="flex items-center justify-between text-xs py-1 px-1 rounded-lg hover:bg-zinc-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                              <span className="text-[11px] font-semibold text-zinc-500 shrink-0 w-4 text-center">
                                {idx + 1}.
                              </span>
                              <span className="font-medium text-zinc-200 truncate">
                                {assign.exercise?.name || 'Ejercicio'}
                              </span>
                              {assign.is_swapped && (
                                <Badge variant="warning" size="sm">
                                  Reemplazado
                                </Badge>
                              )}
                            </div>

                            <div className="text-right shrink-0 text-zinc-400 text-[11px] font-mono">
                              <span className="font-semibold text-amber-300">
                                {assign.target_sets} × {assign.target_reps}
                              </span>
                              {assign.target_load_kg > 0 && (
                                <span className="ml-1 text-zinc-300">
                                  @ {assign.target_load_kg}kg
                                </span>
                              )}
                              <span className="ml-1 text-zinc-500">
                                (RIR {assign.target_rir})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic py-1">
                        Sin ejercicios asignados.
                      </p>
                    )}

                    {/* Start session action */}
                    {onStartSession && (
                      <div className="pt-2">
                        {isSessionCompleted ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              Día Completado
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStartSession(session.id)}
                              className="text-xs text-zinc-400 hover:text-white h-9 min-h-[36px] px-2.5"
                            >
                              Repetir
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="md"
                            fullWidth
                            onClick={() => onStartSession(session.id)}
                            iconLeft={<ShieldCheck className="w-4 h-4" />}
                          >
                            Iniciar Sesión
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-4 text-center">
              No hay sesiones planificadas para esta semana.
            </p>
          )}
        </div>

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
