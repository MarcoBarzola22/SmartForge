import * as React from 'react';
import { cn } from 'cn';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'hero' | 'elevated' | 'glass';
}

const cardVariantStyles = {
  default: 'bg-surface-1 border-border-subtle shadow-lg shadow-brand/5',
  hero: 'hero-gradient border-border-subtle shadow-lg shadow-brand/10',
  elevated: 'bg-surface-elevated border-border-subtle shadow-lg shadow-neon/10',
  glass: 'glass border-white/5 shadow-xl',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      headerAction,
      footer,
      onClick,
      variant = 'default',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isClickable = Boolean(onClick);

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          "w-full overflow-hidden rounded-xl md:rounded-2xl border p-4 text-content-primary transition-all duration-150 break-words min-w-0",
          cardVariantStyles[variant] || cardVariantStyles.default,
          isClickable &&
            "cursor-pointer hover:border-border-interactive hover:bg-surface-2 press min-h-[48px] touch-target select-none",
          className
        )}
        {...props}
      >
        {variant === 'elevated' && (
          <div className="top-gradient h-1 -mx-4 -mt-4 mb-3" />
        )}

        {(title || headerAction) && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle/40 min-w-0 gap-2">
            <div className="min-w-0 flex-1">
              {typeof title === 'string' ? (
                <h3 className="text-base font-bold text-content-primary break-words min-w-0">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-content-secondary font-medium break-words min-w-0">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        )}

        <div className="text-sm text-content-primary break-words min-w-0">{children}</div>

        {footer && (
          <div className="pt-3 mt-3 border-t border-border-subtle/40 text-xs text-content-secondary break-words min-w-0">
            {footer}
          </div>
        )}
      </div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1.5 pb-2 mb-2 border-b border-border-subtle/40 min-w-0', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-bold leading-tight text-content-primary break-words min-w-0', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs font-medium text-content-secondary break-words min-w-0', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm text-content-primary break-words min-w-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-3 mt-3 border-t border-border-subtle/40 text-xs text-content-secondary', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
