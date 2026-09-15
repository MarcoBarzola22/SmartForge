import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';
import { AuthContext, AuthContextType } from './context/AuthContext';

describe('TASK-60: App Component Bottom Navigation Integration (RNF-01, Constitución §2)', () => {
  const mockAuth: AuthContextType = {
    user: {
      id: 'u1',
      google_id: 'google-sub-1',
      email: 'test@example.com',
      name: 'Test Athlete',
      age: 25,
      weight_kg: 75,
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      available_days_per_week: 4,
      equipment: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    },
    token: 'jwt-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn()
  };

  it('should render the app with bottom navigation and allow switching between tabs', () => {
    const { container } = render(
      <AuthContext.Provider value={mockAuth}>
        <App />
      </AuthContext.Provider>
    );

    const mobileContainer = container.querySelector('[data-testid="mobile-container"]');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.className).toContain('max-w-[390px]');

    // Initial tab is Rutina
    expect(screen.getByRole('heading', { name: 'Rutina', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/Mesociclo/i).length).toBeGreaterThan(0);

    // Switch to Catálogo
    const catalogTab = screen.getByRole('tab', { name: /Catálogo/i });
    fireEvent.click(catalogTab);
    expect(screen.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Catálogo de Ejercicios/i)).toBeInTheDocument();

    // Switch to Perfil
    const profileTab = screen.getByRole('tab', { name: /Perfil/i });
    fireEvent.click(profileTab);
    expect(screen.getAllByText(/Perfil/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ajustes de/i).length).toBeGreaterThan(0);

    // Switch to Sesión
    const sessionTab = screen.getByRole('tab', { name: /Sesión/i });
    fireEvent.click(sessionTab);
    expect(screen.getAllByText(/Sesión/i).length).toBeGreaterThan(0);
  });
});
