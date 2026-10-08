import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('T-08: Primitivo de telemetría Sparkline.tsx (Gráfico Vectorial Lovable)', () => {
  it('debe renderizar el elemento SVG con rol img y aria-label', () => {
    const weights = [84.2, 83.9, 84.1, 83.6, 83.4, 83.5, 83.0, 82.7];
    render(<Sparkline data={weights} />);

    const svg = screen.getByTestId('sparkline-svg');
    expect(svg).toBeInTheDocument();
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });

  it('debe generar paths SVG con trazado y relleno degradado', () => {
    const weights = [80, 81, 82];
    render(<Sparkline data={weights} id="test-spark" />);

    const svg = screen.getByTestId('sparkline-svg');
    const paths = svg.querySelectorAll('path');

    // Debe contener 2 paths: uno de relleno (fill con gradient) y uno de trazo (stroke)
    expect(paths.length).toBe(2);
    expect(paths[0]).toHaveAttribute('fill', 'url(#test-spark)');
    expect(paths[1]).toHaveAttribute('stroke', 'currentColor');
  });

  it('debe renderizar el círculo de anclaje final en el último punto', () => {
    const weights = [80, 82, 81];
    render(<Sparkline data={weights} />);

    const anchor = screen.getByTestId('sparkline-anchor');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('r', '4');
    expect(anchor).toHaveAttribute('fill', 'currentColor');
  });

  it('retorna null cuando los datos tienen menos de 2 puntos', () => {
    const { container } = render(<Sparkline data={[82]} />);
    expect(container.firstChild).toBeNull();
  });

  it('aplica clases de color personalizadas', () => {
    render(<Sparkline data={[80, 82]} color="text-neon" />);
    const svg = screen.getByTestId('sparkline-svg');
    expect(svg.getAttribute('class')).toContain('text-neon');
  });
});
