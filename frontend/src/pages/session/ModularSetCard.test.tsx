import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModularSetCard, ModularSetCardProps } from './ModularSetCard';

describe('T-17: ModularSetCard.tsx con disposición modular para 320px (RF-08, RF-09, RF-12, RF-13, CF-07)', () => {
  const defaultProps: ModularSetCardProps = {
    setNumber: 2,
    totalSets: 4,
    previousHistory: '80 kg × 8 reps @ RIR 2 (hace 3 días)',
    weightKg: 80,
    reps: 8,
    rir: 2,
    onWeightChange: vi.fn(),
    onRepsChange: vi.fn(),
    onRirChange: vi.fn(),
    onCompleteSet: vi.fn(),
  };

  describe('1. Estructura modular en bloques verticales para 320px (RF-12, CF-07)', () => {
    it('renderiza Fila 1 (N° set + historial previo), Fila 2 (Peso), Fila 3 (Reps) y Fila 4 (RPE + Checkmark)', () => {
      render(<ModularSetCard {...defaultProps} />);

      // Fila 1: Cabecera
      expect(screen.getByRole('heading', { name: /Serie 2/i })).toBeInTheDocument();
      expect(screen.getByText(/80 kg × 8 reps @ RIR 2/i)).toBeInTheDocument();

      // Fila 2: Peso
      expect(screen.getByLabelText(/carga de peso/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disminuir peso/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aumentar peso/i })).toBeInTheDocument();

      // Fila 3: Reps
      expect(screen.getByLabelText(/cantidad de repeticiones/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disminuir repeticiones/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aumentar repeticiones/i })).toBeInTheDocument();

      // Fila 4: RIR + Checkmark
      expect(screen.getByRole('button', { name: /completar serie/i })).toBeInTheDocument();
    });

    it('en un contenedor de 320px de ancho no genera desbordamiento y aplica w-full', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <ModularSetCard {...defaultProps} data-testid="modular-card-320" />
        </div>,
        { container }
      );

      const card = screen.getByTestId('modular-card-320');
      expect(card.className).toContain('w-full');

      unmount();
      document.body.removeChild(container);
    });

    it('si el historial es largo, trunca y permite abrir modal informativo con un tap', () => {
      render(
        <ModularSetCard
          {...defaultProps}
          previousHistory="Historial previo extremadamente largo con sobrecarga progresiva y comentarios técnicos de biomecánica"
        />
      );

      const historyTrigger = screen.getByTestId('history-trigger');
      expect(historyTrigger).toBeInTheDocument();
      expect(historyTrigger.className).toContain('truncate');

      // Click abre modal informativo
      fireEvent.click(historyTrigger);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Historial previo extremadamente largo/i);
    });
  });

  describe('2. Steppers y botones de acción accesibles >= 48px con shrink-0 (RF-08, RF-12)', () => {
    it('todos los steppers de incremento y decremento tienen shrink-0 y miden al menos 48×48px', () => {
      render(<ModularSetCard {...defaultProps} />);

      const decWeight = screen.getByRole('button', { name: /disminuir peso/i });
      const incWeight = screen.getByRole('button', { name: /aumentar peso/i });
      const decReps = screen.getByRole('button', { name: /disminuir repeticiones/i });
      const incReps = screen.getByRole('button', { name: /aumentar repeticiones/i });

      const steppers = [decWeight, incWeight, decReps, incReps];

      steppers.forEach((stepper) => {
        expect(stepper.className).toMatch(/shrink-0|flex-shrink-0/);
        expect(stepper.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/);
        expect(stepper.className).toMatch(/w-12|min-w-\[(4[8-9]|[5-9][0-9])px\]/);
      });
    });

    it('el botón checkmark de completado mide al menos 48×48px con shrink-0', () => {
      render(<ModularSetCard {...defaultProps} />);

      const checkBtn = screen.getByRole('button', { name: /completar serie/i });
      expect(checkBtn.className).toMatch(/shrink-0|flex-shrink-0/);
      expect(checkBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/);
    });
  });

  describe('3. Normalización decimal e interactividad (RF-13, RF-21)', () => {
    it('los steppers llaman a onWeightChange y onRepsChange con deltas correctos', () => {
      const handleWeightChange = vi.fn();
      const handleRepsChange = vi.fn();

      render(
        <ModularSetCard
          {...defaultProps}
          onWeightChange={handleWeightChange}
          onRepsChange={handleRepsChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /aumentar peso/i }));
      expect(handleWeightChange).toHaveBeenCalledWith(81); // 80 + 1

      fireEvent.click(screen.getByRole('button', { name: /disminuir peso/i }));
      expect(handleWeightChange).toHaveBeenCalledWith(79); // 80 - 1

      fireEvent.click(screen.getByRole('button', { name: /aumentar repeticiones/i }));
      expect(handleRepsChange).toHaveBeenCalledWith(9); // 8 + 1

      fireEvent.click(screen.getByRole('button', { name: /disminuir repeticiones/i }));
      expect(handleRepsChange).toHaveBeenCalledWith(7); // 8 - 1
    });

    it('el input de peso normaliza coma a punto automáticamente y llama a onWeightChange', () => {
      const handleWeightChange = vi.fn();

      render(
        <ModularSetCard
          {...defaultProps}
          onWeightChange={handleWeightChange}
        />
      );

      const weightInput = screen.getByLabelText(/carga de peso/i);
      fireEvent.change(weightInput, { target: { value: '82,5' } });

      expect(handleWeightChange).toHaveBeenCalledWith(82.5);
    });

    it('al pulsar el botón de checkmark se llama a onCompleteSet con debounce para evitar doble envío', () => {
      const handleComplete = vi.fn();

      render(
        <ModularSetCard
          {...defaultProps}
          onCompleteSet={handleComplete}
        />
      );

      const checkBtn = screen.getByRole('button', { name: /completar serie/i });
      fireEvent.click(checkBtn);
      fireEvent.click(checkBtn);

      expect(handleComplete).toHaveBeenCalledTimes(1);
    });
  });
});
