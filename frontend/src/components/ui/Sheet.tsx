import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { X as XIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "./Button"

interface SheetContextValue {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({});

function Sheet({
  open,
  onOpenChange,
  children,
  ...props
}: SheetPrimitive.Root.Props & {
  onOpenChange?: (open: boolean) => void;
}) {
  React.useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      // Intercept back gesture / hardware button to close the sheet
      onOpenChange?.(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, onOpenChange]);

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      >
        {children}
      </SheetPrimitive.Root>
    </SheetContext.Provider>
  );
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-xs overscroll-contain transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export interface SheetContentProps
  extends Omit<SheetPrimitive.Popup.Props, "children"> {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  isKeyboardOpen?: boolean;
  children?: React.ReactNode;
}

function SheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  isKeyboardOpen = false,
  ...props
}: SheetContentProps) {
  const [keyboardActive, setKeyboardActive] = React.useState(isKeyboardOpen);

  React.useEffect(() => {
    setKeyboardActive(isKeyboardOpen);
  }, [isKeyboardOpen]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const isKeyboardVisible = window.visualViewport.height < window.innerHeight * 0.75;
      setKeyboardActive(isKeyboardVisible || isKeyboardOpen);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [isKeyboardOpen]);

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-surface-1 text-content-primary shadow-xl overscroll-contain border-border-interactive transition-all duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0",
          side === "bottom" && [
            "inset-x-0 bottom-0 w-full max-w-[390px] mx-auto border-t rounded-t-2xl max-h-[90vh]",
            keyboardActive ? "h-full max-h-full rounded-none" : "h-auto",
            "data-ending-style:translate-y-full data-starting-style:translate-y-full",
          ],
          side === "left" && [
            "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
            "data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
          ],
          side === "right" && [
            "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
            "data-ending-style:translate-x-full data-starting-style:translate-x-full",
          ],
          side === "top" && [
            "inset-x-0 top-0 w-full max-w-[390px] mx-auto border-b rounded-b-2xl h-auto",
            "data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
          ],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2.5 right-2.5 size-12 min-h-[48px] min-w-[48px] touch-target rounded-full p-0 text-content-secondary hover:text-content-primary hover:bg-surface-2"
                aria-label="Cerrar"
              />
            }
          >
            <XIcon className="size-5" />
            <span className="sr-only">Cerrar</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 p-4 pb-0 text-left", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4 pt-2", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-sans text-lg font-bold text-content-primary leading-tight",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs font-medium text-content-secondary", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
}
