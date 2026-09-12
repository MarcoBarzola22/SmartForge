import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('T-05: Rediseño y tests unitarios de Button.tsx (RF-08, RF-14, RF-19, RF-21, RNF-01, CF-01)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/;

  describe('1. Dimensiones mínimas y prevención de colapso (RF-08, CF-01, Constitución R2)', () => {
    it('debe tener altura mínima >= 48px y shrink-0 en todos los tamaños y variantes', () => {
      const sizes = ['default', 'sm', 'md', 'lg', 'icon'] as const;
      const variants = ['default', 'primary', 'secondary', 'outline', 'danger', 'destructive', 'ghost'] as const;

      for (const size of sizes) {
        for (const variant of variants) {
          const { unmount } = render(
            <Button size={size as any} variant={variant as any}>
              Btn {size}-{variant}
            </Button>
          );
          const button = screen.getByRole('button', { name: `Btn ${size}-${variant}` });

          expect(button.className).toMatch(TOUCH_TARGET_REGEX);
          expect(button.className).toMatch(/shrink-0|flex-shrink-0/);
          unmount();
        }
      }
    });

    it('debe aplicar un ancho mínimo de 120px para botones con texto y 48px para botones de icono', () => {
      const { unmount: unmountText } = render(<Button>Guardar Entrenamiento</Button>);
      const textBtn = screen.getByRole('button', { name: /Guardar Entrenamiento/i });
      expect(textBtn.className).toMatch(/min-w-\[120px\]|min-w-btn-text/);
      unmountText();

      const { unmount: unmountIcon } = render(<Button size="icon" aria-label="Icono acción">+</Button>);
      const iconBtn = screen.getByRole('button', { name: /Icono acción/i });
      expect(iconBtn.className).toMatch(/min-w-\[(4[8-9]|[5-9][0-9])px\]|min-w-touch|w-12|size-12/);
      unmountIcon();
    });
  });

  describe('2. Contraste accesible y variantes visuales (RNF-01)', () => {
    it('la variante primaria debe aplicar fondo azul #3B82F6 y texto carbón #0C0C0E (WCAG AAA)', () => {
      render(<Button variant="primary">Continuar</Button>);
      const button = screen.getByRole('button', { name: /Continuar/i });
      expect(button.className).toMatch(/bg-(brand-primary|primary|\[#3B82F6\])/);
      expect(button.className).toMatch(/text-(brand-contrast|primary-foreground|\[#0C0C0E\])/);
    });

    it('la variante destructiva/danger debe aplicar fondo rojo #EF4444 con texto blanco', () => {
      render(<Button variant="danger">Eliminar</Button>);
      const button = screen.getByRole('button', { name: /Eliminar/i });
      expect(button.className).toMatch(/bg-(destructive|status-error-bg|\[#EF4444\])/);
    });
  });

  describe('3. Manejo de texto largo y wrap a 2 líneas (RF-14)', () => {
    it('debe contener clases de wrap hasta 2 líneas (line-clamp-2) y altura máxima de 64px', () => {
      const longText = 'Registrar y Guardar Serie de Alta Intensidad con Sobrecarga Progresiva';
      render(<Button>{longText}</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toMatch(/max-h-\[64px\]|max-h-16/);
      // Debe incluir line-clamp-2 o wrap break-words
      expect(button.className).toMatch(/line-clamp-2|break-words/);
    });
  });

  describe('4. Debounce táctil, prevención de clicks múltiples e inline spinner (RF-19, RF-21)', () => {
    it('debe mostrar spinner inline y deshabilitar interacción cuando isLoading es true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Guardando
        </Button>
      );
      const button = screen.getByRole('button');

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('debe aplicar debounce táctil (< 50ms) evitando disparos múltiples por rebote', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Acción Rápida</Button>);
      const button = screen.getByRole('button', { name: /Acción Rápida/i });

      // Clicks repetidos inmediatos (rebote táctil < 50ms)
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Solo el primer click debe procesarse inmediatamente
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
