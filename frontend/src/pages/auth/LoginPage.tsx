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
    <div className="min-h-screen bg-shell flex justify-center w-full select-none">
      <div
        data-testid="mobile-container"
        className="w-full max-w-[390px] min-h-screen bg-shell text-content flex flex-col justify-between p-5 shadow-2xl relative overflow-x-hidden border-x border-line"
      >
        {/* Brand Header con Hero Gradient y Logo Animado (T-20) */}
        <div className="hero-gradient animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-3xl border border-line p-6 flex flex-col items-center text-center space-y-3 shadow-lg shadow-brand/10 mt-4">
          <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center text-brand-focus shadow-xl shadow-brand/20 animate-pulse">
            <Dumbbell className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-content">
              Smart<span className="text-brand-focus">Forge</span>
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber">
              Entrenador Personal Digital
            </p>
          </div>

          <p className="text-xs text-content-2 max-w-[280px] leading-relaxed">
            Entrenador personal digital con sobrecarga progresiva, auditoría de fatiga y mesociclos autorregulados.
          </p>
        </div>

        {/* Feature Highlights en Surface Cards con Glow (T-20) */}
        <div className="space-y-2 py-4">
          <div className="p-3 rounded-2xl bg-surface-1 border border-line flex items-center gap-3 shadow-lg shadow-brand/5">
            <div className="p-2 rounded-xl bg-amber/15 text-amber border border-amber/25 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content">Sobrecarga Progresiva</div>
              <div className="text-[10px] text-content-3">Incrementos automáticos por nivel y RIR</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-1 border border-line flex items-center gap-3 shadow-lg shadow-brand/5">
            <div className="p-2 rounded-xl bg-success/15 text-success border border-success/25 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content">Auditoría de Dolor Articular</div>
              <div className="text-[10px] text-content-3">Ajuste de volumen y rotación inteligente</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-1 border border-line flex items-center gap-3 shadow-lg shadow-brand/5">
            <div className="p-2 rounded-xl bg-brand/15 text-brand-focus border border-brand/25 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-content">100% Offline en el Gimnasio</div>
              <div className="text-[10px] text-content-3">Sincronización automática en reconexión</div>
            </div>
          </div>
        </div>

        {/* Autenticación 100% OAuth con Google (T-20, T-87) */}
        <div className="flex flex-col gap-3 w-full pb-4">
          {error && (
            <div className="p-3 rounded-xl bg-fatigue/15 border border-fatigue/30 text-fatigue-text text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-fatigue-text" />
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
              className="press touch-target min-h-[48px] h-12 rounded-xl font-bold flex items-center justify-center gap-2.5 bg-surface-2 border border-line text-content hover:bg-surface-3 shadow-lg transition-all"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span>Continuar con Google</span>
            </Button>
          </div>

          <p className="text-[11px] text-content-3 text-center leading-tight">
            Al continuar, aceptás el registro y creación de tu perfil de entrenamiento (edad mínima 16 años).
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
