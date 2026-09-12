import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  iconLeft,
  iconRight,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-zinc-300 select-none tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute left-3.5 pointer-events-none text-zinc-400">
            {iconLeft}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-zinc-100 placeholder-zinc-500 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:opacity-50 disabled:bg-zinc-950 ${
            error
              ? 'border-red-500 text-red-100 focus:ring-red-500/40 focus:border-red-500'
              : 'border-zinc-800 hover:border-zinc-700'
          } ${iconLeft ? 'pl-10' : ''} ${iconRight ? 'pr-10' : ''} ${className}`}
          {...props}
        />

        {iconRight && (
          <div className="absolute right-3.5 pointer-events-none text-zinc-400">
            {iconRight}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-400 font-medium tracking-wide">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="text-xs text-zinc-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
