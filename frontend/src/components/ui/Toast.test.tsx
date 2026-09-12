import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastContainer } from './Toast';

describe('T-10: Rediseño de Toast.tsx y ToastContainer sobre la Bottom Bar (RF-17, RF-19, RF-21, CF-09, Constitución R6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('1. Posicionamiento anclado a 12px sobre la barra activa (76px) (RF-17, CF-09)', () => {
    it('Toast o ToastContainer debe incluir bottom-[76px] para no solapar la Bottom Bar', () => {
      render(
        <ToastContainer>
          <Toast message="Sincronización completada" type="success" />
        </ToastContainer>
      );

      const container = screen.getByTestId('toast-container');
      expect(container.className).toMatch(/bottom-\[76px\]/);
    });

    it('Toast individual flotante debe soportar la clase de posicionamiento a 76px de la base', () => {
      render(
        <Toast
          message="Guardado en local"
          isFloating
          data-testid="standalone-toast"
        />
      );

      const toast = screen.getByTestId('standalone-toast');
      expect(toast.className).toMatch(/bottom-\[76px\]/);
    });
  });

  describe('2. Botón de acción/reintento táctil (≥ 48px) (RF-19, RF-21, Constitución R2)', () => {
    it('debe renderizar botón de reintento con altura >= 48px y ejecutar el callback', () => {
      const handleRetry = vi.fn();
      render(
        <Toast
          message="Error de red al sincronizar serie"
          type="error"
          onRetry={handleRetry}
          retryLabel="Reintentar"
        />
      );

      const retryBtn = screen.getByRole('button', { name: /reintentar/i });
      expect(retryBtn).toBeInTheDocument();
      expect(retryBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/);

      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Botón de descarte accesible (RF-08, Constitución R2)', () => {
    it('debe tener diana táctil >= 48px y ejecutar onClose al presionar', () => {
      const handleClose = vi.fn();
      render(
        <Toast
          message="Notificación informativa"
          type="info"
          onClose={handleClose}
        />
      );

      const dismissBtn = screen.getByRole('button', { name: /cerrar notificación/i });
      expect(dismissBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);
      expect(dismissBtn.className).toMatch(/min-w-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);

      fireEvent.click(dismissBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Auto-dismiss configurable (CF-09)', () => {
    it('debe llamar a onClose automáticamente tras expirar la duración especificada', () => {
      const handleClose = vi.fn();
      render(
        <Toast
          message="Guardado automático"
          autoDismiss={true}
          duration={3000}
          onClose={handleClose}
        />
      );

      expect(handleClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
