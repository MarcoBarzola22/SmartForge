import React from 'react';
import { StatusBar } from './StatusBar';

export interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = 'SmartForge',
  subtitle,
  isOnline = true,
  headerAction,
  footer,
  className = ''
}) => {
  return (
    <div className="min-h-screen bg-black flex justify-center w-full">
      <div
        data-testid="mobile-container"
        className="w-full max-w-[390px] min-h-screen bg-zinc-950 text-zinc-100 flex flex-col shadow-2xl relative overflow-x-hidden border-x border-zinc-900/40"
      >
        {/* Adaptive Status Bar / Header */}
        <StatusBar
          title={title}
          subtitle={subtitle}
          isOnline={isOnline}
          rightAction={headerAction}
        />

        {/* Main Content Scrollable Area (Zero Horizontal Scroll) */}
        <main
          className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-4 ${className}`}
        >
          {children}
        </main>

        {/* Bottom Area (Thumb Zone ≤ 60% viewport height for single-hand reach) */}
        {footer && (
          <footer className="sticky bottom-0 w-full bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-30">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
