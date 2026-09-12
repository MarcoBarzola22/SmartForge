import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 text-center break-words leading-tight min-h-[48px] touch-target shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primary text-brand-contrast hover:bg-brand-primary/90 font-semibold shadow-sm",
        primary:
          "bg-brand-primary text-brand-contrast hover:bg-brand-primary/90 font-semibold shadow-sm",
        secondary:
          "bg-surface-1 border-border-interactive text-content-primary hover:bg-surface-2 border shadow-sm",
        outline:
          "border-border-interactive bg-transparent text-content-primary hover:bg-surface-2 border",
        ghost:
          "text-content-primary hover:bg-surface-2 hover:text-content-primary",
        destructive:
          "bg-status-error-bg text-white hover:bg-status-error-bg/90 font-semibold shadow-sm",
        danger:
          "bg-status-error-bg text-white hover:bg-status-error-bg/90 font-semibold shadow-sm",
        link:
          "text-brand-primary underline-offset-4 hover:underline min-w-0 min-h-0",
      },
      size: {
        default:
          "min-h-[48px] max-h-[64px] min-w-[120px] px-4 py-2 text-sm line-clamp-2 gap-2",
        sm:
          "min-h-[48px] max-h-[64px] min-w-[120px] px-3 py-2 text-xs line-clamp-2 gap-1.5",
        md:
          "min-h-[48px] max-h-[64px] min-w-[120px] px-4 py-2 text-sm line-clamp-2 gap-2",
        lg:
          "min-h-[48px] max-h-[64px] min-w-[120px] px-6 py-2.5 text-base line-clamp-2 gap-2.5",
        icon:
          "min-h-[48px] min-w-[48px] w-12 h-12 p-0 justify-center gap-0 rounded-lg",
        "icon-xs":
          "min-h-[48px] min-w-[48px] w-12 h-12 p-0 justify-center gap-0 rounded-lg",
        "icon-sm":
          "min-h-[48px] min-w-[48px] w-12 h-12 p-0 justify-center gap-0 rounded-lg",
        "icon-lg":
          "min-h-[48px] min-w-[48px] w-12 h-12 p-0 justify-center gap-0 rounded-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      fullWidth = false,
      isLoading = false,
      disabled = false,
      iconLeft,
      iconRight,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const lastClickRef = React.useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const now = Date.now();
      if (now - lastClickRef.current < 50) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lastClickRef.current = now;
      onClick?.(e);
    };

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot="button"
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        onClick={handleClick}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {isLoading ? (
          <span
            data-testid="loading-spinner"
            className="inline-flex items-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            {children && <span className="line-clamp-2 break-words">{children}</span>}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 w-full">
            {iconLeft && <span className="shrink-0">{iconLeft}</span>}
            {children && (
              typeof children === "string" ? (
                <span className="line-clamp-2 break-words text-center">{children}</span>
              ) : children
            )}
            {iconRight && <span className="shrink-0">{iconRight}</span>}
          </span>
        )}
      </ButtonPrimitive>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants }
