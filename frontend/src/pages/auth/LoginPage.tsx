import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Dumbbell, ShieldCheck, Flame, RefreshCw, AlertCircle } from 'lucide-react';

export interface LoginPageProps {
  onNavigateToApp?: () => void;
  onNavigateToOnboarding?: () => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      fill="#34A853"
    />
    <path
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      fill="#EA4335"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToApp,
  onNavigateToOnboarding
}) => {
  const {
    isAuthenticated,
    isProfileComplete,
    isLoading,
    error,
    loginWithGoogle
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (isProfileComplete) {
        onNavigateToApp?.();
      } else {
        onNavigateToOnboarding?.();
      }
    }
  }, [isAuthenticated, isProfileComplete, onNavigateToApp, onNavigateToOnboarding]);

  return (
    <div className="min-h-screen bg-black flex justify-center w-full select-none">
      <div
        data-testid="mobile-container"
        className="w-full max-w-[390px] min-h-screen bg-surface-base text-content-primary flex flex-col justify-between p-5 shadow-2xl relative overflow-x-hidden border-x border-border-subtle"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pt-6 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-xl shadow-brand-primary/10">
            <Dumbbell className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-content-primary">
              Smart<span className="text-brand-primary">Forge</span>
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-primary">
              Entrenador Personal Digital
            </p>
          </div>

          <p className="text-xs text-content-secondary max-w-[280px] leading-relaxed">
            Entrenador personal digital con sobrecarga progresiva, auditoría de fatiga y mesociclos autorregulados.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2 py-4">
          <div className="p-2.5 rounded-xl bg-surface-1 border border-border-subtle flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-primary/15 text-brand-primary border border-brand-primary/20 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content-primary">Sobrecarga Progresiva</div>
              <div className="text-[10px] text-content-secondary">Incrementos automáticos por nivel y RIR</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-1 border border-border-subtle flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-semantic-success/15 text-semantic-success border border-semantic-success/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content-primary">Auditoría de Dolor Articular</div>
              <div className="text-[10px] text-content-secondary">Ajuste de volumen y rotación inteligente</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-1 border border-border-subtle flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-focus/15 text-brand-focus border border-brand-focus/20 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content-primary">100% Offline en el Gimnasio</div>
              <div className="text-[10px] text-content-secondary">Sincronización automática en reconexión</div>
            </div>
          </div>
        </div>

        {/* Autenticación 100% OAuth con Google (T-87) */}
        <div className="flex flex-col gap-3 w-full pb-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-error-bg/15 border border-status-error-bg text-semantic-error-text text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-status-error-bg" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 w-full">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              onClick={loginWithGoogle}
              className="min-h-[48px] touch-target font-semibold flex items-center justify-center gap-2.5"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span>Continuar con Google</span>
            </Button>
          </div>

          <p className="text-[11px] text-content-disabled text-center leading-tight">
            Al continuar, aceptás el registro y creación de tu perfil de entrenamiento (edad mínima 16 años).
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
