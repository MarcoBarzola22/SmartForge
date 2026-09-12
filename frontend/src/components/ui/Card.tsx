import * as React from 'react';
import { cn } from 'cn';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      headerAction,
      footer,
      onClick,
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
          "w-full overflow-hidden rounded-xl bg-surface-1 border border-border-subtle p-4 shadow-sm text-content-primary transition-all duration-150",
          isClickable &&
            "cursor-pointer hover:border-border-interactive hover:bg-surface-2 active:scale-[0.99] min-h-[48px] touch-target select-none",
          className
        )}
        {...props}
      >
        {(title || headerAction) && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle/40">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-base font-bold text-content-primary">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-content-secondary font-medium">{subtitle}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}

        <div className="text-sm text-content-primary">{children}</div>

        {footer && (
          <div className="pt-3 mt-3 border-t border-border-subtle/40 text-xs text-content-secondary">
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
    className={cn('flex flex-col gap-1.5 pb-2 mb-2 border-b border-border-subtle/40', className)}
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
    className={cn('text-base font-bold leading-tight text-content-primary', className)}
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
    className={cn('text-xs font-medium text-content-secondary', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm text-content-primary', className)} {...props} />
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
