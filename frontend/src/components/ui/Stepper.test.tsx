import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Stepper } from './Stepper';

describe('T-07: Primitivo táctil Stepper.tsx (Patrón 3 Columnas Lovable)', () => {
  it('debe renderizar label, valor y unidad correctamente', () => {
    render(<Stepper label="Carga" value={82.5} step={2.5} onChange={() => {}} unit="kg" />);

    expect(screen.getByText('Carga')).toBeInTheDocument();
    expect(screen.getByText('82.5')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('los botones de sumar y restar deben tener área táctil mínima de 48px y clase press', () => {
    render(<Stepper label="Repeticiones" value={5} step={1} onChange={() => {}} unit="reps" />);

    const decBtn = screen.getByRole('button', { name: /Restar Repeticiones/i });
    const incBtn = screen.getByRole('button', { name: /Sumar Repeticiones/i });

    expect(decBtn.className).toMatch(/h-12|min-h-\[48px\]/);
    expect(decBtn.className).toMatch(/w-12|min-w-\[48px\]/);
    expect(decBtn.className).toContain('press');

    expect(incBtn.className).toMatch(/h-12|min-h-\[48px\]/);
    expect(incBtn.className).toMatch(/w-12|min-w-\[48px\]/);
    expect(incBtn.className).toContain('press');
  });

  it('al presionar restar decrementa el valor según step', () => {
    const handleChange = vi.fn();
    render(<Stepper label="Carga" value={80} step={2.5} onChange={handleChange} unit="kg" />);

    const decBtn = screen.getByRole('button', { name: /Restar Carga/i });
    fireEvent.click(decBtn);

    expect(handleChange).toHaveBeenCalledWith(77.5);
  });

  it('al presionar sumar incrementa el valor según step', () => {
    const handleChange = vi.fn();
    render(<Stepper label="Carga" value={80} step={2.5} onChange={handleChange} unit="kg" />);

    const incBtn = screen.getByRole('button', { name: /Sumar Carga/i });
    fireEvent.click(incBtn);

    expect(handleChange).toHaveBeenCalledWith(82.5);
  });

  it('respeta el valor mínimo (min) y deshabilita el botón restar al alcanzarlo', () => {
    const handleChange = vi.fn();
    render(<Stepper label="Carga" value={0} min={0} step={2.5} onChange={handleChange} unit="kg" />);

    const decBtn = screen.getByRole('button', { name: /Restar Carga/i });
    expect(decBtn).toBeDisabled();

    fireEvent.click(decBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('deshabilita ambos controles cuando disabled es true', () => {
    const handleChange = vi.fn();
    render(<Stepper label="Carga" value={50} disabled onChange={handleChange} unit="kg" />);

    const decBtn = screen.getByRole('button', { name: /Restar Carga/i });
    const incBtn = screen.getByRole('button', { name: /Sumar Carga/i });

    expect(decBtn).toBeDisabled();
    expect(incBtn).toBeDisabled();
  });
});
