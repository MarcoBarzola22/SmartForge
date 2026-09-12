import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  Slider,
  Toast
} from './index';

describe('TASK-59: Atomic UI Components (RNF-02, Constitución §2)', () => {
  describe('Button Component', () => {
    it('should have a minimum touch target of 48px', () => {
      render(<Button>Registrar Serie</Button>);
      const button = screen.getByRole('button', { name: /Registrar Serie/i });
      expect(button).toBeInTheDocument();
      // Should include min-h-[48px] or touch-target class
      expect(button.className).toMatch(/min-h-\[48px\]|touch-target/);
    });

    it('should render various styles (primary, outline, danger) and handle onClick', () => {
      const handleClick = vi.fn();
      render(
        <Button variant="primary" onClick={handleClick}>
          Guardar
        </Button>
      );
      const button = screen.getByRole('button', { name: /Guardar/i });
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled and not trigger onClick when disabled prop is true', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Inactivo
        </Button>
      );
      const button = screen.getByRole('button', { name: /Inactivo/i });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show loading indicator when isLoading is true', () => {
      render(<Button isLoading>Cargando</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Input Component', () => {
    it('should have a minimum height of 48px for easy mobile typing', () => {
      render(<Input label="Peso (kg)" id="weight" />);
      const input = screen.getByLabelText(/Peso \(kg\)/i);
      expect(input).toBeInTheDocument();
      expect(input.className).toMatch(/min-h-\[48px\]/);
    });

    it('should show error message and have aria-invalid when error is provided', () => {
      render(
        <Input
          label="Repeticiones"
          id="reps"
          error="El número de repeticiones es inválido"
        />
      );
      const input = screen.getByLabelText(/Repeticiones/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(
        screen.getByText(/El número de repeticiones es inválido/i)
      ).toBeInTheDocument();
    });

    it('should handle value changes correctly', () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="RIR"
          id="rir"
          type="number"
          onChange={handleChange}
        />
      );
      const input = screen.getByLabelText(/RIR/i);
      fireEvent.change(input, { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Card Component', () => {
    it('should render children within a dark styled card container', () => {
      render(
        <Card title="Press de Banca">
          <p>4 series x 8-10 reps</p>
        </Card>
      );
      expect(screen.getByText('Press de Banca')).toBeInTheDocument();
      expect(screen.getByText('4 series x 8-10 reps')).toBeInTheDocument();
    });

    it('should be clickable with min-h-[48px] when onClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="interactive-card">
          <span>Tarjeta Clickeable</span>
        </Card>
      );
      const card = screen.getByTestId('interactive-card');
      expect(card.className).toMatch(/min-h-\[48px\]|cursor-pointer/);
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge Component', () => {
    it('should render different variants with appropriate styling', () => {
      const { rerender } = render(<Badge variant="success">Completado</Badge>);
      expect(screen.getByText('Completado')).toBeInTheDocument();

      rerender(<Badge variant="danger">Dolor Severo</Badge>);
      expect(screen.getByText('Dolor Severo')).toBeInTheDocument();

      rerender(<Badge variant="amber">Sobrecarga +2.5kg</Badge>);
      expect(screen.getByText('Sobrecarga +2.5kg')).toBeInTheDocument();
    });
  });

  describe('Modal Component', () => {
    it('should render dialog when isOpen is true with touch target close button ≥ 48px', () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Sustituir Ejercicio"
        >
          <p>Selecciona una variante para hombro</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sustituir Ejercicio')).toBeInTheDocument();
      expect(
        screen.getByText('Selecciona una variante para hombro')
      ).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /Cerrar/i });
      expect(closeButton.className).toMatch(/min-h-\[48px\]|min-w-\[48px\]|touch-target/);

      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not render anything when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Oculto">
          <p>No visible</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Slider Component', () => {
    it('should render a slider for RIR or fatigue with touch target ≥ 48px', () => {
      const handleChange = vi.fn();
      render(
        <Slider
          label="Nivel de Fatiga (1-5)"
          min={1}
          max={5}
          step={1}
          value={3}
          onChange={handleChange}
        />
      );

      expect(screen.getByText(/Nivel de Fatiga/i)).toBeInTheDocument();
      const sliderInput = screen.getByRole('slider');
      expect(sliderInput).toBeInTheDocument();
      expect(sliderInput).toHaveAttribute('aria-valuenow', '3');
      expect(sliderInput.className).toMatch(/min-h-\[48px\]|touch-target/);
    });
  });

  describe('Toast Component', () => {
    it('should render notification message with touch-friendly dismiss button ≥ 48px', () => {
      const handleDismiss = vi.fn();
      render(
        <Toast
          message="Serie 1 registrada exitosamente"
          type="success"
          onClose={handleDismiss}
        />
      );

      expect(
        screen.getByText('Serie 1 registrada exitosamente')
      ).toBeInTheDocument();
      const dismissBtn = screen.getByRole('button', { name: /Cerrar notificación/i });
      expect(dismissBtn.className).toMatch(/min-h-\[48px\]|min-w-\[48px\]|touch-target/);

      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
