import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardActionBar } from './KeyboardActionBar';

describe('T-14: KeyboardActionBar.tsx fijada sobre el teclado (RF-03, RF-04, RF-14, CF-04)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/;

  describe('1. Altura exacta de 64px y estructura sin desborde (RF-03, CF-04)', () => {
    it('debe tener altura de 64px (h-16 / h-bar), ancho máximo de 390px y fondo Superficie 1', () => {
      render(
        <KeyboardActionBar
          onSave={vi.fn()}
          onCancel={vi.fn()}
          data-testid="keyboard-action-bar"
        />
      );

      const bar = screen.getByTestId('keyboard-action-bar');
      expect(bar).toBeInTheDocument();
      expect(bar.className).toMatch(/h-16|h-bar|min-h-\[64px\]|h-\[64px\]/);
      expect(bar.className).toMatch(/max-w-\[390px\]|max-w-mobile/);
      expect(bar.className).toMatch(/bg-(surface-1|\[#18181B\])/);
      expect(bar.className).toMatch(/border-t/);
    });

    it('en un contenedor de 320px de ancho no genera desborde horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <KeyboardActionBar
          onSave={vi.fn()}
          onCancel={vi.fn()}
          data-testid="action-bar-320"
        />,
        { container }
      );

      const bar = screen.getByTestId('action-bar-320');
      expect(bar.className).toContain('w-full');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Botones de acción accesibles >= 48px y contraste (RF-04, RF-14, RNF-01)', () => {
    it('debe contener botón secundario y primario con altura mínima >= 48px', () => {
      render(
        <KeyboardActionBar
          primaryLabel="Guardar Cambios"
          secondaryLabel="Cancelar"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /guardar cambios/i });
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });

      expect(saveBtn).toBeInTheDocument();
      expect(cancelBtn).toBeInTheDocument();

      expect(saveBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(cancelBtn.className).toMatch(TOUCH_TARGET_REGEX);

      // Botón primario debe usar estilo de marca
      expect(saveBtn.className).toMatch(/bg-(brand-primary|primary|\[#3B82F6\])/);
    });
  });

  describe('3. Manejo de eventos y estado de carga (RF-14, RF-19)', () => {
    it('debe invocar los callbacks correspondientes al pulsar Guardar y Cancelar', () => {
      const handleSave = vi.fn();
      const handleCancel = vi.fn();

      render(
        <KeyboardActionBar
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(handleCancel).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    it('cuando isSubmitting es true, el botón primario muestra estado de carga y rechaza clicks', () => {
      const handleSave = vi.fn();

      render(
        <KeyboardActionBar
          isSubmitting={true}
          onSave={handleSave}
          onCancel={vi.fn()}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /guardando|guardar/i });
      expect(saveBtn).toBeDisabled();

      fireEvent.click(saveBtn);
      expect(handleSave).not.toHaveBeenCalled();
    });
  });
});
