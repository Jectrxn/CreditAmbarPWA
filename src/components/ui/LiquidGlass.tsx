import React, { useRef, useState } from 'react';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  displacementScale?: number; // Controls edge distortion intensity (0-250)
  blurAmount?: number;        // Controls backdrop blur intensity (0.0 - 1.0)
  saturation?: number;        // Controls backdrop color saturation (100 - 250%)
  chromaticAberration?: number;// Controls RGB channel separation (0 - 15)
  elasticity?: number;        // Controls how much glass follows cursor (0.0 - 1.0)
  cornerRadius?: number;      // Controls glass corner roundness in px
  borderOpacity?: number;     // Controls opacity of border and specular highlights (0.0 - 1.0)
  children?: React.ReactNode;
  className?: string;
}

/**
 * LiquidGlass Component
 * Recreates authentic Apple Liquid Glass aesthetics with real-time refraction,
 * specular rim reflections, chromatic aberration, and interactive elasticity.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  displacementScale = 35,
  blurAmount = 0.71,
  saturation = 180,
  chromaticAberration = 0,
  elasticity = 0.0,
  cornerRadius = 40,
  borderOpacity = 0.30,
  children,
  className = '',
  style,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('translate3d(0, 0, 0)');

  // Blur Amount 0.71 = ~17px blur, matching calibrated Liquid Glass formula
  const blurPx = Math.max(1, Math.round(blurAmount * 24));

  // Safeguard: Clamp borderOpacity between 0 and 1 to prevent invalid CSS rgba values
  const safeBorderOp = Math.max(0, Math.min(1, Number(borderOpacity) || 0));

  // Displacement Scale Calculations (Simulating the physical convex lens curvature)
  const ringSpread = Math.round((displacementScale / 200) * 18);
  const ringBlur = Math.round((displacementScale / 200) * 28);
  const bevelOpacity = (safeBorderOp * 0.8).toFixed(2);
  const innerDarken = ((displacementScale / 200) * 0.40).toFixed(2);

  // Chromatic Aberration RGB fringe
  const chromaStyle = chromaticAberration > 0
    ? `, -${chromaticAberration}px 0 ${chromaticAberration * 2}px rgba(239, 68, 68, 0.45), ${chromaticAberration}px 0 ${chromaticAberration * 2}px rgba(59, 130, 246, 0.45)`
    : '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (elasticity <= 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const moveX = (x * elasticity * 0.20).toFixed(1);
    const moveY = (y * elasticity * 0.20).toFixed(1);
    const rotateX = (-y * elasticity * 0.06).toFixed(1);
    const rotateY = (x * elasticity * 0.06).toFixed(1);

    setTransformStyle(`translate3d(${moveX}px, ${moveY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle('translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)');
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative will-change-transform ${className}`}
      style={{
        borderRadius: `${cornerRadius}px`,
        transform: transformStyle,
        transition: 'transform 0.08s ease-out, border-radius 0.15s ease',
        ...style,
      }}
      {...props}
    >
      {/* 1. Backdrop Blur & Saturation Layer */}
      <span
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          backdropFilter: `blur(${blurPx}px) saturate(${saturation}%) contrast(106%)`,
          WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation}%) contrast(106%)`,
        }}
      />

      {/* 2. Optical Refraction Groove & Displacement Lens Ring */}
      <span
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          boxShadow: `
            inset 0 0 ${ringBlur}px ${ringSpread}px rgba(0, 0, 0, ${innerDarken}),
            inset 0 0 ${Math.round(ringBlur * 0.6)}px 2px rgba(255, 255, 255, ${bevelOpacity})
            ${chromaStyle}
          `,
        }}
      />

      {/* 3. Surface Tension Ambient Specular Layer */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-[inherit] bg-gradient-to-b from-white/25 via-white/5 to-transparent"
      />

      {/* 4. Specular Rim & Beveled Glass Surface with Multiple Inset Shadows */}
      <span
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          border: `1px solid rgba(255, 255, 255, ${safeBorderOp})`,
          boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.8),
            inset 0 -2px 4px rgba(255, 255, 255, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.25)
          `,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
        }}
      />

      {/* 5. Child Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};
