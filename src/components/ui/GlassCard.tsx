import { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'prominent' | 'interactive' | 'liquid';
  glow?: boolean;
  interactive?: boolean;
  specularHighlight?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const variantStyles: Record<NonNullable<GlassCardProps['variant']>, string> = {
  default:
    'glass-card bg-white/[0.08] backdrop-blur-[17px] backdrop-saturate-[180%] border border-t-white/80 border-x-white/25 border-b-white/15 text-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_20px_40px_-15px_rgba(15,23,42,0.15)]',
  liquid:
    'glass-card bg-white/[0.07] backdrop-blur-[17px] backdrop-saturate-[180%] border border-t-white/80 border-x-white/25 border-b-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_20px_40px_-15px_rgba(0,0,0,0.20)]',
  subtle:
    'glass-card bg-white/[0.05] backdrop-blur-[17px] backdrop-saturate-[160%] border border-t-white/60 border-x-white/20 border-b-white/10 text-slate-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_28px_-6px_rgba(0,0,0,0.10)]',
  prominent:
    'glass-panel bg-white/[0.12] backdrop-blur-[17px] backdrop-saturate-[180%] border border-t-white/90 border-x-white/35 border-b-white/20 text-slate-900 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_2px_rgba(0,0,0,0.12),0_25px_50px_-12px_rgba(15,23,42,0.22)]',
  interactive:
    'glass-card bg-white/[0.08] backdrop-blur-[17px] backdrop-saturate-[180%] border border-t-white/80 border-x-white/25 border-b-white/15 text-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.1),0_20px_40px_-15px_rgba(15,23,42,0.15)] cursor-pointer hover:bg-white/[0.14] hover:border-t-white hover:scale-[1.01] active:scale-[0.99] transition-all duration-200',
};

const paddingStyles: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3.5',
  md: 'p-6',
  lg: 'p-8',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      variant = 'default',
      glow = false,
      interactive = false,
      specularHighlight = true,
      padding = 'md',
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-testid={testId}
        className={twMerge(
          'glass-card relative overflow-hidden rounded-[2.5rem] border transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          glow && 'shadow-glass-glow border-glass-glow border-indigo-500/40',
          interactive && 'cursor-pointer hover:border-white/50 hover:shadow-glass-md active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {/* Contenido */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
