import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { apiClient, setAuthToken } from '../api';
import type { AthleteProfile } from '../api';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('TASK-62: useAuth Hook & Authentication State (RF-01, CA-01.1)', () => {
  const sampleProfile: AthleteProfile = {
    id: 'ath-123',
    google_id: 'google-sub-456',
    email: 'atleta@smartforge.test',
    name: 'Atleta Prueba',
    age: 26,
    weight_kg: 76,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }],
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-12T00:00:00Z'
  };

  beforeEach(() => {
    localStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with unauthenticated state when no token is in storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isProfileComplete).toBe(false);
  });

  it('should restore authenticated session when valid token and profile exist in storage/API', async () => {
    localStorage.setItem('smartforge_jwt', 'valid-jwt-token');
    vi.spyOn(apiClient.auth, 'getMe').mockResolvedValue(sampleProfile);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(sampleProfile);
    expect(result.current.token).toBe('valid-jwt-token');
    expect(result.current.isProfileComplete).toBe(true);
  });

  it('should set isProfileComplete to false when user has token but no complete profile (first login)', async () => {
    localStorage.setItem('smartforge_jwt', 'new-user-token');
    vi.spyOn(apiClient.auth, 'getMe').mockRejectedValue({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
      message: 'Perfil no encontrado'
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isProfileComplete).toBe(false);
  });

  it('should handle login callback, persist token, and update state', async () => {
    vi.spyOn(apiClient.auth, 'getMe').mockResolvedValue(sampleProfile);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginWithToken('jwt-new-token', true);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('jwt-new-token');
    expect(localStorage.getItem('smartforge_jwt')).toBe('jwt-new-token');
    expect(result.current.user).toEqual(sampleProfile);
  });

  it('should clear token and reset state on logout', async () => {
    localStorage.setItem('smartforge_jwt', 'valid-jwt-token');
    vi.spyOn(apiClient.auth, 'getMe').mockResolvedValue(sampleProfile);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('smartforge_jwt')).toBeNull();
  });
});
