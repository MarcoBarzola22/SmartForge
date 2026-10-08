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
  activeTab?: string;
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
  activeTab,
  className = ''
}) => {
  const { isKeyboardOpen, availableHeight } = useVisualViewport(64);

  return (
    <div className="min-h-screen overflow-x-hidden bg-shell flex justify-center w-full select-none">
      <div
        data-testid="mobile-container"
        className="w-full max-w-[390px] min-h-screen bg-ink text-content-primary flex flex-col relative overflow-x-hidden border-x border-line/40 shadow-2xl"
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
            'flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-4 w-full',
            activeTab === 'session' ? 'pb-56' : 'pb-28',
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
