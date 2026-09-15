import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  WifiOff,
  Loader2,
  CalendarX
} from 'lucide-react';
import { offlineSyncStore } from '../../stores/offlineSync.store';
import { cancelActiveMesocycle } from '../../api';

export interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (reason?: string) => Promise<void> | void;
  onCancelSuccess?: () => void;
  activeMesocycleName?: string;
  isOffline?: boolean;
  isCancelling?: boolean;
}

export const CANCELLATION_REASONS = [
  { id: 'lesion', label: 'Molestia física o lesión' },
  { id: 'falta_tiempo', label: 'Falta de tiempo o cambio de horarios' },
  { id: 'cambio_objetivos', label: 'Cambio de objetivos' },
  { id: 'otro', label: 'Otro motivo' }
] as const;

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancelSuccess,
  activeMesocycleName,
  isOffline: propIsOffline,
  isCancelling: propIsCancelling = false
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('falta_tiempo');
  const [internalCancelling, setInternalCancelling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBrowserOffline, setIsBrowserOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Sync browser online/offline status
  useEffect(() => {
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('falta_tiempo');
      setInternalCancelling(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOffline = propIsOffline ?? isBrowserOffline;
  const isCancelling = propIsCancelling || internalCancelling;

  const handleConfirmCancellation = async () => {
    if (isCancelling) return;

    setErrorMsg(null);
    setInternalCancelling(true);

    try {
      if (onConfirm) {
        await onConfirm(selectedReason);
      } else {
        // Fallback default cancellation
        if (isOffline) {
          await offlineSyncStore.cancelActiveMesocycleLocally(selectedReason);
        } else {
          try {
            await cancelActiveMesocycle(selectedReason);
          } catch {
            // If network request fails, fall back to offline local cancellation
            await offlineSyncStore.cancelActiveMesocycleLocally(selectedReason);
          }
        }
      }

      onCancelSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar el mesociclo';
      setErrorMsg(msg);
    } finally {
      setInternalCancelling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancellation-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCancelling) onClose();
      }}
    >
      <div
        data-testid="cancellation-modal"
        className="w-full max-w-[390px] mx-auto bg-zinc-950 border border-zinc-800/90 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-100 overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="cancellation-modal-title"
                className="text-base font-bold text-zinc-100 tracking-tight"
              >
                Cancelar mesociclo
              </h2>
              {activeMesocycleName ? (
                <p className="text-xs font-semibold text-amber-400 mt-0.5">
                  {activeMesocycleName}
                </p>
              ) : (
                <p className="text-xs text-zinc-400 mt-0.5">
                  Confirmación de anulación del ciclo activo
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isCancelling}
            onClick={onClose}
            aria-label="Cerrar"
            className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicit Warning Box (RF-07 CA-07.3) */}
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs text-red-200/90 leading-relaxed">
            <p className="font-semibold text-red-300">
              Acción irreversible sobre el plan en curso
            </p>
            <p>
              Al cancelar el mesociclo actual, se cancelará la planificación de las sesiones futuras restantes. Las sesiones ya completadas y tus pesos levantados quedarán guardados en tu historial.
            </p>
          </div>
        </div>

        {/* Motivo de cancelación */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300">
            Motivo de la anulación (opcional):
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {CANCELLATION_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={isCancelling}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedReason(r.id)}
                  className={`touch-target min-h-[48px] px-3.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-zinc-800 border-2 border-red-500/80 text-zinc-100 font-semibold shadow-sm'
                      : 'bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{r.label}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Offline Notice (RF-07 CA-07.4) */}
        {isOffline && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-amber-300">
                Operación sin conexión (Offline-First)
              </span>
              <p className="text-[11px] text-amber-300/90 leading-tight">
                Cancelado localmente. Se sincronizará con el servidor al recuperar conexión.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons (Constitución Art. 2: touch target >= 48px en mitad inferior) */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
          <button
            type="button"
            disabled={isCancelling}
            onClick={handleConfirmCancellation}
            className="touch-target min-h-[48px] w-full rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Cancelando mesociclo...</span>
              </>
            ) : (
              <>
                <CalendarX className="w-4 h-4 stroke-[2.5]" />
                <span>Sí, cancelar mesociclo</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isCancelling}
            onClick={onClose}
            className="touch-target min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Mantener mesociclo
          </button>
        </div>
      </div>
    </div>
  );
};
