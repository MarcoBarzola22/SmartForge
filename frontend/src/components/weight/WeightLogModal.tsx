import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Scale, X, Loader2 } from 'lucide-react';
import type { WeightLogItem } from '../../api/generated/types';

export interface WeightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLog?: WeightLogItem | null;
  initialDate?: string;
  existingLogs?: WeightLogItem[];
  onSave?: (data: { weight_kg: number; logged_date: string; id?: string }) => Promise<void> | void;
}

/**
 * Retorna la fecha del lunes de la semana calendario (YYYY-MM-DD) en hora local.
 */
function getCalendarWeekMonday(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year || 2026, (month || 1) - 1, day || 1);
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateNum}`;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  isOpen,
  onClose,
  initialLog,
  initialDate,
  existingLogs = [],
  onSave
}) => {
  const isEdit = Boolean(initialLog);

  const [weightStr, setWeightStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar o resetear valores cada vez que el modal se abre o cambia initialLog
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsSubmitting(false);

      if (initialLog) {
        setWeightStr(String(initialLog.weight_kg));
        setDateStr(initialLog.logged_date);
      } else {
        setWeightStr('');
        if (initialDate) {
          setDateStr(initialDate);
        } else {
          // Default to today's date YYYY-MM-DD
          const today = new Date();
          const y = today.getFullYear();
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const d = String(today.getDate()).padStart(2, '0');
          setDateStr(`${y}-${m}-${d}`);
        }
      }
    }
  }, [isOpen, initialLog, initialDate]);

  // Manejar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Normalizar comas a puntos decimales para teclados numéricos hispanos
    if (val.includes(',')) {
      val = val.replace(/,/g, '.');
    }
    setWeightStr(val);
    if (errorMsg) setErrorMsg(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStr(e.target.value);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validar campo no vacío
    if (!weightStr.trim()) {
      setErrorMsg('Ingresa un peso válido.');
      return;
    }

    const weightNum = parseFloat(weightStr);
    if (isNaN(weightNum)) {
      setErrorMsg('Ingresa un valor numérico válido.');
      return;
    }

    // 2. Validación de rango numérico (RF-01 CA-01.5)
    if (weightNum < 30.0) {
      setErrorMsg('El peso debe ser al menos 30.0 kg.');
      return;
    }
    if (weightNum > 300.0) {
      setErrorMsg('El peso no puede superar los 300.0 kg.');
      return;
    }

    if (!dateStr) {
      setErrorMsg('Selecciona una fecha válida.');
      return;
    }

    // 3. Validación de colisión de semana y guarda de 120h (RF-01 CA-01.4)
    if (!isEdit && existingLogs.length > 0) {
      const selectedWeekStart = getCalendarWeekMonday(dateStr);
      const sameWeekLog = existingLogs.find(
        (log) => log.calendar_week_start === selectedWeekStart
      );

      if (sameWeekLog) {
        setErrorMsg(
          'Ya existe un pesaje registrado para esta semana. Habilita el modo de edición si deseas modificarlo.'
        );
        return;
      }

      // Validar guarda de 120 horas (5 días) respecto a otros pesajes
      const selectedTime = new Date(`${dateStr}T12:00:00Z`).getTime();
      for (const log of existingLogs) {
        const logTime = new Date(`${log.logged_date}T12:00:00Z`).getTime();
        const diffHours = Math.abs(selectedTime - logTime) / (1000 * 60 * 60);
        if (diffHours < 120) {
          setErrorMsg(
            'Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes.'
          );
          return;
        }
      }
    }

    // Redondear a 1 decimal
    const normalizedWeight = Math.round(weightNum * 10) / 10;

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave({
          id: initialLog?.id,
          weight_kg: normalizedWeight,
          logged_date: dateStr
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el pesaje.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="weight-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[390px] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="weight-modal-title"
                className="text-base font-bold text-zinc-100 tracking-tight leading-tight"
              >
                {isEdit ? 'Editar peso corporal' : 'Registrar peso corporal'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Seguimiento semanal de composición física
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            disabled={isSubmitting}
            className="touch-target min-h-[48px] min-w-[48px] inline-flex items-center justify-center p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advertencia contextual en modo edición (RF-02 CA-02.3) */}
        {isEdit && (
          <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Atención:</strong> Modificar datos históricos puede alterar la consistencia de tu gráfica de progreso.
            </p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Campo de Peso en kg */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="weight-input"
              className="text-xs font-medium text-zinc-300 flex items-center justify-between"
            >
              <span>Peso corporal</span>
              <span className="text-zinc-500 text-[11px]">Rango: 30.0 – 300.0 kg</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="weight-input"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="75.0"
                value={weightStr}
                onChange={handleWeightChange}
                disabled={isSubmitting}
                className="w-full min-h-[48px] px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all pr-12"
              />
              <span className="absolute right-4 text-sm font-semibold text-zinc-400 select-none">
                kg
              </span>
            </div>
          </div>

          {/* Campo de Fecha */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="date-input"
              className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fecha del pesaje</span>
            </label>
            <input
              id="date-input"
              type="date"
              value={dateStr}
              onChange={handleDateChange}
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Mensaje de Error / Alerta */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {/* Botones de acción (Mitad inferior, operables a una mano con altura >= 48px, Art. 2) */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target min-h-[48px] w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-md active:translate-y-px transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{isEdit ? 'Guardar cambios' : 'Registrar pesaje'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="touch-target min-h-[48px] w-full px-5 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
