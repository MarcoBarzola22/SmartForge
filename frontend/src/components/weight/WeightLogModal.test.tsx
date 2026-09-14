import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeightLogModal } from './WeightLogModal';
import type { WeightLogItem } from '../../api/generated/types';

describe('TASK-32: WeightLogModal.tsx — Mobile-First Weight Logging & Editing (RF-01, RF-02, Art. 2, Art. 6)', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const sampleLog: WeightLogItem = {
    id: 'log-past-001',
    athlete_id: 'ath-1',
    weight_kg: 75.5,
    calendar_week_start: '2026-09-07',
    logged_date: '2026-09-09',
    delta_kg: -0.5,
    created_at: '2026-09-09T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile-First Layout and 390px Viewport Ergonomics (Constitución Art. 2)', () => {
    it('should not render anything when isOpen is false', () => {
      render(
        <WeightLogModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should render dialog anchored to bottom for one-handed operation in <= 390px', () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Ensure container respects 390px width and bottom alignment for thumb access
      const sheet = dialog.querySelector('.max-w-\\[390px\\]');
      expect(sheet).toBeInTheDocument();
    });

    it('all interactive buttons must satisfy height >= 48px touch target requirement (Art. 2)', () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      const closeBtn = screen.getByRole('button', { name: /cerrar/i });

      // All buttons must have touch-target class or min-h-[48px]
      expect(saveBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
      expect(cancelBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
      expect(closeBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
    });
  });

  describe('Numerical Range Validation (RF-01 CA-01.5)', () => {
    it('should show error when weight is less than 30.0 kg and block submission', async () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const input = screen.getByPlaceholderText('75.0');
      fireEvent.change(input, { target: { value: '25.0' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByText(/al menos 30\.0 kg/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when weight exceeds 300.0 kg and block submission', async () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const input = screen.getByPlaceholderText('75.0');
      fireEvent.change(input, { target: { value: '310.5' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByText(/no puede superar los 300\.0 kg/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept decimal separator comma and normalize it to dot (e.g. 78,4 -> 78.4)', async () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const input = screen.getByPlaceholderText('75.0');
      fireEvent.change(input, { target: { value: '78,4' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            weight_kg: 78.4
          })
        );
      });
    });
  });

  describe('Contextual Warning in Edit Mode (RF-02 CA-02.3)', () => {
    it('should NOT show historical warning when creating a new weight log', () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(
        screen.queryByText(/modificar datos históricos puede alterar/i)
      ).toBeNull();
      expect(screen.getByText(/registrar peso corporal/i)).toBeInTheDocument();
    });

    it('should SHOW the contextual warning and pre-populate values when editing an existing log (RF-02 CA-02.3)', () => {
      render(
        <WeightLogModal
          isOpen={true}
          initialLog={sampleLog}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Warning required by RF-02 CA-02.3
      expect(
        screen.getByText(/modificar datos históricos puede alterar la consistencia de tu gráfica de progreso/i)
      ).toBeInTheDocument();

      // Title in edit mode
      expect(screen.getByText(/editar peso corporal/i)).toBeInTheDocument();

      // Pre-filled values
      const weightInput = screen.getByPlaceholderText('75.0') as HTMLInputElement;
      expect(weightInput.value).toBe('75.5');

      const dateInput = screen.getByLabelText(/fecha/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-09-09');
    });
  });

  describe('Week Collision and 120-hour Guard Notifications (RF-01 CA-01.4)', () => {
    it('should warn when creating a log for a calendar week that already has a record', async () => {
      const existingLogs: WeightLogItem[] = [sampleLog]; // Week start: 2026-09-07

      render(
        <WeightLogModal
          isOpen={true}
          existingLogs={existingLogs}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const dateInput = screen.getByLabelText(/fecha/i);
      // Select date in same week (2026-09-10)
      fireEvent.change(dateInput, { target: { value: '2026-09-10' } });

      const weightInput = screen.getByPlaceholderText('75.0');
      fireEvent.change(weightInput, { target: { value: '75.0' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      expect(
        await screen.findByText(/ya existe un pesaje registrado para esta semana/i)
      ).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should warn when new week date is closer than 120 hours (< 5 days) from previous log (RF-01 CA-01.4)', async () => {
      // Previous log on Sunday 2026-09-13
      const existingLogs: WeightLogItem[] = [
        {
          ...sampleLog,
          id: 'log-prev',
          logged_date: '2026-09-13',
          calendar_week_start: '2026-09-07'
        }
      ];

      render(
        <WeightLogModal
          isOpen={true}
          existingLogs={existingLogs}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const dateInput = screen.getByLabelText(/fecha/i);
      // Next week, Tuesday 2026-09-15: only 48 hours later (< 120h)
      fireEvent.change(dateInput, { target: { value: '2026-09-15' } });

      const weightInput = screen.getByPlaceholderText('75.0');
      fireEvent.change(weightInput, { target: { value: '74.8' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      expect(
        await screen.findByText(/intervalo de al menos 5 días entre pesajes/i)
      ).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission, Cancellation and Error Handling', () => {
    it('should call onSave with normalized values on valid submission', async () => {
      mockOnSave.mockResolvedValueOnce(undefined);

      render(
        <WeightLogModal
          isOpen={true}
          initialDate="2026-09-20"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const weightInput = screen.getByPlaceholderText('75.0');
      fireEvent.change(weightInput, { target: { value: '76.2' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          weight_kg: 76.2,
          logged_date: '2026-09-20'
        });
      });
    });

    it('should call onClose when clicking the Cancelar button', () => {
      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display server error message if onSave rejects', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Fallo de conexión en servidor'));

      render(
        <WeightLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const weightInput = screen.getByPlaceholderText('75.0');
      fireEvent.change(weightInput, { target: { value: '76.2' } });

      const saveBtn = screen.getByRole('button', { name: /guardar|registrar/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByText(/fallo de conexión en servidor/i)).toBeInTheDocument();
    });
  });
});
