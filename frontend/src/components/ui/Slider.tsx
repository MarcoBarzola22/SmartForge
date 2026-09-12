import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  helperText?: string;
  displayValueFormatter?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min = 0,
  max = 5,
  step = 1,
  value,
  onChange,
  helperText,
  displayValueFormatter,
  className = '',
  disabled,
  ...props
}) => {
  const displayVal = displayValueFormatter ? displayValueFormatter(value) : value;

  return (
    <div className="w-full flex flex-col gap-2 text-left">
      <div className="flex justify-between items-center">
        {label && (
          <span className="text-xs font-semibold text-zinc-300 tracking-wide">
            {label}
          </span>
        )}
        <span className="text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
          {displayVal}
        </span>
      </div>

      <div className="relative flex items-center min-h-[48px] touch-target w-full">
        <input
          type="range"
          role="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full min-h-[48px] touch-target appearance-none bg-zinc-800 rounded-lg h-2.5 accent-amber-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>

      {helperText && (
        <p className="text-xs text-zinc-500 -mt-1">{helperText}</p>
      )}
    </div>
  );
};
