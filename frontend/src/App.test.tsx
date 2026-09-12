import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';

describe('TASK-60: App Component Bottom Navigation Integration (RNF-01, Constitución §2)', () => {
  it('should render the app with bottom navigation and allow switching between tabs', () => {
    const { container } = render(<App />);

    const mobileContainer = container.querySelector('[data-testid="mobile-container"]');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.className).toContain('max-w-[390px]');

    // Initial tab is Rutina
    expect(screen.getByRole('heading', { name: 'Rutina', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Rutina del Día/i)).toBeInTheDocument();

    // Switch to Catálogo
    const catalogTab = screen.getByRole('tab', { name: /Catálogo/i });
    fireEvent.click(catalogTab);
    expect(screen.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Catálogo de Ejercicios/i)).toBeInTheDocument();

    // Switch to Perfil
    const profileTab = screen.getByRole('tab', { name: /Perfil/i });
    fireEvent.click(profileTab);
    expect(screen.getByRole('heading', { name: 'Perfil', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Perfil del Atleta/i)).toBeInTheDocument();

    // Switch to Sesión
    const sessionTab = screen.getByRole('tab', { name: /Sesión/i });
    fireEvent.click(sessionTab);
    expect(screen.getByRole('heading', { name: 'Sesión', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Sesión de Entrenamiento/i)).toBeInTheDocument();
  });
});
