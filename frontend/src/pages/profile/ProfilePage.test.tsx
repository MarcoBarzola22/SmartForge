import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { apiClient } from '../../api/client';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { AthleteProfile } from '../../api';

describe('TASK-63: ProfilePage Onboarding Form (RF-01, CA-01.2, CA-01.4, CA-01.5)', () => {
  const sampleCreatedProfile: AthleteProfile = {
    id: 'ath-101',
    google_id: 'goog-101',
    email: 'lucas@smartforge.test',
    name: 'Lucas Barzola',
    age: 24,
    weight_kg: 80,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' }
    ],
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-12T00:00:00Z'
  };

  const defaultMockAuth: AuthContextType = {
    user: null,
    token: 'jwt-mock-123',
    isAuthenticated: true,
    isProfileComplete: false,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn()
  };

  const renderWithAuth = (props = {}) => {
    return render(
      <AuthContext.Provider value={defaultMockAuth}>
        <ProfilePage {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render all required onboarding form fields and closed equipment taxonomy (20 items)', () => {
    renderWithAuth();

    expect(screen.getByRole('heading', { level: 1, name: /Crear Perfil/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Edad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Peso corporal \(kg\)/i)).toBeInTheDocument();

    // Selectors for level and goal
    expect(screen.getByText(/Nivel de experiencia/i)).toBeInTheDocument();
    expect(screen.getByText(/Objetivo principal/i)).toBeInTheDocument();
    expect(screen.getByText(/Días disponibles por semana/i)).toBeInTheDocument();

    // Equipment selection list
    expect(screen.getByText(/Equipamiento disponible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Barra olímpica/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mancuernas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sin equipamiento/i })).toBeInTheDocument();

    // Submit button with touch target
    const submitBtn = screen.getByRole('button', { name: /Crear Perfil y Generar Mesociclo/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
  });

  it('should validate and reject ages under 16 years on client-side (RF-01, CA-01.2)', async () => {
    const createSpy = vi.spyOn(apiClient.profile, 'create');
    renderWithAuth();

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: 'Mateo' }
    });
    fireEvent.change(screen.getByLabelText(/Edad/i), {
      target: { value: '15' } // Invalid: age < 16
    });
    fireEvent.change(screen.getByLabelText(/Peso corporal \(kg\)/i), {
      target: { value: '60' }
    });

    const submitBtn = screen.getByRole('button', { name: /Crear Perfil y Generar Mesociclo/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/La edad mínima requerida es 16 años/i)
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should allow toggling multiple equipment items from taxonomy with 48px touch targets', () => {
    renderWithAuth();

    const barbellChip = screen.getByRole('button', { name: /Barra olímpica/i });
    const dumbbellsChip = screen.getByRole('button', { name: /Mancuernas/i });

    expect(barbellChip.className).toMatch(/min-h-\[48px\]|touch-target/);
    expect(dumbbellsChip.className).toMatch(/min-h-\[48px\]|touch-target/);

    // Toggle barbell
    fireEvent.click(barbellChip);
    expect(barbellChip.getAttribute('aria-pressed')).toBe('true');

    // Toggle dumbbells
    fireEvent.click(dumbbellsChip);
    expect(dumbbellsChip.getAttribute('aria-pressed')).toBe('true');

    // Toggle off barbell
    fireEvent.click(barbellChip);
    expect(barbellChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('should submit valid profile data and trigger onProfileCreated callback', async () => {
    const onProfileCreated = vi.fn();
    const createSpy = vi
      .spyOn(apiClient.profile, 'create')
      .mockResolvedValue(sampleCreatedProfile);

    renderWithAuth({ onProfileCreated });

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: 'Lucas Barzola' }
    });
    fireEvent.change(screen.getByLabelText(/Edad/i), {
      target: { value: '24' }
    });
    fireEvent.change(screen.getByLabelText(/Peso corporal \(kg\)/i), {
      target: { value: '80' }
    });

    // Select level: intermedio
    fireEvent.click(screen.getByRole('button', { name: /Intermedio/i }));

    // Select goal: hipertrofia
    fireEvent.click(screen.getByRole('button', { name: /Hipertrofia/i }));

    // Select days: 4
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Select equipment
    fireEvent.click(screen.getByRole('button', { name: /Barra olímpica/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mancuernas/i }));

    const submitBtn = screen.getByRole('button', { name: /Crear Perfil y Generar Mesociclo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Lucas Barzola',
        age: 24,
        weight_kg: 80,
        experience_level: 'intermedio',
        training_goal: 'hipertrofia',
        available_days_per_week: 4,
        equipment_ids: expect.arrayContaining(['barbell', 'dumbbells'])
      });
      expect(onProfileCreated).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error alert when API profile creation fails', async () => {
    vi.spyOn(apiClient.profile, 'create').mockRejectedValue({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Ya existe un perfil registrado para esta cuenta'
    });

    renderWithAuth();

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: 'Lucas Barzola' }
    });
    fireEvent.change(screen.getByLabelText(/Edad/i), {
      target: { value: '24' }
    });
    fireEvent.change(screen.getByLabelText(/Peso corporal \(kg\)/i), {
      target: { value: '80' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Barra olímpica/i }));

    const submitBtn = screen.getByRole('button', { name: /Crear Perfil y Generar Mesociclo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Ya existe un perfil registrado para esta cuenta/i)
      ).toBeInTheDocument();
    });
  });

  describe('T-23: Disposición vertical estricta y navegación secuencial inferior (RF-05, RF-11, RF-14, Constitución R2)', () => {
    const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

    it('organiza todos los inputs y equipamiento en una sola columna vertical sin clases de columnas múltiples colapsantes', () => {
      const { container } = renderWithAuth();

      // Ningún contenedor de inputs o equipamiento debe forzar 2 columnas en mobile
      const multiCols = container.querySelectorAll('.grid-cols-2');
      expect(multiCols.length).toBe(0);

      // Cero clases de scroll horizontal
      const horizontalScrollers = container.querySelectorAll('.overflow-x-auto');
      expect(horizontalScrollers.length).toBe(0);
    });

    it('incluye el botón de navegación secuencial "Siguiente campo" en la mitad inferior con área táctil >= 48px (RF-05)', () => {
      renderWithAuth();

      const nextBtn = screen.getByRole('button', { name: /siguiente campo/i });
      expect(nextBtn).toBeInTheDocument();
      expect(nextBtn.className).toMatch(TOUCH_TARGET_REGEX);

      const submitBtn = screen.getByRole('button', { name: /Crear Perfil y Generar Mesociclo/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });

    it('avanza secuencialmente el foco de los campos al pulsar "Siguiente campo" (RF-05 Thumb-Zone Initializer)', async () => {
      renderWithAuth();

      const nameInput = screen.getByLabelText(/Nombre completo/i);
      const ageInput = screen.getByLabelText(/Edad/i);
      const weightInput = screen.getByLabelText(/Peso corporal \(kg\)/i);

      // Empezamos enfocando el primer campo
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Pulsamos "Siguiente campo" -> debe avanzar a Edad
      fireEvent.click(screen.getByRole('button', { name: /siguiente campo/i }));
      expect(document.activeElement).toBe(ageInput);

      // Esperar más de 50ms para superar el debounce del botón (RF-21)
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Pulsamos "Siguiente campo" -> debe avanzar a Peso corporal
      fireEvent.click(screen.getByRole('button', { name: /siguiente campo/i }));
      expect(document.activeElement).toBe(weightInput);
    });

    it('apila verticalmente las acciones en la mitad inferior para evitar colapsos en 320px (RF-14)', () => {
      const { container } = renderWithAuth();

      const bottomDock = container.querySelector('[data-testid="profile-bottom-actions"]');
      expect(bottomDock).toBeInTheDocument();
      expect(bottomDock?.className).toContain('flex-col');
    });
  });
});

