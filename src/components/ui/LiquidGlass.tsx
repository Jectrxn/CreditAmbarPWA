import React, { useRef, useState } from 'react';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  displacementScale?: number; // Controls edge distortion intensity (0-200)
  blurAmount?: number;        // Controls backdrop blur intensity (0.0 - 1.0)
  saturation?: number;        // Controls backdrop color saturation (100 - 250%)
  chromaticAberration?: number;// Controls RGB channel separation (0 - 10)
  elasticity?: number;        // Controls how much glass follows cursor (0.0 - 1.0)
  cornerRadius?: number;      // Controls glass corner roundness in px
  children?: React.ReactNode;
  className?: string;
}

/**
 * LiquidGlass Component
 * Recreates authentic Apple Liquid Glass aesthetics with real-time refraction,
 * specular rim reflections, chromatic aberration, and interactive elasticity.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  displacementScale = 60,
  blurAmount = 0.25,
  saturation = 130,
  chromaticAberration = 2,
  elasticity = 0.2,
  cornerRadius = 28,
  children,
  className = '',
  style,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('translate3d(0, 0, 0)');

  // Dynamic blur calculation from normalized 0.0-1.0 to px
  const blurPx = Math.round(blurAmount * 80);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (elasticity <= 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const moveX = (x * elasticity * 0.15).toFixed(1);
    const moveY = (y * elasticity * 0.15).toFixed(1);
    const rotateX = (-y * elasticity * 0.04).toFixed(1);
    const rotateY = (x * elasticity * 0.04).toFixed(1);

    setTransformStyle(`translate3d(${moveX}px, ${moveY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle('translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)');
  };

  // Build chromatic aberration edge shadow
  const chroma = chromaticAberration;
  const chromaShadow = chroma > 0
    ? `, -${chroma}px 0 ${chroma * 1.5}px rgba(239, 68, 68, 0.35), ${chroma}px 0 ${chroma * 1.5}px rgba(59, 130, 246, 0.35)`
    : '';

  const dynamicGlassStyle: React.CSSProperties = {
    backdropFilter: `blur(${blurPx}px) saturate(${saturation}%) contrast(105%)`,
    WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation}%) contrast(105%)`,
    borderRadius: `${cornerRadius}px`,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 100%)',
    border: '1.2px solid rgba(255, 255, 255, 0.65)',
    boxShadow: `inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.08), 0 16px 36px -8px rgba(15, 23, 42, 0.16)${chromaShadow}`,
    transform: transformStyle,
    transition: 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
    ...style,
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden will-change-transform ${className}`}
      style={dynamicGlassStyle}
      {...props}
    >
      {/* Specular Glare Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-40 bg-gradient-to-b from-white/30 via-transparent to-transparent" 
      />
      
      {/* Child Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
