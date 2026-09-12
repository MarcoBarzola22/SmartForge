import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setAuthToken, getAuthToken } from '../api';
import type { AthleteProfile } from '../api';

export interface AuthContextType {
  user: AthleteProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: () => void;
  loginWithToken: (token: string, isProfileComplete?: boolean) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AthleteProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setTokenState(null);
      setUser(null);
      setIsProfileComplete(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setAuthToken(currentToken);
      setTokenState(currentToken);

      const profile = await apiClient.auth.getMe();
      setUser(profile);
      setIsProfileComplete(true);
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'PROFILE_NOT_FOUND') {
        // Token exists but user profile is not completed yet
        setUser(null);
        setIsProfileComplete(false);
      } else {
        // Token invalid or expired
        setAuthToken(null);
        setTokenState(null);
        setUser(null);
        setIsProfileComplete(false);
        setError(err?.message || 'Sesión expirada o inválida');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const loginWithGoogle = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBase =
        (typeof import.meta !== 'undefined' &&
          (import.meta as any).env?.VITE_API_BASE_URL) ||
        '/api';
      window.location.href = `${apiBase}/auth/google`;
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Error al iniciar sesión con Google');
    }
  }, []);

  const loginWithToken = useCallback(
    async (newToken: string, profileCompleteFlag?: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        setAuthToken(newToken);
        setTokenState(newToken);

        if (profileCompleteFlag === false) {
          setUser(null);
          setIsProfileComplete(false);
        } else {
          try {
            const profile = await apiClient.auth.getMe();
            setUser(profile);
            setIsProfileComplete(true);
          } catch (err: any) {
            if (err?.status === 404) {
              setUser(null);
              setIsProfileComplete(false);
            } else {
              throw err;
            }
          }
        }
      } catch (err: any) {
        setAuthToken(null);
        setTokenState(null);
        setUser(null);
        setIsProfileComplete(false);
        setError(err?.message || 'Error al autenticar token');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    setIsProfileComplete(false);
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isProfileComplete,
    isLoading,
    error,
    loginWithGoogle,
    loginWithToken,
    logout,
    restoreSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
