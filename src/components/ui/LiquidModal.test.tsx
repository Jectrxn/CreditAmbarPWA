import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiquidModal } from './LiquidModal';
import { GlassCard } from './GlassCard';

describe('LiquidModal & GlassCard UI Components', () => {
  describe('LiquidModal', () => {
    it('should not render anything when isOpen is false', () => {
      render(
        <LiquidModal isOpen={false} onClose={() => {}}>
          <p>Hidden Content</p>
        </LiquidModal>
      );
      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    });

    it('should render modal content, title, and backdrop when isOpen is true', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          title="Cobro Fiado"
          data-testid="liquid-modal"
        >
          <p>Contenido del modal</p>
        </LiquidModal>
      );

      expect(screen.getByText('Cobro Fiado')).toBeInTheDocument();
      expect(screen.getByText('Contenido del modal')).toBeInTheDocument();

      // Backdrop check
      const backdrop = screen.getByTestId('liquid-modal-backdrop');
      expect(backdrop).toBeInTheDocument();
      // Should include fallback color and glass backdrop blur classes
      expect(backdrop.className).toMatch(/backdrop-blur/);
      expect(backdrop.className).toMatch(/bg-slate/);
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal Body</p>
        </LiquidModal>
      );

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked if closeOnBackdropClick is true', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={true}
        >
          <p>Body</p>
        </LiquidModal>
      );

      const backdrop = screen.getByTestId('liquid-modal-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when modal container itself is clicked', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={true}
        >
          <p>Body Click</p>
        </LiquidModal>
      );

      const content = screen.getByText('Body Click');
      fireEvent.click(content);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should call onClose on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <LiquidModal isOpen={true} onClose={handleClose}>
          <p>Escape Test</p>
        </LiquidModal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should support responsive orientation reflow classes', () => {
      render(
        <LiquidModal isOpen={true} onClose={() => {}} title="Orientation Reflow">
          <p>Orientation content</p>
        </LiquidModal>
      );

      const container = screen.getByTestId('liquid-modal-container');
      // Should contain responsive classes for landscape & max height handling
      expect(container.className).toMatch(/max-h-/);
      expect(container.className).toMatch(/glass-panel|glass-card|backdrop-blur/);
    });
  });

  describe('GlassCard', () => {
    it('should render children and apply glass classes', () => {
      render(
        <GlassCard data-testid="glass-card">
          <span>Tarjeta Vidrio</span>
        </GlassCard>
      );

      const card = screen.getByTestId('glass-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('Tarjeta Vidrio')).toBeInTheDocument();
      expect(card.className).toMatch(/glass-card/);
    });

    it('should apply interactive hover and glow styles when configured', () => {
      render(
        <GlassCard data-testid="glow-card" glow interactive>
          <span>Glow Card</span>
        </GlassCard>
      );

      const card = screen.getByTestId('glow-card');
      expect(card.className).toMatch(/shadow-glass-glow|border-glass-glow/);
    });

    it('should handle onClick callback when interactive', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard data-testid="click-card" onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );

      fireEvent.click(screen.getByTestId('click-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
