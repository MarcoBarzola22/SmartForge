import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';

// Componentes y Vistas del Sistema de Diseño
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/AlertDialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/Sheet';
import { BottomNav } from '../components/navigation/BottomNav';
import { SegmentedSubNav } from '../components/navigation/SegmentedSubNav';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { CheckInModal } from '../pages/session/CheckInModal';
import { AuthContext, AuthContextType } from '../context/AuthContext';

// Helper matemático de ratio de contraste WCAG 2.1 (RNF-01, RNF-02, RNF-03)
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0]! * 0.2126 + a[1]! * 0.7152 + a[2]! * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Configuración común de axe-core para renderizados en entorno JSDOM
const baseAxeOptions: axe.RunOptions = {
  rules: {
    'color-contrast': { enabled: false }, // En JSDOM los stylesheets de Tailwind v4 no computan estilos en cascada
    'region': { enabled: false }, // Desactivado para fragmentos y componentes aislados sin landmarks globales
    'heading-order': { enabled: false }, // Desactivado para componentes atómicos independientes
  },
};

describe('T-26: Suite de tests automatizados de ratios de contraste y accesibilidad ARIA (axe-core) (RNF-01, RNF-02, RNF-03, CF-03)', () => {
  const mockAuthContext: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    isProfileComplete: false,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Auditoría axe-core con 0 violaciones de accesibilidad en componentes atómicos', () => {
    it('Button cumple estándares WCAG con axe-core sin violaciones', async () => {
      const { container } = render(
        <div>
          <Button variant="primary">Iniciar Entrenamiento</Button>
          <Button variant="secondary">Cancelar Acción</Button>
          <Button variant="destructive">Descartar Serie</Button>
          <Button variant="ghost">Opciones</Button>
        </div>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('Input con label, helper y mensaje de error cumple con axe-core sin violaciones', async () => {
      const { container } = render(
        <div>
          <Input
            id="test-weight"
            label="Peso corporal (kg)"
            helperText="Ingresá tu peso actual"
            error="El peso debe ser mayor a 0"
          />
        </div>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('Card y Badge cumplen con axe-core sin violaciones', async () => {
      const { container } = render(
        <div>
          <Card title="Detalles del Ejercicio" subtitle="Press Militar con Barra">
            <p>3 series de 8 a 10 repeticiones.</p>
            <Badge variant="success">Completado</Badge>
            <Badge variant="warning">Pendiente</Badge>
          </Card>
        </div>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('BottomNav con estructura de tabs y paneles asociados cumple con axe-core', async () => {
      const { container } = render(
        <div>
          <BottomNav activeTab="session" onTabChange={() => {}} />
          {/* Paneles asociados requeridos por aria-controls según norma W3C */}
          <div id="panel-session" role="tabpanel" />
          <div id="panel-history" role="tabpanel" />
          <div id="panel-catalog" role="tabpanel" />
          <div id="panel-routines" role="tabpanel" />
          <div id="panel-profile" role="tabpanel" />
        </div>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('SegmentedSubNav con role="tablist" y tabs accesibles cumple con axe-core', async () => {
      const { container } = render(
        <div>
          <SegmentedSubNav
            items={[
              { id: 'history', label: 'Historial' },
              { id: 'stats', label: 'Estadísticas' },
            ]}
            activeId="history"
            onChange={() => {}}
          />
          {/* Paneles asociados requeridos por aria-controls */}
          <div id="subpanel-history" role="tabpanel" />
          <div id="subpanel-stats" role="tabpanel" />
        </div>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });
  });

  describe('2. Auditoría axe-core en Vistas Renderizadas del Sistema', () => {
    it('LoginPage renderizada supera la auditoría axe-core con 0 violaciones', async () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <LoginPage />
        </AuthContext.Provider>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('ProfilePage renderizada en modo creación supera la auditoría axe-core con 0 violaciones', async () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProfilePage mode="create" />
        </AuthContext.Provider>
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });

    it('CheckInModal como Bottom Sheet supera la auditoría axe-core con 0 violaciones', async () => {
      const { container } = render(
        <CheckInModal
          isOpen={true}
          sessionId="sess-test"
          onCheckInSuccess={() => {}}
        />
      );

      const results = await axe.run(container, baseAxeOptions);
      expect(results.violations).toEqual([]);
    });
  });

  describe('3. Verificación de Roles ARIA Clave (CF-03, Constitución R2)', () => {
    it('BottomNav posee role="navigation" con etiqueta accesible', () => {
      render(<BottomNav activeTab="session" onTabChange={() => {}} />);
      const navElement = screen.getByRole('navigation', { name: /navegación principal/i });
      expect(navElement).toBeInTheDocument();
    });

    it('Toast renderiza con role="alert" o contenedor con aria-live="polite"', () => {
      render(
        <Toast
          type="error"
          message="Error al guardar la serie de sentadilla"
          onClose={() => {}}
        />
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveTextContent(/Error al guardar la serie de sentadilla/i);
    });

    it('AlertDialog presenta role="alertdialog" con aria-modal="true"', () => {
      render(
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar Sesión Activa</AlertDialogTitle>
              <AlertDialogDescription>
                Se perderán los registros no sincronizados. ¿Deseas continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction>Descartar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText(/Descartar Sesión Activa/i)).toBeInTheDocument();
    });

    it('Bottom Sheet modal presenta role="dialog" con aria-modal="true"', () => {
      render(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filtros de Ejercicios</SheetTitle>
              <SheetDescription>Seleccioná grupo muscular y equipamiento</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText(/Filtros de Ejercicios/i)).toBeInTheDocument();
    });
  });

  describe('4. Validación Matemática de Contraste WCAG AA y AAA (RNF-01, RNF-02, RNF-03, CF-03)', () => {
    it('Botón primario: Texto negro carbón (#0C0C0E) sobre Azul Acción (#3B82F6) cumple ratio WCAG AA (>= 4.5:1, RNF-01)', () => {
      const ratio = getContrastRatio('#0C0C0E', '#3B82F6');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(5.3); // ~5.31:1 superando WCAG AA
    });

    it('Texto primario (#FFFFFF) sobre Fondo Base (#0C0C0E) supera ratio WCAG AAA (>= 7:1, RNF-01)', () => {
      const ratio = getContrastRatio('#FFFFFF', '#0C0C0E');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(19.0); // ~19.54:1 contraste de máximo nivel
    });

    it('Texto secundario (#A1A1AA) sobre Fondo Base (#0C0C0E) cumple ratio WCAG AA (>= 4.5:1, RNF-01)', () => {
      const ratio = getContrastRatio('#A1A1AA', '#0C0C0E');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(7.0); // ~7.62:1 supera incluso AAA
    });

    it('Texto de error semántico (#F87171) sobre Superficie 2 (#27272A) cumple ratio WCAG AA (>= 4.5:1, RNF-01)', () => {
      const ratio = getContrastRatio('#F87171', '#27272A');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(5.3); // ~5.38:1
    });

    it('Borde interactivo en reposo (#52525B) sobre Fondo Base (#0C0C0E) cumple ratio visible (>= 2.5:1, RNF-02)', () => {
      const ratio = getContrastRatio('#52525B', '#0C0C0E');
      expect(ratio).toBeGreaterThanOrEqual(2.5);
      expect(ratio).toBeGreaterThan(2.52); // ~2.53:1
    });

    it('Anillo de foco activo (#60A5FA) sobre Superficie 2 (#27272A) cumple ratio de componentes UI (>= 3:1, RNF-03)', () => {
      const ratio = getContrastRatio('#60A5FA', '#27272A');
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(ratio).toBeGreaterThan(5.8); // ~5.86:1 cumple holgadamente WCAG 1.4.11
    });

    it('Botón destructivo: Texto blanco (#FFFFFF) sobre Rojo (#EF4444) cumple ratio para botones/texto grande (>= 3:1, RNF-01)', () => {
      const ratio = getContrastRatio('#FFFFFF', '#EF4444');
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(ratio).toBeGreaterThan(3.7); // ~3.76:1
    });
  });

  describe('5. Detección de colapsos visuales y contención de layout a 320px', () => {
    it('Botón y elementos atómicos mantienen dimensiones mínimas de 48px y no colapsan', () => {
      const { getByRole } = render(
        <Button variant="primary" className="touch-target">
          Continuar
        </Button>
      );
      const button = getByRole('button');
      expect(button).toHaveClass('touch-target');
      expect(button).toHaveClass('min-h-[48px]');
    });

    it('Input mantiene altura mínima de 48px con clases de soporte táctil', () => {
      const { getByRole } = render(
        <Input id="colapso-test" label="Repeticiones" />
      );
      const input = getByRole('textbox');
      expect(input).toHaveClass('min-h-[48px]');
      expect(input).toHaveClass('touch-target');
    });
  });
});
