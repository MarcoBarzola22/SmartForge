import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('TASK-60: Bottom Navigation Bar Component (RNF-01, Constitución §2)', () => {
  it('should render the 4 main navigation tabs: Rutina, Sesión, Catálogo, Perfil', () => {
    render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rutina/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Catálogo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Perfil/i })).toBeInTheDocument();
  });

  it('should have touch targets ≥ 48px on all navigation items for one-hand reach', () => {
    render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    tabs.forEach((tab) => {
      expect(tab.className).toMatch(/min-h-\[48px\]|min-w-\[48px\]|touch-target/);
    });
  });

  it('should mark the active tab with aria-selected="true" and active accent styling', () => {
    const { rerender } = render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

    const routineTab = screen.getByRole('tab', { name: /Rutina/i });
    expect(routineTab).toHaveAttribute('aria-selected', 'true');
    expect(routineTab.className).toContain('text-amber-500');

    rerender(<BottomNav activeTab="session" onTabChange={vi.fn()} />);
    const sessionTab = screen.getByRole('tab', { name: /Sesión/i });
    expect(sessionTab).toHaveAttribute('aria-selected', 'true');
    expect(routineTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should trigger onTabChange with the correct tab identifier when tapped', () => {
    const handleTabChange = vi.fn();
    render(<BottomNav activeTab="routine" onTabChange={handleTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /Catálogo/i }));
    expect(handleTabChange).toHaveBeenCalledWith('catalog');

    fireEvent.click(screen.getByRole('tab', { name: /Perfil/i }));
    expect(handleTabChange).toHaveBeenCalledWith('profile');

    fireEvent.click(screen.getByRole('tab', { name: /Sesión/i }));
    expect(handleTabChange).toHaveBeenCalledWith('session');
  });

  it('should render a badge or active session indicator when hasActiveSession is true', () => {
    render(
      <BottomNav
        activeTab="routine"
        onTabChange={vi.fn()}
        hasActiveSession={true}
      />
    );

    const sessionBadge = screen.getByTestId('active-session-dot');
    expect(sessionBadge).toBeInTheDocument();
  });
});
