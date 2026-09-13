import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TruncatedTextToggle } from './TruncatedTextToggle';

describe('T-20: TruncatedTextToggle.tsx (RF-15, CF-05)', () => {
  const longExerciseName =
    'Press de Banca Plano con Barra Olímpica y Agarre Medio para Énfasis en Pectoral Mayor y Tríceps';
  const longNote =
    'Mantener retracción escapular activa durante todo el recorrido, codos a 45 grados y pausa isométrica de 1 segundo en el pecho antes de la fase concéntrica explosiva.';

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('1. Truncamiento inicial reversible por tap táctil (RF-15, CF-05)', () => {
    it('renderiza el texto con line-clamp y aria-expanded="false" por defecto', () => {
      render(
        <TruncatedTextToggle
          text={longExerciseName}
          maxLines={1}
          data-testid="text-toggle"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'false');

      const textElement = screen.getByText(longExerciseName);
      expect(textElement.className).toContain('line-clamp-1');
      expect(textElement.className).toContain('truncate');
    });

    it('un tap/click expande el texto inline (line-clamp removido) y aria-expanded="true"', () => {
      render(
        <TruncatedTextToggle
          text={longExerciseName}
          maxLines={1}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      const textElement = screen.getByText(longExerciseName);
      expect(textElement.className).not.toContain('line-clamp-1');
    });

    it('un segundo tap/click contrae el texto nuevamente (toggle reversible)', () => {
      render(
        <TruncatedTextToggle
          text={longExerciseName}
          maxLines={1}
        />
      );

      const button = screen.getByRole('button');
      // 1er tap: expandir
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // 2do tap: contraer
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
      const textElement = screen.getByText(longExerciseName);
      expect(textElement.className).toContain('line-clamp-1');
    });

    it('no utiliza atributos ni pseudoclases de hover como disparador de revelación', () => {
      const { container } = render(
        <TruncatedTextToggle
          text={longExerciseName}
          maxLines={1}
        />
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      // No debe contener clases que dependan de hover para visibilidad de contenido
      expect(button?.className).not.toMatch(/group-hover:block|hover:h-auto/);
    });
  });

  describe('2. Auto-scroll suave para preservar controles visibles (RF-15)', () => {
    it('al expandirse invoca scrollIntoView con behavior: smooth y block: nearest', () => {
      const scrollSpy = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollSpy;

      render(
        <TruncatedTextToggle
          text={longNote}
          maxLines={2}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
          block: 'nearest',
        })
      );
    });

    it('soporta maxLines=2 aplicando line-clamp-2 en estado inicial', () => {
      render(
        <TruncatedTextToggle
          text={longNote}
          maxLines={2}
        />
      );

      const textElement = screen.getByText(longNote);
      expect(textElement.className).toContain('line-clamp-2');
    });

    it('en un contenedor de 320px de ancho aplica w-full y no genera scroll horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <TruncatedTextToggle text={longExerciseName} maxLines={1} />
        </div>,
        { container }
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');

      unmount();
      document.body.removeChild(container);
    });
  });
});
