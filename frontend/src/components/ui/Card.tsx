import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  footer,
  onClick,
  className = '',
  children,
  ...props
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`w-full rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-4 shadow-md transition-all duration-150 ${
        isClickable
          ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-850 active:scale-[0.99] min-h-[48px] select-none'
          : ''
      } ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/40">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-zinc-100">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className="text-sm text-zinc-300">{children}</div>

      {footer && (
        <div className="pt-3 mt-3 border-t border-zinc-800/40 text-xs text-zinc-400">
          {footer}
        </div>
      )}
    </div>
  );
};
