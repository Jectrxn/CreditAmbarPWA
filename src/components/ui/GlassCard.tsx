import { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'prominent' | 'interactive';
  glow?: boolean;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const variantStyles: Record<NonNullable<GlassCardProps['variant']>, string> = {
  default: 'glass-card bg-slate-900/60 backdrop-blur-glass-md border-white/10 text-slate-100',
  subtle: 'glass-card bg-slate-900/40 backdrop-blur-glass-sm border-white/5 text-slate-200',
  prominent: 'glass-panel bg-slate-900/80 backdrop-blur-glass-lg border-white/20 text-white',
  interactive: 'glass-card bg-slate-900/60 backdrop-blur-glass-md border-white/10 text-slate-100 cursor-pointer hover:bg-slate-800/70 hover:border-white/25 active:scale-[0.99] transition-all duration-200',
};

const paddingStyles: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      variant = 'default',
      glow = false,
      interactive = false,
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
          'glass-card rounded-2xl border shadow-glass-sm transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          glow && 'shadow-glass-glow border-glass-glow border-indigo-500/40',
          interactive && 'cursor-pointer hover:bg-white/10 hover:border-white/25 hover:shadow-glass-md active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
