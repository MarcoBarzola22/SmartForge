import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileLayout } from './MobileLayout';

describe('TASK-58: MobileLayout Component (RNF-01, RNF-02, Constitución §2)', () => {
  it('should render a centered mobile container with max-width 390px', () => {
    const { container } = render(
      <MobileLayout>
        <div>Contenido de prueba</div>
      </MobileLayout>
    );

    const mobileContainer = container.querySelector('[data-testid="mobile-container"]');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.className).toContain('max-w-[390px]');
    expect(mobileContainer?.className).toContain('overflow-x-hidden');
  });

  it('should render an adaptive status bar with title and connectivity indicator', () => {
    render(
      <MobileLayout title="Rutina de Hoy" isOnline={true}>
        <div>Contenido de prueba</div>
      </MobileLayout>
    );

    expect(screen.getByRole('heading', { name: /Rutina de Hoy/i })).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByText(/En línea/i)).toBeInTheDocument();
  });

  it('should display offline badge in status bar when offline', () => {
    render(
      <MobileLayout title="Sesión Activa" isOnline={false}>
        <div>Modo sin conexión</div>
      </MobileLayout>
    );

    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByText(/Modo Offline/i)).toBeInTheDocument();
  });

  it('should render bottom navigation or footer within the mobile container', () => {
    render(
      <MobileLayout
        footer={<nav data-testid="bottom-nav">Navegación Inferior</nav>}
      >
        <div>Contenido principal</div>
      </MobileLayout>
    );

    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByText(/Navegación Inferior/i)).toBeInTheDocument();
  });
});
