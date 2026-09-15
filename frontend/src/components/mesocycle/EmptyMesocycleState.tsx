import React from 'react';
import {
  CalendarPlus,
  Sparkles,
  History,
  User,
  Clock,
  TrendingUp
} from 'lucide-react';

export interface EmptyMesocycleStateProps {
  onGenerate?: () => void;
  onCreate?: () => void;
  onViewHistory?: () => void;
  onViewProfile?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export const EmptyMesocycleState: React.FC<EmptyMesocycleStateProps> = ({
  onGenerate,
  onCreate,
  onViewHistory,
  onViewProfile,
  title = 'Sin mesociclo activo',
  description = 'No tienes un mesociclo activo. Genera tu nueva rutina para continuar entrenando',
  className = ''
}) => {
  const handlePrimaryClick = () => {
    if (onGenerate) {
      onGenerate();
    } else if (onCreate) {
      onCreate();
    }
  };

  return (
    <div
      role="region"
      aria-label={title}
      data-testid="empty-mesocycle-state"
      className={`w-full max-w-[390px] mx-auto flex flex-col items-center text-center p-5 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-2xl gap-5 text-zinc-100 overflow-hidden ${className}`}
    >
      {/* Icon Badge with subtle glow */}
      <div className="relative my-2">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl scale-125" />
        <div className="relative w-16 h-16 rounded-2xl bg-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
          <CalendarPlus className="w-8 h-8 stroke-[1.8]" />
        </div>
      </div>

      {/* Text Hierarchy */}
      <div className="flex flex-col gap-2 max-w-[320px]">
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
          {title}
        </h2>
        <p className="text-xs font-medium text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Feature Highlights (Motor V2) */}
      <div className="w-full flex flex-col gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-left">
        <div className="flex items-center gap-2.5 text-xs text-zinc-300">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] leading-tight">
            <strong className="text-zinc-200">Bloques de tiempo fijos:</strong> sesiones uniformes de 30 a 120 min.
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-zinc-300">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] leading-tight">
            <strong className="text-zinc-200">Sobrecarga progresiva:</strong> controlada con techo de volumen seguro.
          </span>
        </div>
      </div>

      {/* Primary CTA (Constitución Art. 2: touch target >= 48px) */}
      <div className="w-full flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="touch-target min-h-[48px] w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4 text-zinc-950" />
          <span>Generar nuevo mesociclo</span>
        </button>

        {/* Secondary Actions: Historial y Perfil (RF-07 CA-07.9) */}
        {(onViewHistory || onViewProfile) && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/80 w-full">
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="touch-target min-h-[48px] w-full rounded-xl border border-zinc-800/90 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <History className="w-4 h-4 text-zinc-400" />
                <span>Ver historial de mesociclos</span>
              </button>
            )}

            {onViewProfile && (
              <button
                type="button"
                onClick={onViewProfile}
                className="touch-target min-h-[48px] w-full rounded-xl border border-zinc-800/90 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <User className="w-4 h-4 text-zinc-400" />
                <span>Ver perfil</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
