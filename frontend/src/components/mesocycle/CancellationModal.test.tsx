import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancellationModal } from './CancellationModal';

describe('TASK-35: CancellationModal.tsx — Destructive Confirmation & Offline Support (RF-07, Constitución Art. 2, Art. 6)', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  const mockOnCancelSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ergonomía Mobile-First ≤ 390px y botones táctiles (Constitución Art. 2)', () => {
    it('should render inside a mobile-first dialog container with max-w-[390px]', () => {
      const { container } = render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const dialogEl = container.querySelector('[data-testid="cancellation-modal"]');
      expect(dialogEl).toBeInTheDocument();
      expect(dialogEl?.className).toMatch(/max-w-\[390px\]/);
    });

    it('should ensure destructive action and cancel buttons have touch target height >= 48px', () => {
      const { container } = render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      buttons.forEach((btn) => {
        const classNames = btn.className;
        const hasTouchTarget =
          classNames.includes('touch-target') ||
          classNames.includes('min-h-[48px]') ||
          classNames.includes('h-12');
        expect(hasTouchTarget).toBe(true);
      });
    });
  });

  describe('Advertencia explícita y preservación de registros (RF-07 CA-07.3, Art. 6)', () => {
    it('should clearly explain future planning cancellation and history retention of completed weights', () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          activeMesocycleName="Mesociclo Fuerza V2"
        />
      );

      // Warning text required by CA-07.3
      const expectedText =
        'Al cancelar el mesociclo actual, se cancelará la planificación de las sesiones futuras restantes. Las sesiones ya completadas y tus pesos levantados quedarán guardados en tu historial.';
      expect(screen.getByText(expectedText)).toBeInTheDocument();

      // Title & mesocycle name
      expect(screen.getByRole('heading', { name: /cancelar mesociclo/i })).toBeInTheDocument();
      expect(screen.getByText('Mesociclo Fuerza V2')).toBeInTheDocument();
    });
  });

  describe('Confirmación destructiva (RF-07 CA-07.2, CA-07.7)', () => {
    it('should trigger onConfirm when clicking the destructive confirmation button', async () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /sí, cancelar mesociclo|confirmar cancelación/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should allow selecting a cancellation reason and pass it to onConfirm', async () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Pick a reason e.g. "Lesión" or "Cambio de horarios"
      const reasonBtn = screen.getByRole('button', { name: /lesión|molestia física/i });
      fireEvent.click(reasonBtn);

      const confirmBtn = screen.getByRole('button', { name: /sí, cancelar mesociclo|confirmar cancelación/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(expect.stringMatching(/lesi[oó]n/i));
      });
    });
  });

  describe('Soporte y aviso offline (RF-07 CA-07.4)', () => {
    it('should display offline notice when isOffline is true or offline mode is detected', () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isOffline={true}
        />
      );

      expect(
        screen.getByText(/cancelado localmente\. se sincronizará con el servidor al recuperar conexión/i)
      ).toBeInTheDocument();
    });

    it('should perform offline local cancellation without throwing error when offline', async () => {
      const offlineConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={offlineConfirm}
          onCancelSuccess={mockOnCancelSuccess}
          isOffline={true}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /sí, cancelar mesociclo|confirmar cancelación/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(offlineConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnCancelSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Estado de carga y deshabilitación durante envío', () => {
    it('should show loading spinner and disable buttons when isCancelling is true', () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isCancelling={true}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /cancelando mesociclo/i });
      expect(confirmBtn).toBeDisabled();

      const keepBtn = screen.getByRole('button', { name: /mantener mesociclo|volver/i });
      expect(keepBtn).toBeDisabled();
    });
  });

  describe('Cierre y descarte sin cancelación', () => {
    it('should invoke onClose and not invoke onConfirm when clicking "Mantener mesociclo"', () => {
      render(
        <CancellationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const keepBtn = screen.getByRole('button', { name: /mantener mesociclo|volver/i });
      fireEvent.click(keepBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should render null when isOpen is false', () => {
      const { container } = render(
        <CancellationModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
