import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './Card';

describe('T-07: Implementación de Card.tsx rígido y modular (RF-10, RF-12, CF-02)', () => {
  describe('1. Blindaje contra desborde y tokens cromáticos (RF-10, CF-02)', () => {
    it('debe tener clases w-full, overflow-hidden, rounded-xl (12px), Superficie 1 y borde #27272A', () => {
      render(
        <Card data-testid="card-root">
          <p>Contenido del card</p>
        </Card>
      );
      const card = screen.getByTestId('card-root');

      // w-full y overflow-hidden para blindaje contra scroll horizontal
      expect(card.className).toMatch(/w-full/);
      expect(card.className).toMatch(/overflow-hidden/);

      // Radio de 12px y tokens de diseño
      expect(card.className).toMatch(/rounded-(xl|\[12px\]|card)/);
      expect(card.className).toMatch(/bg-(surface-1|\[#18181B\])/);
      expect(card.className).toMatch(/border-(border-subtle|subtle|\[#27272A\])/);
    });

    it('en un contenedor de 320px de ancho no debe generar desborde horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      const { unmount } = render(
        <Card data-testid="card-320">
          <div>Entrenamiento de Fuerza con Sobrecarga Progresiva</div>
        </Card>,
        { container }
      );

      const card = screen.getByTestId('card-320');
      expect(card.className).toContain('w-full');
      expect(card.className).toContain('overflow-hidden');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Accesibilidad táctil en tarjetas interactivas (RF-12, Constitución R2)', () => {
    it('cuando es interactiva (con onClick) debe tener min-h-[48px] y responder a eventos', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="clickable-card">
          Presionar tarjeta
        </Card>
      );

      const card = screen.getByTestId('clickable-card');
      expect(card.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/);

      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Compatibilidad modular y basada en props (shadcn + SmartForge)', () => {
    it('debe renderizar correctamente usando props tradicionales (title, subtitle, footer)', () => {
      render(
        <Card
          title="Press de Banca"
          subtitle="4 series planificadas"
          footer={<span data-testid="footer-text">Completar</span>}
        >
          <p>Detalle de repeticiones</p>
        </Card>
      );

      expect(screen.getByText('Press de Banca')).toBeInTheDocument();
      expect(screen.getByText('4 series planificadas')).toBeInTheDocument();
      expect(screen.getByText('Detalle de repeticiones')).toBeInTheDocument();
      expect(screen.getByTestId('footer-text')).toBeInTheDocument();
    });

    it('debe renderizar componentes modulares (CardHeader, CardTitle, CardContent, CardFooter)', () => {
      render(
        <Card data-testid="modular-card">
          <CardHeader>
            <CardTitle>Sentadilla Trasera</CardTitle>
            <CardDescription>Piernas y Core</CardDescription>
          </CardHeader>
          <CardContent>
            <p>100kg x 5 reps</p>
          </CardContent>
          <CardFooter>
            <button type="button">Ver historial</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Sentadilla Trasera')).toBeInTheDocument();
      expect(screen.getByText('Piernas y Core')).toBeInTheDocument();
      expect(screen.getByText('100kg x 5 reps')).toBeInTheDocument();
      expect(screen.getByText('Ver historial')).toBeInTheDocument();
    });
  });
});
