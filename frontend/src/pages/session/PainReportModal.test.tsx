import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PainReportModal } from './PainReportModal';
import type { CreatePainReportRequest } from '../../api';

describe('TASK-71: PainReportModal - Post-Exercise Joint Discomfort Report (RF-06, CA-06.1, CA-06.2)', () => {
  const mockExercise = {
    id: 'ex-bench',
    name: 'Press de Banca Plano con Barra'
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    exerciseId: mockExercise.id,
    exerciseName: mockExercise.name,
    onSubmit: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render modal with exercise name, joint selection, body side and intensity options (CA-06.2)', () => {
    render(<PainReportModal {...defaultProps} />);

    expect(screen.getByRole('heading', { level: 2, name: /Reportar Molestia Articular/i })).toBeInTheDocument();
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument();

    // Check joints taxonomy
    expect(screen.getByRole('button', { name: /Hombro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Codo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Muñeca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Columna lumbar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rodilla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tobillo/i })).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByRole('button', { name: /Omitir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Reporte/i })).toBeInTheDocument();
  });

  it('should allow selecting joint, side, intensity and notes, then submit formatted payload (CA-06.2, CA-06.3)', async () => {
    const submitSpy = vi.fn();
    render(<PainReportModal {...defaultProps} onSubmit={submitSpy} />);

    // Select joint: Hombro
    const hombroBtn = screen.getByRole('button', { name: /Hombro/i });
    fireEvent.click(hombroBtn);

    // Select side: Derecha
    const derechaBtn = screen.getByRole('button', { name: /Derecha/i });
    fireEvent.click(derechaBtn);

    // Select intensity: Moderada
    const moderadaBtn = screen.getByRole('button', { name: /Moderada/i });
    fireEvent.click(moderadaBtn);

    // Optional notes
    const notesInput = screen.getByPlaceholderText(/Detalles adicionales de la molestia/i);
    fireEvent.change(notesInput, { target: { value: 'Pinchazo en la parte anterior al descender la barra' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Guardar Reporte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith({
        exercise_id: 'ex-bench',
        joint: 'hombro',
        side: 'derecha',
        intensity: 'moderada',
        notes: 'Pinchazo en la parte anterior al descender la barra'
      } as CreatePainReportRequest);
    });
  });

  it('should allow skipping without reporting pain (CA-06.1)', () => {
    const closeSpy = vi.fn();
    const submitSpy = vi.fn();

    render(<PainReportModal {...defaultProps} onClose={closeSpy} onSubmit={submitSpy} />);

    const skipBtn = screen.getByRole('button', { name: /Omitir/i });
    fireEvent.click(skipBtn);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should automatically set side to bilateral and hide unilateral options for columna_lumbar', () => {
    render(<PainReportModal {...defaultProps} />);

    const lumbarBtn = screen.getByRole('button', { name: /Columna lumbar/i });
    fireEvent.click(lumbarBtn);

    // Should indicate bilateral only
    expect(screen.getByText(/Zona axial \(Bilateral\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Izquierda$/i })).not.toBeInTheDocument();
  });

  it('should disable submit button when no joint is selected', () => {
    render(<PainReportModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Guardar Reporte/i });
    expect(submitBtn).toBeDisabled();
  });
});
