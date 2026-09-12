import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('T-06: Rediseño y tests de normalización decimal en Input.tsx (RF-08, RF-13, RF-23, RNF-02, RNF-03, CF-10)', () => {
  describe('1. Dimensiones mínimas táctiles y accesibilidad (RF-08, Constitución R2)', () => {
    it('debe tener una altura mínima de al menos 48px para facilitar el toque móvil', () => {
      render(<Input label="Peso" id="weight" />);
      const input = screen.getByLabelText('Peso');
      expect(input.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|min-h-touch/);
    });

    it('debe aplicar los tokens cromáticos de Superficie 2 (#27272A), borde #52525B y anillo #60A5FA', () => {
      render(<Input label="Reps" id="reps" />);
      const input = screen.getByLabelText('Reps');

      expect(input.className).toMatch(/bg-(surface-2|\[#27272A\])/);
      expect(input.className).toMatch(/border-(border-interactive|interactive|\[#52525B\])/);
      expect(input.className).toMatch(/ring-(brand-focus|focus|\[#60A5FA\])/);
    });
  });

  describe('2. Soporte para etiqueta externa de unidad (RF-13)', () => {
    it('debe renderizar la unidad externa ("kg", "reps") en el componente', () => {
      render(<Input label="Carga" id="load" unit="kg" />);
      expect(screen.getByText('kg')).toBeInTheDocument();
    });
  });

  describe('3. Normalización automática de coma a punto decimal (RF-23)', () => {
    it('debe normalizar automáticamente la coma a punto decimal en tiempo real en el evento onChange', () => {
      const handleChange = vi.fn();
      render(<Input label="Peso corporal" id="bodyweight" onChange={handleChange} />);
      const input = screen.getByLabelText('Peso corporal') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '82,5' } });

      expect(handleChange).toHaveBeenCalled();
      const emittedValue = handleChange.mock.calls[0][0].target.value;
      expect(emittedValue).toBe('82.5');
    });

    it('debe mantener números enteros o valores con punto sin alteración indebida', () => {
      const handleChange = vi.fn();
      render(<Input label="Repeticiones" id="reps-input" onChange={handleChange} />);
      const input = screen.getByLabelText('Repeticiones') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '12' } });
      expect(handleChange.mock.calls[0][0].target.value).toBe('12');

      fireEvent.change(input, { target: { value: '85.25' } });
      expect(handleChange.mock.calls[1][0].target.value).toBe('85.25');
    });
  });

  describe('4. Accesibilidad y estados de error (CF-10)', () => {
    it('debe aplicar aria-invalid="true" y mostrar el mensaje de error con token de color accesible', () => {
      render(<Input label="Carga" id="charge" error="Valor inválido" />);
      const input = screen.getByLabelText('Carga');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      const errorMsg = screen.getByText('Valor inválido');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg.className).toMatch(/text-(status-error-text|\[#F87171\]|red-400)/);
    });
  });
});
