import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { apiClient } from '../../api/client';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { AthleteProfile } from '../../api';

describe('TASK-64: Profile Editing Flow & Goal Change Confirmation (RF-01, CA-01.5)', () => {
  const existingAthlete: AthleteProfile = {
    id: 'ath-202',
    google_id: 'goog-202',
    email: 'atleta@smartforge.test',
    name: 'Carlos Ruiz',
    age: 28,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' },
      { id: 'flat_bench', name: 'Banco plano', category: 'benches' }
    ],
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z'
  };

  const updatedAthleteProfile: AthleteProfile = {
    ...existingAthlete,
    training_goal: 'fuerza',
    weight_kg: 80,
    available_days_per_week: 5,
    updated_at: '2026-09-12T12:00:00Z'
  };

  const mockAuthContext: AuthContextType = {
    user: existingAthlete,
    token: 'jwt-athlete-valid',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn().mockResolvedValue(undefined)
  };

  const renderEditProfile = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfilePage initialProfile={existingAthlete} mode="edit" {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should prefill existing profile values and show next-mesocycle notice for equipment/days (CA-01.5)', () => {
    renderEditProfile();

    expect(screen.getByRole('heading', { level: 1, name: /Editar Perfil/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toHaveValue('Carlos Ruiz');
    expect(screen.getByLabelText(/Peso corporal \(kg\)/i)).toHaveValue(78.5);

    // Notice about equipment and days taking effect in next mesocycle
    expect(
      screen.getByText(/Los cambios de equipamiento y días disponibles se aplican a partir del siguiente mesociclo/i)
    ).toBeInTheDocument();

    // Verify equipment selection is pre-filled
    const barbellBtn = screen.getByRole('button', { name: /Barra olímpica/i });
    const dumbbellsBtn = screen.getByRole('button', { name: /Mancuernas/i });
    const flatBenchBtn = screen.getByRole('button', { name: /Banco plano/i });
    expect(barbellBtn.getAttribute('aria-pressed')).toBe('true');
    expect(dumbbellsBtn.getAttribute('aria-pressed')).toBe('true');
    expect(flatBenchBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should save profile directly without modal when training goal is unchanged', async () => {
    const onProfileUpdated = vi.fn();
    const updateSpy = vi
      .spyOn(apiClient.profile, 'update')
      .mockResolvedValue(updatedAthleteProfile);

    renderEditProfile({ onProfileUpdated });

    // Change weight only (goal remains 'hipertrofia')
    fireEvent.change(screen.getByLabelText(/Peso corporal \(kg\)/i), {
      target: { value: '80' }
    });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: 'Carlos Ruiz',
        weight_kg: 80,
        experience_level: 'intermedio',
        training_goal: 'hipertrofia',
        available_days_per_week: 4,
        equipment_ids: expect.arrayContaining(['barbell', 'dumbbells', 'flat_bench'])
      });
      expect(screen.queryByText(/Confirmar cambio de objetivo/i)).not.toBeInTheDocument();
      expect(onProfileUpdated).toHaveBeenCalledTimes(1);
    });
  });

  it('should show confirmation modal alerting about mesocycle archiving when goal is changed (CA-01.5)', async () => {
    const updateSpy = vi.spyOn(apiClient.profile, 'update');
    renderEditProfile();

    // Change goal to 'fuerza'
    fireEvent.click(screen.getByRole('button', { name: /Fuerza/i }));

    // Click save
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    // Expect modal to appear with warning
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Confirmar cambio de objetivo/i)).toBeInTheDocument();
    expect(
      screen.getByText(/archivará el mesociclo activo y generará un nuevo mesociclo/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El historial de cargas y sobrecarga progresiva se preservará/i)
    ).toBeInTheDocument();

    // API should not have been called yet
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should dismiss modal and NOT update profile when user cancels goal change confirmation', async () => {
    const updateSpy = vi.spyOn(apiClient.profile, 'update');
    renderEditProfile();

    // Change goal to 'fuerza'
    fireEvent.click(screen.getByRole('button', { name: /Fuerza/i }));

    // Click save to trigger modal
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click cancel in modal
    const cancelModalBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelModalBtn);

    // Modal is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should perform profile update when user confirms goal change in modal', async () => {
    const onProfileUpdated = vi.fn();
    const updateSpy = vi
      .spyOn(apiClient.profile, 'update')
      .mockResolvedValue(updatedAthleteProfile);

    renderEditProfile({ onProfileUpdated });

    // Change goal to 'fuerza' and days to 5
    fireEvent.click(screen.getByRole('button', { name: /Fuerza/i }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    // Click save to open modal
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click confirm in modal
    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Guardar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: 'Carlos Ruiz',
        weight_kg: 78.5,
        experience_level: 'intermedio',
        training_goal: 'fuerza',
        available_days_per_week: 5,
        equipment_ids: expect.arrayContaining(['barbell', 'dumbbells', 'flat_bench'])
      });
      expect(onProfileUpdated).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error toast when profile update API returns error', async () => {
    vi.spyOn(apiClient.profile, 'update').mockRejectedValue({
      status: 500,
      code: 'SERVER_ERROR',
      message: 'No se pudo actualizar el perfil en este momento'
    });

    renderEditProfile();

    // Click save directly (no goal change)
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo actualizar el perfil en este momento/i)
      ).toBeInTheDocument();
    });
  });
});
