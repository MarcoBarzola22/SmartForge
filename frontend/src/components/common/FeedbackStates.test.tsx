import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CentralizedSpinner } from './CentralizedSpinner';
import { EmptyState } from './EmptyState';
import { Dumbbell } from 'lucide-react';

describe('T-11: CentralizedSpinner.tsx y EmptyState.tsx (RF-20, RF-22, CF-14, Constitución R6)', () => {
  describe('1. CentralizedSpinner', () => {
    it('debe renderizar con role="status", aria-busy="true" y texto en español por defecto', () => {
      render(<CentralizedSpinner />);

      const spinnerContainer = screen.getByRole('status');
      expect(spinnerContainer).toBeInTheDocument();
      expect(spinnerContainer).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });

    it('debe permitir mensaje personalizado en español y clases de centrado flexible', () => {
      render(<CentralizedSpinner message="Cargando rutinas…" fullScreen={false} />);

      const message = screen.getByText('Cargando rutinas…');
      expect(message).toBeInTheDocument();
      expect(message.className).toMatch(/text-(content-secondary|content-primary|zinc-400|zinc-300)/);

      const status = screen.getByRole('status');
      expect(status.className).toMatch(/flex/);
      expect(status.className).toMatch(/items-center/);
      expect(status.className).toMatch(/justify-center/);
    });
  });

  describe('2. EmptyState', () => {
    it('debe renderizar título y descripción clara en español con icono accesible', () => {
      render(
        <EmptyState
          icon={<Dumbbell data-testid="empty-icon" />}
          title="No hay ejercicios registrados"
          description="Comienza agregando un ejercicio para configurar tu rutina."
        />
      );

      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
      expect(screen.getByText('No hay ejercicios registrados')).toBeInTheDocument();
      expect(
        screen.getByText('Comienza agregando un ejercicio para configurar tu rutina.')
      ).toBeInTheDocument();
    });

    it('debe renderizar botón de acción táctil >= 48px y ejecutar el callback al pulsar', () => {
      const handleAction = vi.fn();

      render(
        <EmptyState
          title="Sin historial disponible"
          description="No se encontraron sesiones previas para este ejercicio."
          actionLabel="Iniciar Sesión"
          onAction={handleAction}
        />
      );

      const actionButton = screen.getByRole('button', { name: /iniciar sesión/i });
      expect(actionButton).toBeInTheDocument();
      expect(actionButton.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/);

      fireEvent.click(actionButton);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
