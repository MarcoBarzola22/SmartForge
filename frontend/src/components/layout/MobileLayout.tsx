import React from 'react';
import { cn } from 'cn';
import { StatusBar } from './StatusBar';
import { ToastContainer } from '../ui/Toast';
import { useVisualViewport } from '../../hooks/useVisualViewport';

export interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  keyboardActionBar?: React.ReactNode;
  toastContent?: React.ReactNode;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = 'SmartForge',
  subtitle,
  isOnline = true,
  headerAction,
  footer,
  keyboardActionBar,
  toastContent,
  className = ''
}) => {
  const { isKeyboardOpen, availableHeight } = useVisualViewport(64);

  return (
    <div className="min-h-screen bg-black flex justify-center w-full select-none">
      <div
        data-testid="mobile-container"
        className="w-full max-w-[390px] min-h-screen bg-surface-base text-content-primary flex flex-col shadow-2xl relative overflow-x-hidden border-x border-border-subtle"
      >
        {/* Header contextual simplificado con safe-area */}
        <StatusBar
          title={title}
          subtitle={subtitle}
          isOnline={isOnline}
          rightAction={headerAction}
        />

        {/* Contenedor scrolleable dinámico (1 sola columna vertical, cero scroll horizontal) */}
        <main
          role="main"
          style={isKeyboardOpen ? { maxHeight: `${availableHeight}px` } : undefined}
          className={cn(
            'flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-4 pb-16 w-full',
            className
          )}
        >
          {children}
        </main>

        {/* ToastContainer integrado a 12px sobre la barra fija (bottom-[76px]) */}
        {toastContent && (
          <ToastContainer>
            {toastContent}
          </ToastContainer>
        )}

        {/* Conmutación entre BottomNav/Footer y KeyboardActionBar */}
        {isKeyboardOpen ? (
          keyboardActionBar && (
            <div className="sticky bottom-0 w-full z-40 shrink-0">
              {keyboardActionBar}
            </div>
          )
        ) : (
          footer && (
            <footer className="fixed bottom-0 left-0 right-0 w-full max-w-[390px] mx-auto z-50">
              {footer}
            </footer>
          )
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
