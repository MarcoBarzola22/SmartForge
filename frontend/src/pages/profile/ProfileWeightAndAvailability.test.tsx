import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { AuthContext, type AuthContextType } from '../../context/AuthContext';
import * as api from '../../api';
import type { AthleteProfile, WeightLogItem } from '../../api';

describe('TASK-38: ProfilePage.tsx — Weight Tracking & Availability Change Warning (RF-01, RF-02, RF-09, Constitución Art. 2)', () => {
  const sampleProfile: AthleteProfile = {
    id: 'ath-301',
    google_id: 'goog-301',
    email: 'atleta@smartforge.test',
    name: 'Carlos Ruiz',
    age: 28,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' }
    ],
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z'
  };

  const sampleWeightLogs: WeightLogItem[] = [
    {
      id: 'log-1',
      athlete_id: 'ath-301',
      weight_kg: 78.5,
      calendar_week_start: '2026-09-07',
      logged_date: '2026-09-10',
      delta_kg: -0.5,
      created_at: '2026-09-10T08:00:00.000Z'
    },
    {
      id: 'log-2',
      athlete_id: 'ath-301',
      weight_kg: 79.0,
      calendar_week_start: '2026-08-31',
      logged_date: '2026-09-03',
      delta_kg: 0,
      created_at: '2026-09-03T08:00:00.000Z'
    }
  ];

  const mockAuthContext: AuthContextType = {
    user: sampleProfile,
    token: 'jwt-mock-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn().mockResolvedValue(undefined)
  };

  const renderProfile = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfilePage initialProfile={sampleProfile} mode="edit" {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchWeightLogs').mockResolvedValue(sampleWeightLogs);
    vi.spyOn(api, 'createWeightLog').mockImplementation(async (data) => ({
      id: 'new-log-id',
      athlete_id: 'ath-301',
      weight_kg: data.weight_kg,
      calendar_week_start: '2026-09-21',
      logged_date: data.logged_date,
      delta_kg: 1.7,
      created_at: new Date().toISOString()
    }));
  });

  describe('Módulo de Peso Corporal e Historial (RF-01, RF-02)', () => {
    it('should display weight tracking controls and button to log new weight', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/control de peso corporal|peso corporal e historial/i)).toBeInTheDocument();
      });

      const newLogBtn = screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i });
      expect(newLogBtn).toBeInTheDocument();
      expect(newLogBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
    });

    it('should open WeightLogModal when clicking "+ Registrar pesaje"', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i }));

      // Modal dialog appears
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /registrar peso/i })).toBeInTheDocument();
    });

    it('should expand and display WeightHistoryList with past logs and deltas', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/2 registros/i)).toBeInTheDocument();
      });

      const toggleHistoryBtn = screen.getByRole('button', { name: /historial de pesajes/i });
      fireEvent.click(toggleHistoryBtn);

      // Past logs should be visible inside weight history list
      await waitFor(() => {
        const historyList = screen.getByTestId('weight-history-list');
        expect(within(historyList).getByText('78.5 kg')).toBeInTheDocument();
        expect(within(historyList).getByText('79.0 kg')).toBeInTheDocument();
        expect(within(historyList).getByText('-0.5 kg')).toBeInTheDocument();
      });
    });

    it('should enforce numeric range validations (< 30.0 kg and > 300.0 kg) in weight modal (RF-01 CA-01.5)', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i }));

      const modal = screen.getByRole('dialog');
      const weightInput = within(modal).getByLabelText(/peso corporal/i);
      const saveBtn = within(modal).getByRole('button', { name: /^registrar pesaje$/i });

      // Test lower boundary < 30.0
      fireEvent.change(weightInput, { target: { value: '25.0' } });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/el peso debe ser al menos 30\.0 kg/i)).toBeInTheDocument();

      // Test upper boundary > 300.0
      fireEvent.change(weightInput, { target: { value: '350.0' } });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/el peso no puede superar los 300\.0 kg/i)).toBeInTheDocument();
    });

    it('should enforce interval guard of at least 5 days (120h) against existing logs (RF-01 CA-01.4)', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i }));

      const modal = screen.getByRole('dialog');
      const weightInput = within(modal).getByLabelText(/peso corporal/i);
      const dateInput = within(modal).getByLabelText(/fecha del pesaje/i);
      const saveBtn = within(modal).getByRole('button', { name: /^registrar pesaje$/i });

      // Enter valid weight but date colliding within 120h (log-1 was 2026-09-10; trying 2026-09-12)
      fireEvent.change(weightInput, { target: { value: '78.2' } });
      fireEvent.change(dateInput, { target: { value: '2026-09-12' } });
      fireEvent.click(saveBtn);

      expect(
        screen.getByText(/intervalo de al menos 5 días entre pesajes|ya existe un pesaje registrado para esta semana/i)
      ).toBeInTheDocument();
    });

    it('should successfully save weight log and update profile weight when valid and non-colliding', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /\+ registrar pesaje|nuevo pesaje/i }));

      const modal = screen.getByRole('dialog');
      // Valid weight and date >= 5 days after 2026-09-10
      const weightInput = within(modal).getByLabelText(/peso corporal/i);
      const dateInput = within(modal).getByLabelText(/fecha del pesaje/i);
      fireEvent.change(weightInput, { target: { value: '80.2' } });
      fireEvent.change(dateInput, { target: { value: '2026-09-21' } });

      const saveBtn = within(modal).getByRole('button', { name: /^registrar pesaje$/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(api.createWeightLog).toHaveBeenCalledWith(
          expect.objectContaining({ weight_kg: 80.2, logged_date: '2026-09-21' })
        );
      });
    });
  });

  describe('Advertencia de cambio de disponibilidad con mesociclo activo (RF-09 CA-09.1)', () => {
    it('should open pedagogical warning modal when attempting to alter days while mesocycle is active', async () => {
      renderProfile({ hasActiveMesocycle: true });

      // Current days is 4. Click day 5
      const day5Btn = screen.getByRole('button', { name: '5' });
      fireEvent.click(day5Btn);

      // Warning modal should pop up
      expect(
        screen.getByRole('heading', { name: /modificación de disponibilidad|cambio de disponibilidad/i })
      ).toBeInTheDocument();

      // CA-09.1 explanation text
      expect(
        screen.getByText(/una rutina en curso no admite modificaciones estructurales globales en sus días o tiempos de entrenamiento/i)
      ).toBeInTheDocument();

      // CTA to cancel active mesocycle
      const cancelMesoBtn = screen.getByRole('button', { name: /cancelar mesociclo/i });
      expect(cancelMesoBtn).toBeInTheDocument();
      expect(cancelMesoBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
    });

    it('should invoke onCancelActiveMesocycle callback when clicking "Cancelar mesociclo actual" in warning modal', async () => {
      const mockOnCancelActiveMesocycle = vi.fn();

      renderProfile({
        hasActiveMesocycle: true,
        onCancelActiveMesocycle: mockOnCancelActiveMesocycle
      });

      // Click day 3
      fireEvent.click(screen.getByRole('button', { name: '3' }));

      // Click cancel mesocycle in modal
      const cancelMesoBtn = screen.getByRole('button', { name: /cancelar mesociclo actual/i });
      fireEvent.click(cancelMesoBtn);

      expect(mockOnCancelActiveMesocycle).toHaveBeenCalledTimes(1);
    });

    it('should dismiss warning modal and keep original days when clicking "Mantener días actuales"', async () => {
      renderProfile({ hasActiveMesocycle: true });

      // Click day 6
      fireEvent.click(screen.getByRole('button', { name: '6' }));

      // Click keep days
      const keepBtn = screen.getByRole('button', { name: /mantener días actuales/i });
      fireEvent.click(keepBtn);

      // Modal closed and day 4 remains active
      expect(
        screen.queryByRole('heading', { name: /modificación de disponibilidad/i })
      ).not.toBeInTheDocument();
    });

    it('should allow directly changing days without warning when hasActiveMesocycle is false', async () => {
      renderProfile({ hasActiveMesocycle: false });

      // Click day 5
      const day5Btn = screen.getByRole('button', { name: '5' });
      fireEvent.click(day5Btn);

      // No warning modal
      expect(
        screen.queryByRole('heading', { name: /modificación de disponibilidad/i })
      ).not.toBeInTheDocument();

      // Day 5 is selected
      expect(day5Btn.className).toContain('bg-brand-primary');
    });
  });

  describe('Constitución Visual & Mobile First (<= 390px, Sin Scroll Horizontal)', () => {
    it('should enforce max-w-[390px], overflow-x-hidden and no multi-column grids', () => {
      const { container } = renderProfile();

      const mobileContainer = container.querySelector('[data-testid="mobile-container"]');
      expect(mobileContainer).toBeInTheDocument();
      expect(mobileContainer?.className).toContain('max-w-[390px]');
      expect(mobileContainer?.className).toContain('overflow-x-hidden');

      // Prohibited multi-column layout on 390px mobile view
      expect(container.querySelectorAll('.grid-cols-2').length).toBe(0);
    });

    it('should guarantee touch target compliance (min-h-[48px] or touch-target) on all interactive buttons', () => {
      const { container } = renderProfile();

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        const hasMinH48 = btn.className.includes('min-h-[48px]');
        const hasTouchTarget = btn.className.includes('touch-target');
        expect(hasMinH48 || hasTouchTarget).toBe(true);
      });
    });
  });
});
