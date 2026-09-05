import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App - Master Liquid Glass Card Specification', () => {
  it('renders Master Liquid Glass Card with exact optical parameters', () => {
    const { container } = render(<App />);

    const cardTitle = screen.getByText('Liquid Glass Card');
    expect(cardTitle).toBeInTheDocument();

    // 1. Text drop shadow for legibility
    expect(cardTitle.className).toContain('drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]');

    const cardDesc = screen.getByText(/Bisel direccional con luz cenital/i);
    expect(cardDesc.className).toContain('drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]');

    // Find the card root container
    const cardEl = cardTitle.closest('.rounded-\\[2\\.5rem\\]') as HTMLElement;
    expect(cardEl).toBeInTheDocument();

    // 2. Translucency: 7% white background + calibrated backdrop blur (17px = -29% of standard 24px)
    expect(cardEl.className).toContain('bg-white/[0.07]');
    expect(cardEl.className).toContain('backdrop-blur-[17px]');
    expect(cardEl.className).toContain('backdrop-saturate-[180%]');

    // 3. Directional bezel lighting: bright top, subtle sides/bottom
    expect(cardEl.className).toContain('border-t-white/80');
    expect(cardEl.className).toContain('border-x-white/25');
    expect(cardEl.className).toContain('border-b-white/15');

    // 4. Sharp specular reflection: ultra-fine 1px inset shadow
    expect(cardEl.className).toContain(
      'shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_20px_40px_-15px_rgba(0,0,0,0.2)]'
    );

    // 5. Verify NO milky overlay gradient inside card
    const milkyOverlay = cardEl.querySelector('.from-white\\/18');
    expect(milkyOverlay).toBeNull();

    // 6. Verify 4 indented bottom pills (no outer border, 6% bg, inset shadow)
    const pill1 = screen.getByText('bg-white/[0.07]').closest('div') as HTMLElement;
    const pill2 = screen.getByText('border-t-white/80').closest('div') as HTMLElement;
    const pill3 = screen.getByText('Inset 1px afilado').closest('div') as HTMLElement;
    const pill4 = screen.getByText('Sin bordes ext.').closest('div') as HTMLElement;

    [pill1, pill2, pill3, pill4].forEach((pill) => {
      expect(pill).toBeInTheDocument();
      expect(pill.className).toContain('bg-white/[0.06]');
      expect(pill.className).toContain('shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]');
      expect(pill.className).toContain('border-0');
    });

    // 7. Verify NO outer p-1 yellow-green gradient bumper wrapper
    const outerBumper = container.querySelector('.p-1.bg-gradient-to-r');
    expect(outerBumper).toBeNull();
  });
});
