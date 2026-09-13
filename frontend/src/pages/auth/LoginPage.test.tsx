import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { AthleteProfile } from '../../api';

describe('TASK-62: LoginPage Component (RF-01, CA-01.1, Constitución §2)', () => {
  const sampleProfile: AthleteProfile = {
    id: 'ath-1',
    google_id: 'goog-1',
    email: 'test@smartforge.test',
    name: 'Atleta Login',
    age: 24,
    weight_kg: 70,
    experience_level: 'principiante',
    training_goal: 'fuerza',
    available_days_per_week: 3,
    equipment: [],
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-12T00:00:00Z'
  };

  const defaultMockAuth: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    isProfileComplete: false,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn()
  };

  const renderWithAuth = (authOverrides: Partial<AuthContextType> = {}, props = {}) => {
    const authValue = { ...defaultMockAuth, ...authOverrides };
    return render(
      <AuthContext.Provider value={authValue}>
        <LoginPage {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the login page with SmartForge title and Google OAuth button (touch target ≥ 48px)', () => {
    renderWithAuth();

    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading.textContent).toContain('SmartForge');
    expect(
      screen.getByText(/Entrenador personal digital con sobrecarga progresiva/i)
    ).toBeInTheDocument();

    const googleBtn = screen.getByRole('button', {
      name: /Continuar con Google/i
    });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn.className).toMatch(/min-h-\[48px\]|min-w-\[48px\]|touch-target/);
  });

  it('should call loginWithGoogle when Google button is clicked', async () => {
    const loginMock = vi.fn();
    renderWithAuth({ loginWithGoogle: loginMock });

    const googleBtn = screen.getByRole('button', {
      name: /Continuar con Google/i
    });
    fireEvent.click(googleBtn);

    expect(loginMock).toHaveBeenCalledTimes(1);
  });

  it('should show loading state when authentication is in progress', () => {
    renderWithAuth({ isLoading: true });

    const googleBtn = screen.getByRole('button', { name: /Continuar con Google/i });
    expect(googleBtn).toBeDisabled();
    expect(screen.getAllByTestId('loading-spinner').length).toBeGreaterThan(0);
  });

  it('should display error message when auth error exists', () => {
    renderWithAuth({ error: 'Error al conectar con Google OAuth' });

    expect(
      screen.getByText(/Error al conectar con Google OAuth/i)
    ).toBeInTheDocument();
  });

  it('should redirect to app when user is authenticated with complete profile', async () => {
    const onNavigateToApp = vi.fn();
    renderWithAuth(
      {
        isAuthenticated: true,
        isProfileComplete: true,
        user: sampleProfile
      },
      { onNavigateToApp }
    );

    await waitFor(() => {
      expect(onNavigateToApp).toHaveBeenCalledTimes(1);
    });
  });

  it('should redirect to onboarding when user is authenticated but profile is incomplete (CA-01.2)', async () => {
    const onNavigateToOnboarding = vi.fn();
    renderWithAuth(
      {
        isAuthenticated: true,
        isProfileComplete: false,
        user: null
      },
      { onNavigateToOnboarding }
    );

    await waitFor(() => {
      expect(onNavigateToOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  describe('T-87: Limpieza de Login y Perfil (RF-01, 100% OAuth con Google)', () => {
    const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

    it('no renderiza campos de correo o contraseña ni botón de iniciar sesión manual', () => {
      renderWithAuth();

      expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /olvidaste tu contraseña|recuperar contraseña/i })).not.toBeInTheDocument();
    });

    it('renderiza exclusivamente el botón "Continuar con Google" de ancho completo con diana accesible >= 48px', () => {
      renderWithAuth();

      const googleBtn = screen.getByRole('button', { name: /continuar con google/i });
      expect(googleBtn).toBeInTheDocument();
      expect(googleBtn.className).toContain('w-full');
      expect(googleBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });

    it('no genera desbordamiento horizontal en viewports de 320px', () => {
      const { container } = renderWithAuth();

      const horizontalScrollers = container.querySelectorAll('.overflow-x-auto');
      expect(horizontalScrollers.length).toBe(0);

      const multiCols = container.querySelectorAll('.grid-cols-2');
      expect(multiCols.length).toBe(0);
    });
  });
});
