import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "cn";

export interface StepperProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  unit: string;
  className?: string;
  disabled?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  label,
  value,
  step = 1,
  min = 0,
  max = Infinity,
  onChange,
  unit,
  className = "",
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (disabled) return;
    const nextVal = +(value - step).toFixed(2);
    onChange(Math.max(min, nextVal));
  };

  const handleIncrement = () => {
    if (disabled) return;
    const nextVal = +(value + step).toFixed(2);
    onChange(Math.min(max, nextVal));
  };

  return (
    <div className={cn("rounded-xl bg-surface-2 p-3 text-left select-none w-full", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-content-2">
        {label}
      </p>
      <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
        <button
          type="button"
          aria-label={`Restar ${label}`}
          disabled={disabled || value <= min}
          onClick={handleDecrement}
          className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Minus className="h-5 w-5" />
        </button>
        <p
          className="text-center font-mono text-2xl font-bold text-content break-words min-w-0"
          data-testid={`stepper-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {value}
          <span className="ml-1 text-[11px] font-normal text-content-2">{unit}</span>
        </p>
        <button
          type="button"
          aria-label={`Sumar ${label}`}
          disabled={disabled || value >= max}
          onClick={handleIncrement}
          className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Stepper;
