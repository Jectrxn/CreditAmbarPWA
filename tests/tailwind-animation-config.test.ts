import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config.js';

/**
 * Regression guard for the dead-animation defect.
 *
 * The app uses Tailwind Animate utilities (`animate-in`, `fade-in`, `zoom-in-*`,
 * `slide-in-from-*`, `fill-mode-both`) in TabBar, LiquidModal, CashierLoginModal and
 * HomePage. Tailwind core has NO `animate-in` utility — these come from the
 * `tailwindcss-animate` plugin. When that plugin is missing from `plugins`, every one
 * of those classes silently compiles to nothing and each modal, toast, badge and
 * Speed Dial orb pops in with no motion at all.
 *
 * These tests compile the real `tailwind.config.js` and assert the utilities actually
 * emit CSS, so removing the plugin fails loudly instead of silently killing motion.
 */
const compile = async (markup: string): Promise<string> => {
  const result = await postcss([
    tailwindcss({
      ...(tailwindConfig as Record<string, unknown>),
      content: [{ raw: markup, extension: 'html' }],
    } as never),
  ]).process('@tailwind utilities;', { from: undefined });

  return result.css;
};

describe('Tailwind animation utilities compile (Strict TDD)', () => {
  it('emits real CSS for the enter/exit utilities used across the app', async () => {
    const css = await compile(
      '<div class="animate-in animate-out fade-in fade-out zoom-in-50 zoom-in-95 ' +
        'slide-in-from-bottom-8 slide-in-from-bottom-12 slide-in-from-top-3 fill-mode-both"></div>'
    );

    for (const utility of [
      'animate-in',
      'animate-out',
      'fade-in',
      'fade-out',
      'zoom-in-50',
      'zoom-in-95',
      'slide-in-from-bottom-8',
      'slide-in-from-bottom-12',
      'slide-in-from-top-3',
      'fill-mode-both',
    ]) {
      expect(css, `Expected .${utility} to compile to real CSS`).toContain(utility);
    }
  }, 30000);

  it('still emits core Tailwind animation utilities', async () => {
    const css = await compile('<div class="animate-spin animate-pulse"></div>');

    expect(css).toContain('animate-spin');
    expect(css).toContain('animate-pulse');
  }, 30000);
});
