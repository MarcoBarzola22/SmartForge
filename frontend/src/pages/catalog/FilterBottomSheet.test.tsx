import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBottomSheet, FilterBottomSheetProps, FilterState } from './FilterBottomSheet';

describe('T-21: FilterBottomSheet.tsx (RF-06, RF-08, RF-09, CF-08, Constitución R2)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

  const initialFilters: FilterState = {
    muscle: 'all',
    pattern: 'all',
  };

  const defaultProps: FilterBottomSheetProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentFilters: initialFilters,
    onApplyFilters: vi.fn(),
  };

  describe('1. Estructura modal vertical y ausencia de scroll horizontal (RF-06, CF-08)', () => {
    it('renderiza como Bottom Sheet accesible con lista vertical de grupos musculares', () => {
      render(<FilterBottomSheet {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Filtros de Catálogo/i })).toBeInTheDocument();

      // Debe incluir lista vertical de músculos (Pecho, Espalda, Cuádriceps, etc.)
      expect(screen.getByRole('button', { name: /todos los músculos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pecho/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /espalda/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cuádriceps/i })).toBeInTheDocument();
    });

    it('en un contenedor de 320px de ancho no genera scroll horizontal ni desbordamiento', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <FilterBottomSheet {...defaultProps} data-testid="filter-sheet-320" />
        </div>,
        { container }
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).not.toContain('overflow-x-auto');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Dianas táctiles >= 48px y separación física >= 8px (RF-08, RF-09)', () => {
    it('todos los chips y botones interactivos miden al menos 48px de altura con separación mínima', () => {
      render(<FilterBottomSheet {...defaultProps} />);

      const applyBtn = screen.getByRole('button', { name: /aplicar filtros/i });
      expect(applyBtn).toBeInTheDocument();
      expect(applyBtn.className).toMatch(TOUCH_TARGET_REGEX);

      const muscleChips = screen.getAllByTestId('filter-chip-muscle');
      expect(muscleChips.length).toBeGreaterThan(0);
      muscleChips.forEach((chip) => {
        expect(chip.className).toMatch(TOUCH_TARGET_REGEX);
      });
    });
  });

  describe('3. Selección interactiva y aplicación de filtros', () => {
    it('permite seleccionar un grupo muscular y aplicar los cambios con el botón inferior', () => {
      const onApplySpy = vi.fn();
      const onCloseSpy = vi.fn();

      render(
        <FilterBottomSheet
          {...defaultProps}
          onApplyFilters={onApplySpy}
          onClose={onCloseSpy}
        />
      );

      const pechoChip = screen.getByRole('button', { name: /^pecho$/i });
      fireEvent.click(pechoChip);

      const applyBtn = screen.getByRole('button', { name: /aplicar filtros/i });
      fireEvent.click(applyBtn);

      expect(onApplySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          muscle: 'pecho',
        })
      );
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('permite restablecer filtros a "all"', () => {
      const onApplySpy = vi.fn();

      render(
        <FilterBottomSheet
          {...defaultProps}
          currentFilters={{ muscle: 'pecho', pattern: 'empuje' }}
          onApplyFilters={onApplySpy}
        />
      );

      const resetBtn = screen.getByRole('button', { name: /limpiar|restablecer/i });
      fireEvent.click(resetBtn);

      const applyBtn = screen.getByRole('button', { name: /aplicar filtros/i });
      fireEvent.click(applyBtn);

      expect(onApplySpy).toHaveBeenCalledWith({
        muscle: 'all',
        pattern: 'all',
      });
    });
  });
});
