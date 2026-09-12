import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type {
  Joint,
  BodySide,
  PainIntensity,
  JointPainItem,
  CheckInResponse
} from '../../api';
import {
  Activity,
  Check,
  ShieldCheck,
  HeartCrack,
  Flame,
  Info
} from 'lucide-react';

export interface CheckInModalProps {
  isOpen: boolean;
  onClose?: () => void;
  sessionId: string;
  onCheckInSuccess: (checkInResponse: CheckInResponse) => void;
}

interface JointConfig {
  id: Joint;
  label: string;
  isBilateralOnly?: boolean;
}

const JOINTS_TAXONOMY: JointConfig[] = [
  { id: 'hombro', label: 'Hombro' },
  { id: 'codo', label: 'Codo' },
  { id: 'muneca', label: 'Muñeca' },
  { id: 'columna_lumbar', label: 'Columna lumbar', isBilateralOnly: true },
  { id: 'cadera', label: 'Cadera' },
  { id: 'rodilla', label: 'Rodilla' },
  { id: 'tobillo', label: 'Tobillo' }
];

const FATIGUE_LEVELS = [
  { level: 1, label: 'Mínima', desc: 'Descansado' },
  { level: 2, label: 'Baja', desc: 'Energía óptima' },
  { level: 3, label: 'Moderada', desc: 'Fatiga normal' },
  { level: 4, label: 'Alta', desc: 'Cansancio notable' },
  { level: 5, label: 'Extrema', desc: 'Agotamiento' }
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onCheckInSuccess
}) => {
  const [fatigueLevel, setFatigueLevel] = useState<number>(3);
  const [selectedJoints, setSelectedJoints] = useState<Record<Joint, { side: BodySide; intensity: PainIntensity } | null>>({
    hombro: null,
    codo: null,
    muneca: null,
    columna_lumbar: null,
    cadera: null,
    rodilla: null,
    tobillo: null
  });
  const [activeJointTab, setActiveJointTab] = useState<Joint | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleJoint = (jointId: Joint) => {
    setSelectedJoints((prev) => {
      const current = prev[jointId];
      if (current) {
        const next = { ...prev, [jointId]: null };
        if (activeJointTab === jointId) {
          const remainingJoints = (Object.keys(next) as Joint[]).filter((j) => next[j] !== null);
          setActiveJointTab(remainingJoints[0] || null);
        }
        return next;
      } else {
        const next = {
          ...prev,
          [jointId]: {
            side: 'bilateral' as BodySide,
            intensity: 'moderada' as PainIntensity
          }
        };
        setActiveJointTab(jointId);
        return next;
      }
    });
  };

  const updateSide = (jointId: Joint, side: BodySide) => {
    setSelectedJoints((prev) => {
      const current = prev[jointId];
      if (!current) return prev;
      return {
        ...prev,
        [jointId]: { ...current, side }
      };
    });
  };

  const updateIntensity = (jointId: Joint, intensity: PainIntensity) => {
    setSelectedJoints((prev) => {
      const current = prev[jointId];
      if (!current) return prev;
      return {
        ...prev,
        [jointId]: { ...current, intensity }
      };
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const joint_pains: JointPainItem[] = [];
      (Object.keys(selectedJoints) as Joint[]).forEach((j) => {
        const item = selectedJoints[j];
        if (item) {
          joint_pains.push({
            joint: j,
            side: item.side,
            intensity: item.intensity
          });
        }
      });

      const response = await apiClient.sessions.checkin(sessionId, {
        fatigue_level: fatigueLevel,
        joint_pains
      });

      onCheckInSuccess(response);
    } catch (err: any) {
      setError(
        err?.data?.error?.message ||
        err?.message ||
        'Error al registrar el check-in pre-sesión'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const activeJointsCount = Object.values(selectedJoints).filter(Boolean).length;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <SheetContent
        side="bottom"
        data-testid="checkin-bottom-sheet"
        className="max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface-1 border-t border-border-interactive select-none"
      >
        {/* Cabecera del Bottom Sheet */}
        <SheetHeader className="p-4 border-b border-border-subtle flex flex-col text-left">
          <SheetTitle className="text-base font-bold text-content-primary">
            Check-in Pre-Sesión
          </SheetTitle>
          <SheetDescription className="text-xs text-content-secondary mt-0.5">
            Evaluación obligatoria de fatiga y molestias articulares
          </SheetDescription>
        </SheetHeader>

        {/* Contenido scrolleable verticalmente (Cero scroll horizontal) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-5 w-full">
          {error && (
            <Toast
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs">
            <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <span>
              Completar el check-in calibra los pesos y previene lesiones ajustando el volumen en tiempo real (RF-04, RF-08).
            </span>
          </div>

          {/* 1. Nivel de Fatiga Percibida (1-5) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-brand-primary" />
                Nivel de fatiga percibida (1–5)
              </span>
              <Badge variant="brand" size="sm">
                Nivel {fatigueLevel}
              </Badge>
            </div>

            <div className="grid grid-cols-5 gap-1.5 w-full">
              {FATIGUE_LEVELS.map((item) => {
                const isSelected = fatigueLevel === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    aria-label={`Fatiga ${item.level}: ${item.label}`}
                    aria-pressed={isSelected}
                    onClick={() => setFatigueLevel(item.level)}
                    className={`touch-target min-h-[48px] p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      isSelected
                        ? 'bg-brand-primary text-brand-contrast border-brand-primary font-bold shadow-md'
                        : 'bg-surface-2 border-border-interactive text-content-primary hover:border-content-secondary'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{item.level}</span>
                    <span className="text-[9px] leading-tight font-normal">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mapa de Articulaciones y Molestias (CA-04.2, CA-04.3) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-primary" />
                Molestias articulares
              </span>
              <span className="text-[11px] text-content-secondary">
                {activeJointsCount === 0 ? 'Sin molestias' : `${activeJointsCount} articulaciones`}
              </span>
            </div>

            {/* Chips de Articulaciones en lista vertical de 1 columna / responsive */}
            <div className="flex flex-col gap-1.5 w-full">
              {JOINTS_TAXONOMY.map((j) => {
                const isSelected = selectedJoints[j.id] !== null;
                return (
                  <button
                    key={j.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleJoint(j.id)}
                    className={`touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-brand-primary/15 border-brand-primary text-brand-primary shadow-sm'
                        : 'bg-surface-2 border-border-interactive text-content-primary hover:border-content-secondary'
                    }`}
                  >
                    <span className="truncate pr-1">{j.label}</span>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-border-interactive shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Configuración de Lado e Intensidad para articulación activa */}
            {activeJointTab && selectedJoints[activeJointTab] && (
              <div className="p-3.5 rounded-2xl bg-surface-base border border-border-interactive flex flex-col gap-3 mt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <span className="text-xs font-bold text-content-primary capitalize flex items-center gap-1.5">
                    <HeartCrack className="w-3.5 h-3.5 text-brand-primary" />
                    Ajustar: {JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.label}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar molestia de ${JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.label}`}
                    onClick={() => toggleJoint(activeJointTab)}
                    className="touch-target min-h-[48px] min-w-[48px] px-2.5 py-1 text-xs text-semantic-error-text hover:text-red-300 font-medium rounded-lg active:scale-95 transition-all"
                  >
                    Quitar
                  </button>
                </div>

                {/* Selector de Lado (Bilateral) */}
                {!JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.isBilateralOnly && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-content-secondary">
                      Lado de molestia
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                      {(
                        [
                          { id: 'izquierda', label: 'Izquierda' },
                          { id: 'derecha', label: 'Derecha' },
                          { id: 'bilateral', label: 'Bilateral' }
                        ] as const
                      ).map((side) => {
                        const isSideSelected = selectedJoints[activeJointTab]?.side === side.id;
                        return (
                          <button
                            key={side.id}
                            type="button"
                            aria-label={`Lado ${side.label}`}
                            aria-pressed={isSideSelected}
                            onClick={() => updateSide(activeJointTab, side.id)}
                            className={`touch-target min-h-[48px] py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                              isSideSelected
                                ? 'bg-brand-primary/20 border-brand-primary text-brand-primary font-bold'
                                : 'bg-surface-2 border-border-interactive text-content-secondary hover:border-content-secondary'
                            }`}
                          >
                            {side.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selector de Intensidad (Leve, Moderada, Severa) (CA-04.3) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-content-secondary">
                    Intensidad del dolor
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 w-full">
                    {(
                      [
                        { id: 'leve', label: 'Leve', color: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' },
                        { id: 'moderada', label: 'Moderada', color: 'bg-amber-500/20 border-amber-500/60 text-amber-300' },
                        { id: 'severa', label: 'Severa', color: 'bg-red-500/20 border-red-500/60 text-red-300' }
                      ] as const
                    ).map((intensity) => {
                      const isIntSelected = selectedJoints[activeJointTab]?.intensity === intensity.id;
                      return (
                        <button
                          key={intensity.id}
                          type="button"
                          aria-label={`Intensidad ${intensity.label}`}
                          aria-pressed={isIntSelected}
                          onClick={() => updateIntensity(activeJointTab, intensity.id)}
                          className={`touch-target min-h-[48px] py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                            isIntSelected
                              ? `${intensity.color} font-bold shadow-sm ring-1 ring-brand-primary`
                              : 'bg-surface-2 border-border-interactive text-content-secondary hover:border-content-secondary'
                          }`}
                        >
                          {intensity.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zona de Acciones Inferior Fija en Mitad Inferior (RF-04, CF-06) */}
        <div
          data-testid="checkin-bottom-actions"
          className="p-4 border-t border-border-interactive bg-surface-1/95 backdrop-blur-md flex flex-col gap-2 pb-[calc(16px+env(safe-area-inset-bottom))]"
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            onClick={handleSubmit}
            iconLeft={<ShieldCheck className="w-5 h-5" />}
            className="shadow-xl min-h-[48px] touch-target font-bold"
          >
            Confirmar Check-in e Iniciar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CheckInModal;
