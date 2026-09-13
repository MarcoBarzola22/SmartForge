import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

// Vistas del Sistema bajo Auditoría de Idioma
import { LoginPage } from '../pages/auth/LoginPage';
import { ExerciseCatalogPage } from '../pages/catalog/ExerciseCatalogPage';
import { SessionPage } from '../pages/session/SessionPage';
import { RoutineEditorPage } from '../pages/routine/RoutineEditorPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

// Componentes Atómicos y de Feedback
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/Sheet';
import { BottomNav } from '../components/navigation/BottomNav';
import { SegmentedSubNav } from '../components/navigation/SegmentedSubNav';
import { CentralizedSpinner } from '../components/common/CentralizedSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { SyncStatusBadge } from '../components/common/SyncStatusBadge';

// Contextos y API
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  TrainingSession,
  SessionPlan,
  AthleteProfile,
  Exercise
} from '../api';

// Helper matemático de ratio de contraste WCAG
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

describe('T-28: Auditoría de idioma español en interfaz y mensajes visibles (RNF-05, CF-14, Constitución R6)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-es-1',
    google_id: 'goog-es-1',
    email: 'atleta@smartforge.test',
    name: 'Lucas Barzola',
    age: 26,
    weight_kg: 78,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockAuthContext: AuthContextType = {
    user: mockAthlete,
    token: 'valid-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  };

  const mockExercises: Exercise[] = [
    {
      id: 'ex-bench',
      name: 'Press de Banca Plano con Barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      instructions: 'Bajar controlado al pecho y empujar con fuerza.',
      is_active: true,
    },
  ];

  const mockSessionPlan: SessionPlan = {
    id: 'sess-plan-es',
    week_plan_id: 'week-1',
    day_number: 1,
    name: 'Torso Empuje y Pierna',
    exercise_assignments: [
      {
        id: 'assign-1',
        session_plan_id: 'sess-plan-es',
        exercise_id: 'ex-bench',
        exercise: mockExercises[0],
        order_in_session: 1,
        target_sets: 3,
        target_reps: 8,
        target_rir: 2,
        target_load_kg: 70,
        is_swapped: false,
      },
    ],
  };

  const mockActiveSession: TrainingSession = {
    id: 'sess-active-es',
    athlete_id: 'ath-es-1',
    session_plan_id: 'sess-plan-es',
    status: 'in_progress',
    started_at: '2026-09-12T10:00:00Z',
    checkin: {
      id: 'chk-1',
      session_id: 'sess-active-es',
      fatigue_level: 2,
      sleep_quality: 4,
      muscle_soreness: 1,
      joint_pain_map: [],
      notes: '',
      created_at: '2026-09-12T10:00:00Z',
    },
    sets: [],
    created_at: '2026-09-12T10:00:00Z',
    updated_at: '2026-09-12T10:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(mockExercises);
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/exercises')) return { data: mockExercises };
      if (url.includes('/sessions/active')) return { data: mockActiveSession };
      return { data: {} };
    });
  });

  describe('1. Verificación Estática de Código Fuente (Sin cadenas no traducidas o en inglés)', () => {
    // Lista de términos en inglés prohibidos como textos visibles o placeholders
    const FORBIDDEN_ENGLISH_STRINGS = [
      /\bplaceholder\s*=\s*["']Search\b/i,
      /\bplaceholder\s*=\s*["']Enter email\b/i,
      /\bplaceholder\s*=\s*["']Enter your password\b/i,
      />\s*Submit\s*</,
      />\s*Cancel\s*</,
      />\s*Delete\s*</,
      />\s*Save\s*</,
      />\s*Edit\s*</,
      />\s*Next\s*</,
      />\s*Back\s*</,
      />\s*Settings\s*</,
      />\s*Loading\.\.\.\s*</,
      /\baria-label\s*=\s*["']Close modal["']/i,
    ];

    const sourceFilesToCheck = [
      'src/components/ui/Button.tsx',
      'src/components/ui/Input.tsx',
      'src/components/ui/Toast.tsx',
      'src/components/ui/AlertDialog.tsx',
      'src/components/ui/Sheet.tsx',
      'src/components/navigation/BottomNav.tsx',
      'src/components/navigation/SegmentedSubNav.tsx',
      'src/components/common/CentralizedSpinner.tsx',
      'src/components/common/EmptyState.tsx',
      'src/components/common/SyncStatusBadge.tsx',
      'src/pages/auth/LoginPage.tsx',
      'src/pages/catalog/ExerciseCatalogPage.tsx',
      'src/pages/session/SessionPage.tsx',
      'src/pages/routine/RoutineEditorPage.tsx',
      'src/pages/profile/ProfilePage.tsx',
    ];

    sourceFilesToCheck.forEach((relativeFilePath) => {
      it(`el archivo ${relativeFilePath} no contiene cadenas visibles en inglés prohibidas`, () => {
        const fullPath = path.resolve(__dirname, '../../', relativeFilePath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf-8');
        FORBIDDEN_ENGLISH_STRINGS.forEach((regex) => {
          expect(content).not.toMatch(regex);
        });
      });
    });
  });

  describe('2. Auditoría Dinámica de Textos en Pantallas Renderizadas', () => {
    it('LoginPage renderiza todos los elementos interactivos en español', () => {
      render(
        <AuthContext.Provider value={{ ...mockAuthContext, isAuthenticated: false, user: null }}>
          <LoginPage />
        </AuthContext.Provider>
      );

      // Título y subtítulo
      expect(screen.getByText('Smart')).toBeInTheDocument();
      expect(screen.getByText('Forge')).toBeInTheDocument();
      expect(screen.getByText('Entrenador Personal Digital')).toBeInTheDocument();

      // Botón de Google OAuth (100% OAuth T-87)
      expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();

      cleanup();
    });

    it('ExerciseCatalogPage renderiza catálogo, búsqueda y filtros en español', async () => {
      render(<ExerciseCatalogPage />);

      expect(screen.getByText(/catálogo de ejercicios/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/buscar ejercicio por nombre/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filtrar/i })).toBeInTheDocument();

      cleanup();
    });

    it('SessionPage renderiza estados, botones de registro y advertencias en español', () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <SessionPage session={mockActiveSession} sessionPlan={mockSessionPlan} />
        </AuthContext.Provider>
      );

      expect(screen.getByText(/sesión en curso/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /finalizar sesión/i })).toBeInTheDocument();

      cleanup();
    });

    it('RoutineEditorPage renderiza acciones, badges e instrucciones en español', () => {
      render(
        <RoutineEditorPage
          sessionId="sess-es"
          sessionPlan={mockSessionPlan}
          onStartSession={() => {}}
          onAcceptRoutine={() => {}}
        />
      );

      expect(screen.getByText(/editor de rutina/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aceptar rutina/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /cambiar ejercicio/i }).length).toBeGreaterThan(0);

      cleanup();
    });

    it('ProfilePage renderiza formulario de atleta, tabs y acciones fijas en español', () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProfilePage mode="edit" />
        </AuthContext.Provider>
      );

      expect(screen.getByText(/editar perfil/i)).toBeInTheDocument();
      expect(screen.getByText(/datos del atleta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/peso corporal \(kg\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();

      cleanup();
    });
  });

  describe('3. Auditoría de Componentes Modales, Navegación y Feedback en Español', () => {
    it('BottomNav presenta pestañas etiquetadas exclusivamente en español', () => {
      render(<BottomNav activeTab="session" onTabChange={() => {}} />);

      expect(screen.getByRole('tab', { name: /rutina/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /catálogo/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sesión/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /perfil/i })).toBeInTheDocument();

      cleanup();
    });

    it('AlertDialog presenta acciones por defecto en español ("Cancelar" y "Confirmar")', () => {
      render(
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar Cambios</AlertDialogTitle>
              <AlertDialogDescription>¿Deseas cancelar la edición actual?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel />
              <AlertDialogAction>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();

      cleanup();
    });

    it('Sheet incluye botón de cierre accesible con etiqueta en español ("Cerrar")', () => {
      render(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filtros Avanzados</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      const closeBtn = screen.getByRole('button', { name: /cerrar/i });
      expect(closeBtn).toBeInTheDocument();

      cleanup();
    });

    it('SyncStatusBadge muestra textos de sincronización offline y online en español', () => {
      const { rerender } = render(<SyncStatusBadge isOnline={true} pendingCount={0} />);
      expect(screen.getByText(/en línea · sincronizado/i)).toBeInTheDocument();

      rerender(<SyncStatusBadge isOnline={false} pendingCount={2} />);
      expect(screen.getByText(/modo offline/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();

      cleanup();
    });

    it('CentralizedSpinner muestra texto orientador en español por defecto', () => {
      render(<CentralizedSpinner />);
      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
      cleanup();
    });

    it('EmptyState renderiza mensajes orientadores y botón de acción en español', () => {
      render(
        <EmptyState
          title="Sin resultados disponibles"
          description="Intentá ajustar los términos de búsqueda o filtros."
          actionLabel="Reiniciar Filtros"
          onAction={() => {}}
        />
      );

      expect(screen.getByText(/sin resultados disponibles/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reiniciar filtros/i })).toBeInTheDocument();
      cleanup();
    });
  });

  describe('4. Detección de Colapsos Visuales y Falta de Contraste con Textos en Español', () => {
    it('Los botones con textos en español más largos no colapsan la diana táctil (>= 48px)', () => {
      render(
        <div className="flex flex-col gap-3 w-[320px]">
          <Button variant="primary" fullWidth>
            Finalizar Entrenamiento y Registrar Sesión
          </Button>
          <Button variant="secondary" fullWidth>
            Descartar Cambios y Volver al Mesociclo
          </Button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);
        expect(btn.className).toContain('w-full');
      });

      cleanup();
    });

    it('Los textos de interfaz en español mantienen contraste WCAG AA (>= 4.5:1) y AAA (>= 7:1)', () => {
      // 1. Botón primario: Texto negro carbón (#0C0C0E) sobre Azul Marca (#3B82F6) >= 4.5:1
      const primaryBtnRatio = getContrastRatio('#0C0C0E', '#3B82F6');
      expect(primaryBtnRatio).toBeGreaterThanOrEqual(4.5);

      // 2. Texto principal blanco (#FFFFFF) sobre fondo carbón (#0C0C0E) >= 7:1
      const mainTextRatio = getContrastRatio('#FFFFFF', '#0C0C0E');
      expect(mainTextRatio).toBeGreaterThanOrEqual(7.0);

      // 3. Texto secundario (#A1A1AA) sobre fondo carbón (#0C0C0E) >= 4.5:1
      const secondaryTextRatio = getContrastRatio('#A1A1AA', '#0C0C0E');
      expect(secondaryTextRatio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
