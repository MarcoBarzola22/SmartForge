import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
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
  { level: 1, label: 'Mínima', desc: 'Descansado', color: 'emerald' },
  { level: 2, label: 'Baja', desc: 'Energía óptima', color: 'emerald' },
  { level: 3, label: 'Moderada', desc: 'Fatiga normal', color: 'amber' },
  { level: 4, label: 'Alta', desc: 'Cansancio notable', color: 'amber' },
  { level: 5, label: 'Extrema', desc: 'Agotamiento', color: 'red' }
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
            side: jointId === 'columna_lumbar' ? 'bilateral' : 'bilateral',
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
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Check-in Pre-Sesión"
      description="Evaluación obligatoria de fatiga y molestias articulares"
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            onClick={handleSubmit}
            iconLeft={<ShieldCheck className="w-5 h-5" />}
            className="shadow-xl"
          >
            Confirmar Check-in e Iniciar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error && (
          <Toast
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Completar el check-in calibra los pesos y previene lesiones ajustando el volumen en tiempo real (RF-04, RF-08).
          </span>
        </div>

        {/* 1. Nivel de Fatiga Percibida (1-5) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Nivel de fatiga percibida (1–5)
            </span>
            <Badge variant="amber" size="sm">
              Nivel {fatigueLevel}
            </Badge>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
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
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
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
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              Molestias articulares
            </span>
            <span className="text-[11px] text-zinc-400">
              {activeJointsCount === 0 ? 'Sin molestias' : `${activeJointsCount} articulaciones`}
            </span>
          </div>

          {/* Chips de Articulaciones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {JOINTS_TAXONOMY.map((j) => {
              const isSelected = selectedJoints[j.id] !== null;
              return (
                <button
                  key={j.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleJoint(j.id)}
                  className={`touch-target min-h-[48px] px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="truncate pr-1">{j.label}</span>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Configuración de Lado e Intensidad para articulación activa */}
          {activeJointTab && selectedJoints[activeJointTab] && (
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3 mt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-zinc-200 capitalize flex items-center gap-1.5">
                  <HeartCrack className="w-3.5 h-3.5 text-amber-400" />
                  Ajustar: {JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.label}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar molestia de ${JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.label}`}
                  onClick={() => toggleJoint(activeJointTab)}
                  className="touch-target min-h-[48px] min-w-[48px] px-2.5 py-1 text-xs text-red-400 hover:text-red-300 font-medium rounded-lg hover:bg-red-500/10 active:scale-95 transition-all"
                >
                  Quitar
                </button>
              </div>

              {/* Selector de Lado (Bilateral) */}
              {!JOINTS_TAXONOMY.find((j) => j.id === activeJointTab)?.isBilateralOnly && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-400">
                    Lado de molestia
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
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
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
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
                <span className="text-[11px] font-medium text-zinc-400">
                  Intensidad del dolor
                </span>
                <div className="grid grid-cols-3 gap-1.5">
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
                            ? `${intensity.color} font-bold shadow-sm ring-1 ring-amber-400/40`
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
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
    </Modal>
  );
};

export default CheckInModal;
