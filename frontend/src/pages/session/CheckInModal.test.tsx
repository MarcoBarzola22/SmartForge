import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckInModal } from './CheckInModal';
import { apiClient } from '../../api/client';
import type { CheckInResponse } from '../../api';

describe('TASK-68: CheckInModal - Pre-Session Fatigue & Joint Pain (RF-04, CA-04.1, CA-04.2, CA-04.3)', () => {
  const mockCheckInResponse: CheckInResponse = {
    id: 'chk-101',
    session_id: 'sess-123',
    fatigue_level: 3,
    joint_pains: [
      {
        joint: 'rodilla',
        side: 'derecha',
        intensity: 'moderada'
      }
    ],
    created_at: '2026-09-12T10:00:00Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render mandatory check-in modal with fatigue scale (1–5) and full bilateral joint taxonomy (RF-04, CA-04.1, CA-04.2)', () => {
    render(
      <CheckInModal
        isOpen={true}
        sessionId="sess-123"
        onCheckInSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Check-in Pre-Sesión/i)).toBeInTheDocument();
    expect(screen.getByText(/Nivel de fatiga percibida/i)).toBeInTheDocument();

    // 1-5 Fatigue scale buttons
    expect(screen.getByRole('button', { name: /Fatiga 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fatiga 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fatiga 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fatiga 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fatiga 5/i })).toBeInTheDocument();

    // Required 7 joints (CA-04.2)
    expect(screen.getByRole('button', { name: /Hombro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Codo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Muñeca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Columna lumbar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rodilla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tobillo/i })).toBeInTheDocument();

    // Submit button with touch target
    const submitBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.className).toMatch(/min-h-\[48px\]|touch-target/);
  });

  it('should allow selecting fatigue level and submitting with no joint pains when athlete is fresh', async () => {
    const onCheckInSuccess = vi.fn();
    const checkinSpy = vi
      .spyOn(apiClient.sessions, 'checkin')
      .mockResolvedValue({
        id: 'chk-102',
        session_id: 'sess-123',
        fatigue_level: 2,
        joint_pains: [],
        created_at: '2026-09-12T10:00:00Z'
      });

    render(
      <CheckInModal
        isOpen={true}
        sessionId="sess-123"
        onCheckInSuccess={onCheckInSuccess}
      />
    );

    // Select fatigue level 2
    fireEvent.click(screen.getByRole('button', { name: /Fatiga 2/i }));

    // Submit check-in
    const submitBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(checkinSpy).toHaveBeenCalledWith('sess-123', {
        fatigue_level: 2,
        joint_pains: []
      });
      expect(onCheckInSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('should allow toggling joint pain, configuring side and intensity (leve, moderada, severa) (CA-04.2, CA-04.3)', async () => {
    const onCheckInSuccess = vi.fn();
    const checkinSpy = vi
      .spyOn(apiClient.sessions, 'checkin')
      .mockResolvedValue(mockCheckInResponse);

    render(
      <CheckInModal
        isOpen={true}
        sessionId="sess-123"
        onCheckInSuccess={onCheckInSuccess}
      />
    );

    // Select fatigue level 3
    fireEvent.click(screen.getByRole('button', { name: /Fatiga 3/i }));

    // Toggle Rodilla
    fireEvent.click(screen.getByRole('button', { name: /Rodilla/i }));

    // Configure Side: Derecha
    expect(screen.getByText(/Lado de molestia/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lado Derecha/i }));

    // Configure Intensity: Moderada (CA-04.3)
    expect(screen.getByText(/Intensidad del dolor/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Intensidad Moderada/i }));

    // Submit check-in
    const submitBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(checkinSpy).toHaveBeenCalledWith('sess-123', {
        fatigue_level: 3,
        joint_pains: [
          {
            joint: 'rodilla',
            side: 'derecha',
            intensity: 'moderada'
          }
        ]
      });
      expect(onCheckInSuccess).toHaveBeenCalledWith(mockCheckInResponse);
    });
  });

  it('should allow adding multiple joint pains with bilateral sides and different intensities', async () => {
    const onCheckInSuccess = vi.fn();
    const checkinSpy = vi
      .spyOn(apiClient.sessions, 'checkin')
      .mockResolvedValue({
        id: 'chk-103',
        session_id: 'sess-123',
        fatigue_level: 4,
        joint_pains: [
          { joint: 'hombro', side: 'izquierda', intensity: 'leve' },
          { joint: 'columna_lumbar', side: 'bilateral', intensity: 'severa' }
        ],
        created_at: '2026-09-12T10:00:00Z'
      });

    render(
      <CheckInModal
        isOpen={true}
        sessionId="sess-123"
        onCheckInSuccess={onCheckInSuccess}
      />
    );

    // Select fatigue 4
    fireEvent.click(screen.getByRole('button', { name: /Fatiga 4/i }));

    // Add Hombro
    fireEvent.click(screen.getByRole('button', { name: /Hombro/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lado Izquierda/i }));
    fireEvent.click(screen.getByRole('button', { name: /Intensidad Leve/i }));

    // Add Columna Lumbar
    fireEvent.click(screen.getByRole('button', { name: /Columna lumbar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Intensidad Severa/i }));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(checkinSpy).toHaveBeenCalledWith('sess-123', {
        fatigue_level: 4,
        joint_pains: expect.arrayContaining([
          { joint: 'hombro', side: 'izquierda', intensity: 'leve' },
          { joint: 'columna_lumbar', side: 'bilateral', intensity: 'severa' }
        ])
      });
      expect(onCheckInSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error message when API check-in fails', async () => {
    vi.spyOn(apiClient.sessions, 'checkin').mockRejectedValue({
      status: 400,
      code: 'CHECKIN_ERROR',
      message: 'La sesión ya cuenta con un check-in registrado'
    });

    render(
      <CheckInModal
        isOpen={true}
        sessionId="sess-123"
        onCheckInSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/La sesión ya cuenta con un check-in registrado/i)
      ).toBeInTheDocument();
    });
  });

  describe('T-24: CheckInModal como Bottom Sheet accesible con safe-areas y acciones en mitad inferior (RF-04, RF-16)', () => {
    const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

    it('se despliega como Bottom Sheet anclado a la base (side="bottom") y respeta safe area', () => {
      render(
        <CheckInModal
          isOpen={true}
          sessionId="sess-123"
          onCheckInSuccess={vi.fn()}
        />
      );

      const sheetContent = screen.getByTestId('checkin-bottom-sheet');
      expect(sheetContent).toBeInTheDocument();
      expect(sheetContent.className).toMatch(/bottom-0/);
      expect(sheetContent.className).toMatch(/fixed|sticky/);
    });

    it('aloja la acción principal en la mitad inferior accesible con diana táctil >= 48px (RF-04)', () => {
      render(
        <CheckInModal
          isOpen={true}
          sessionId="sess-123"
          onCheckInSuccess={vi.fn()}
        />
      );

      const bottomDock = screen.getByTestId('checkin-bottom-actions');
      expect(bottomDock).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Check-in e Iniciar/i });
      expect(confirmBtn).toBeInTheDocument();
      expect(confirmBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });

    it('no contiene clases de scroll horizontal y no desborda en 320px', () => {
      const { container } = render(
        <CheckInModal
          isOpen={true}
          sessionId="sess-123"
          onCheckInSuccess={vi.fn()}
        />
      );

      const horizontalScrollers = container.querySelectorAll('.overflow-x-auto');
      expect(horizontalScrollers.length).toBe(0);
    });
  });
});
