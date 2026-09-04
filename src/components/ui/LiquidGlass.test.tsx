import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LiquidGlass } from './LiquidGlass';

describe('LiquidGlass Component', () => {
  it('renders children correctly', () => {
    render(
      <LiquidGlass>
        <div data-testid="child-content">Liquid Content</div>
      </LiquidGlass>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('applies custom corner radius and saturation', () => {
    const { container } = render(
      <LiquidGlass cornerRadius={42} saturation={180}>
        <span>Card</span>
      </LiquidGlass>
    );
    const glassEl = container.firstChild as HTMLElement;
    expect(glassEl.style.borderRadius).toBe('42px');
    
    // Check warp span element for backdrop filter
    const warpSpan = glassEl.querySelector('span') as HTMLElement;
    expect(warpSpan.style.backdropFilter).toContain('saturate(180%)');
  });

  it('handles mouse movements with elasticity', () => {
    const { container } = render(
      <LiquidGlass elasticity={0.5}>
        <span>Interactive</span>
      </LiquidGlass>
    );
    const glassEl = container.firstChild as HTMLElement;
    fireEvent.mouseMove(glassEl, { clientX: 100, clientY: 100 });
    expect(glassEl.style.transform).toContain('translate3d');

    fireEvent.mouseLeave(glassEl);
    expect(glassEl.style.transform).toBe('translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)');
  });
});
