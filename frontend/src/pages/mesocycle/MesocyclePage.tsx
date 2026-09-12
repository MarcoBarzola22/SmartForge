import React, { useState, useEffect, useMemo } from 'react';
import { MobileLayout } from '../../components/layout/MobileLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type {
  MesocycleDetail,
  SessionPlan,
  MovementPattern
} from '../../api';
import {
  Calendar,
  Zap,
  Activity,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  Dumbbell
} from 'lucide-react';

export interface MesocyclePageProps {
  initialMesocycle?: MesocycleDetail | null;
  onSelectSession?: (session: SessionPlan) => void;
  onStartSession?: (sessionPlanId: string) => void;
  onNavigateToRoutineEditor?: (sessionPlanId: string) => void;
}

export const MesocyclePage: React.FC<MesocyclePageProps> = ({
  initialMesocycle,
  onSelectSession,
  onStartSession,
  onNavigateToRoutineEditor
}) => {
  const [mesocycle, setMesocycle] = useState<MesocycleDetail | null>(
    initialMesocycle ?? null
  );
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialMesocycle);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

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

  const handleGenerateMesocycle = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const created = await apiClient.mesocycles.create({});
      setMesocycle(created);
      if (created.weeks && created.weeks.length > 0 && created.weeks[0]) {
        setSelectedWeekNumber(created.weeks[0].week_number);
      }
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
      <MobileLayout title="Mesociclo" subtitle="Cargando plan..." isOnline={true}>
        <div data-testid="mesocycle-loading-state" className="flex flex-col gap-4 py-4 animate-pulse">
          <div className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
          <div className="h-12 bg-zinc-900 rounded-xl border border-zinc-800/80" />
          <div className="h-44 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
          <div className="h-44 bg-zinc-900 rounded-2xl border border-zinc-800/80" />
        </div>
      </MobileLayout>
    );
  }

  // Empty state
  if (!mesocycle) {
    return (
      <MobileLayout title="Mesociclo" subtitle="Plan de Entrenamiento" isOnline={true}>
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-1">
            No tenés un mesociclo activo
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
            Generá tu primer plan estructurado con periodización científica adaptada a tu nivel y equipamiento disponible.
          </p>
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            onClick={handleGenerateMesocycle}
            className="shadow-xl"
            iconLeft={<PlusCircle className="w-5 h-5" />}
          >
            Generar Nuevo Mesociclo
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Mesociclo"
      subtitle="Dashboard de Entrenamiento"
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
              {selectedWeek.sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/90 flex flex-col gap-3 transition-all hover:border-zinc-700 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Día {session.day_number}
                      </span>
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
                      <Button
                        variant="outline"
                        size="md"
                        fullWidth
                        onClick={() => onStartSession(session.id)}
                        iconLeft={<ShieldCheck className="w-4 h-4" />}
                      >
                        Iniciar Sesión
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-4 text-center">
              No hay sesiones planificadas para esta semana.
            </p>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MesocyclePage;
