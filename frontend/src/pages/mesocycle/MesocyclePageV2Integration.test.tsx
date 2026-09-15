import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesocyclePage } from './MesocyclePage';
import { AuthContext, type AuthContextType } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { queryClient } from '../../api/query-client';
import type { MesocycleDetail, AthleteProfile } from '../../api';

describe('TASK-39: MesocyclePage — MesocycleWizardV2, Cancellation & Empty State Integration (RF-03, RF-04, RF-05, RF-07, Constitución Art. 2)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-301',
    google_id: 'goog-301',
    email: 'atleta@smartforge.test',
    name: 'Carlos Ruiz',
    age: 26,
    weight_kg: 78,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  };

  const mockAuthContext: AuthContextType = {
    user: mockAthlete,
    token: 'valid-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn()
  };

  const mockActiveMesocycle: MesocycleDetail = {
    id: 'meso-active-1',
    athlete_id: 'ath-301',
    name: 'Mesociclo de Hipertrofia V2',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 4,
    status: 'active',
    start_date: '2026-09-01',
    weeks: [
      {
        id: 'week-1',
        mesocycle_id: 'meso-active-1',
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 'sess-1',
            week_plan_id: 'week-1',
            day_number: 1,
            name: 'Torso Empuje',
            exercise_assignments: [
              {
                id: 'assign-1',
                session_plan_id: 'sess-1',
                exercise_id: 'ex-bench',
                exercise: {
                  id: 'ex-bench',
                  name: 'Press de Banca',
                  movement_pattern: 'empuje',
                  primary_muscle: 'pecho',
                  secondary_muscles: ['triceps'],
                  equipment_id: 'barbell',
                  is_compound: true,
                  initial_load_ratio: 0.8,
                  video_url: 'https://smartforge.test/bench',
                  video_fallback_url: 'https://fallback.test/bench',
                  instructions: 'Empujar con fuerza.',
                  is_active: true
                },
                order_in_session: 1,
                target_sets: 4,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 80,
                is_swapped: false
              }
            ]
          }
        ]
      }
    ]
  };

  const renderComponent = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <MesocyclePage {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('Estado Vacío y Apertura de MesocycleWizardV2 (RF-03, RF-04, RF-05)', () => {
    it('should display EmptyMesocycleState when there is no active mesocycle', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
        status: 404,
        code: 'MESOCYCLE_NOT_FOUND',
        message: 'No active mesocycle'
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /generar nuevo mesociclo/i })).toBeInTheDocument();
      expect(screen.getByText(/no tenés un mesociclo activo/i)).toBeInTheDocument();
    });

    it('should open MesocycleWizardV2 when clicking "Generar nuevo mesociclo" from empty state', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
        status: 404,
        code: 'MESOCYCLE_NOT_FOUND',
        message: 'No active mesocycle'
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
      });

      const generateBtn = screen.getByRole('button', { name: /generar nuevo mesociclo/i });
      fireEvent.click(generateBtn);

      // MesocycleWizardV2 is rendered
      expect(screen.getByTestId('mesocycle-wizard-v2')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /nuevo mesociclo v2/i })).toBeInTheDocument();
      expect(screen.getByText(/tiempo disponible por sesión/i)).toBeInTheDocument();
    });

    it('should allow closing the wizard and returning to EmptyMesocycleState', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
        status: 404,
        code: 'MESOCYCLE_NOT_FOUND',
        message: 'No active mesocycle'
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /generar nuevo mesociclo/i }));
      expect(screen.getByTestId('mesocycle-wizard-v2')).toBeInTheDocument();

      // Click Cancel in wizard
      const cancelWizardBtn = within(screen.getByTestId('mesocycle-wizard-v2')).getByRole('button', {
        name: /cancelar/i
      });
      fireEvent.click(cancelWizardBtn);

      expect(screen.queryByTestId('mesocycle-wizard-v2')).not.toBeInTheDocument();
      expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
    });

    it('should configure parameters in wizard, call API create, and render new mesocycle', async () => {
      const getCurrentSpy = vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
        status: 404,
        code: 'MESOCYCLE_NOT_FOUND',
        message: 'No active mesocycle'
      });

      const createSpy = vi.spyOn(apiClient.mesocycles, 'create').mockImplementation(async () => {
        getCurrentSpy.mockResolvedValue(mockActiveMesocycle);
        return mockActiveMesocycle;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /generar nuevo mesociclo/i }));

      const wizard = screen.getByTestId('mesocycle-wizard-v2');

      // Select 5 days
      const day5Btn = within(wizard).getByRole('button', { name: /5 días/i });
      fireEvent.click(day5Btn);

      // Select 60 min block
      const min60Btn = within(wizard).getByRole('button', { name: '60 min' });
      fireEvent.click(min60Btn);

      // Click "Generar mesociclo" submit CTA
      const submitBtn = within(wizard).getByRole('button', { name: /generar mesociclo/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            availableDays: 5,
            sessionDurationMinutes: 60
          })
        );
      });

      // Wizard closes and active mesocycle is shown
      await waitFor(() => {
        expect(screen.queryByTestId('mesocycle-wizard-v2')).not.toBeInTheDocument();
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });
    });
  });

  describe('Botón de Anulación y Transición Inmediata al Estado Vacío (RF-07)', () => {
    it('should display "Cancelar mesociclo actual" button when a mesocycle is active', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });

      const cancelBtn = screen.getByRole('button', { name: /cancelar mesociclo actual/i });
      expect(cancelBtn).toBeInTheDocument();
      expect(cancelBtn.className).toMatch(/touch-target|min-h-\[48px\]/);
    });

    it('should open CancellationModal when clicking cancel button on active mesocycle', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancelar mesociclo actual/i }));

      // CancellationModal appears
      const modal = screen.getByTestId('cancellation-modal');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByRole('heading', { name: /cancelar mesociclo/i })).toBeInTheDocument();
      expect(within(modal).getByText(/pesos levantados quedarán guardados en tu historial/i)).toBeInTheDocument();
    });

    it('should keep active mesocycle if cancellation modal is closed/dismissed', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancelar mesociclo actual/i }));
      expect(screen.getByTestId('cancellation-modal')).toBeInTheDocument();

      // Click "Mantener mesociclo"
      const keepBtn = screen.getByRole('button', { name: /mantener mesociclo/i });
      fireEvent.click(keepBtn);

      expect(screen.queryByTestId('cancellation-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
    });

    it('should call cancelActive API and transition immediately to EmptyMesocycleState upon confirmation (RF-07 CA-07.8)', async () => {
      const getCurrentSpy = vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);
      const cancelSpy = vi.spyOn(apiClient.mesocycles, 'cancelActive').mockImplementation(async () => {
        getCurrentSpy.mockRejectedValue({ status: 404, code: 'MESOCYCLE_NOT_FOUND', message: 'No active mesocycle' });
        return {
          success: true,
          message: 'Mesociclo cancelado exitosamente'
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /cancelar mesociclo actual/i }));

      const modal = screen.getByTestId('cancellation-modal');

      // Select reason: Molestia física o lesión
      const reasonOption = within(modal).getByText(/molestia física o lesión/i);
      fireEvent.click(reasonOption);

      // Click confirm cancellation button
      const confirmBtn = within(modal).getByRole('button', { name: /sí, cancelar mesociclo/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(cancelSpy).toHaveBeenCalledWith('lesion');
      });

      // Immediately transitions to EmptyMesocycleState
      await waitFor(() => {
        expect(screen.queryByTestId('cancellation-modal')).not.toBeInTheDocument();
        expect(screen.queryByText('Mesociclo de Hipertrofia V2')).not.toBeInTheDocument();
        expect(screen.getByTestId('empty-mesocycle-state')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /generar nuevo mesociclo/i })).toBeInTheDocument();
      });
    });
  });

  describe('Constitución Visual & Mobile-First (<= 390px, Sin Scroll Horizontal)', () => {
    it('should enforce max-w-[390px], overflow-x-hidden and zero multi-column grids in active and empty states', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);

      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('mesocycle-container')).toBeInTheDocument();
      });

      const mainContainer = screen.getByTestId('mesocycle-container');
      expect(mainContainer.className).toContain('max-w-[390px]');
      expect(mainContainer.className).toContain('overflow-x-hidden');
      expect(container.querySelectorAll('.grid-cols-2').length).toBe(0);
    });

    it('should ensure all interactive buttons meet touch-target standards (min-h-[48px] or touch-target)', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockActiveMesocycle);

      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      });

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        const hasMinH = btn.className.includes('min-h-[48px]') || btn.className.includes('h-12');
        const hasTouchTarget = btn.className.includes('touch-target');
        expect(hasMinH || hasTouchTarget).toBe(true);
      });
    });
  });
});
