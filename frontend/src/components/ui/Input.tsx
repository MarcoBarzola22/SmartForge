import * as React from 'react';
import { cn } from 'cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  unit?: string;
  externalUnit?: string;
  normalizeDecimal?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      unit,
      externalUnit,
      normalizeDecimal = true,
      iconLeft,
      iconRight,
      id,
      className = '',
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;
    const unitLabel = unit || externalUnit;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (normalizeDecimal && e.target.value.includes(',')) {
        const normalized = e.target.value.replace(/,/g, '.');
        e.target.value = normalized;
      }
      onChange?.(e);
    };

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-content-secondary select-none tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {iconLeft && (
            <div className="absolute left-3.5 pointer-events-none text-content-disabled flex items-center justify-center">
              {iconLeft}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            onChange={handleChange}
            className={cn(
              "w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border-interactive text-content-primary placeholder:text-content-disabled text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:border-brand-focus disabled:opacity-50 disabled:bg-surface-disabled touch-target",
              error
                ? "border-status-error-bg text-content-primary focus-visible:ring-status-error-bg focus-visible:border-status-error-bg"
                : "hover:border-content-secondary",
              iconLeft && "pl-10",
              unitLabel ? "pr-14" : (iconRight ? "pr-10" : ""),
              className
            )}
            {...props}
          />

          {unitLabel && (
            <div className="absolute right-3.5 pointer-events-none text-xs font-semibold text-content-secondary uppercase tracking-wider select-none">
              {unitLabel}
            </div>
          )}

          {!unitLabel && iconRight && (
            <div className="absolute right-3.5 pointer-events-none text-content-disabled flex items-center justify-center">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs text-status-error-text font-medium tracking-wide">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-content-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
