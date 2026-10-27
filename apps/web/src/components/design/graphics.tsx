import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Hand-made SVG graphics. Colours come from the direction's CSS variables (passed as `fill`),
 * outlines from --ink, so every shape follows the chosen look and the dark theme.
 * Decorative: hidden from screen readers unless they carry text.
 */

type Shape = { className?: string; fill?: string; style?: CSSProperties };
const ink = 'var(--ink)';
const stroke = { stroke: ink, strokeWidth: 'var(--bw)', strokeLinejoin: 'round' as const };

/** A starburst badge. Children are shown in the middle (e.g. "100 free credits"). */
export function Burst({
  points = 14,
  fill = 'var(--c3)',
  className,
  style,
  children,
}: Shape & { points?: number; children?: ReactNode }) {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 39;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ color: 'var(--on-c)', ...style }}
    >
      <svg aria-hidden viewBox="-2 -2 104 104" className="absolute inset-0 size-full">
        <polygon points={pts} style={{ fill, ...stroke }} />
      </svg>
      {children && <div className="relative px-[18%] text-center">{children}</div>}
    </div>
  );
}

export function Flower({ fill = 'var(--c4)', className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="-2 -2 104 104" className={className} style={style}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8;
        return (
          <circle
            key={i}
            cx={50 + 27 * Math.cos(a)}
            cy={50 + 27 * Math.sin(a)}
            r="19"
            style={{ fill, ...stroke }}
          />
        );
      })}
      <circle cx="50" cy="50" r="17" style={{ fill: 'var(--c3)', ...stroke }} />
    </svg>
  );
}

export function Sparkle({ fill = 'var(--red)', className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="-4 -4 108 108" className={className} style={style}>
      <path
        d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0Z"
        style={{ fill, ...stroke }}
      />
    </svg>
  );
}

export function Smiley({ fill = 'var(--c3)', className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="-3 -3 106 106" className={className} style={style}>
      <circle cx="50" cy="50" r="48" style={{ fill, ...stroke }} />
      <ellipse cx="35" cy="40" rx="5" ry="8" style={{ fill: ink }} />
      <ellipse cx="65" cy="40" rx="5" ry="8" style={{ fill: ink }} />
      <path
        d="M28 60 Q50 82 72 60"
        style={{ fill: 'none', stroke: ink, strokeWidth: 6, strokeLinecap: 'round' }}
      />
    </svg>
  );
}

export function Star({ fill = 'var(--green)', className, style }: Shape) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 22;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${52 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <svg aria-hidden viewBox="-3 -3 106 106" className={className} style={style}>
      <polygon points={pts} style={{ fill, ...stroke }} />
    </svg>
  );
}

export function Blob({ fill = 'var(--c4)', className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className} style={style}>
      <path
        d="M44.7,-58.6C58.2,-50.3,69.6,-37.4,74.5,-22.2C79.3,-7,77.7,10.6,70.5,25.1C63.3,39.6,50.6,51,36.3,60.4C22,69.8,6.1,77.2,-10.9,78.3C-27.9,79.4,-46,74.2,-57.8,62.5C-69.6,50.8,-75.1,32.6,-76.5,14.8C-77.9,-3,-75.1,-20.4,-66.4,-33.6C-57.7,-46.8,-43,-55.8,-28.4,-63.6C-13.8,-71.5,0.6,-78.2,15.1,-77.1C29.6,-76,31.2,-66.9,44.7,-58.6Z"
        transform="translate(100 100)"
        style={{ fill }}
      />
    </svg>
  );
}

/** A hand-drawn arrow, for handwritten notes. */
export function CurvedArrow({ className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="0 0 120 80" fill="none" className={className} style={style}>
      <path
        d="M6 70 C 30 20, 70 10, 108 22"
        style={{ stroke: ink, strokeWidth: 4, strokeLinecap: 'round' }}
      />
      <path
        d="M92 10 L110 22 L94 36"
        style={{ stroke: ink, strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      />
    </svg>
  );
}

/** A looping line that draws itself once when it appears. */
export function Squiggle({
  className,
  color = 'var(--red)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 800 260" fill="none" className={cn('dz-draw', className)}>
      <path
        pathLength={1}
        d="M10 230 C 140 250, 230 120, 360 150 C 470 175, 520 60, 440 40 C 370 25, 340 120, 440 160 C 560 210, 650 120, 790 30"
        style={{ stroke: color, strokeWidth: 14, strokeLinecap: 'round' }}
      />
    </svg>
  );
}

export function Spiral({
  className,
  color = 'var(--green)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" fill="none" className={className}>
      <path
        d="M50 50 m0 0 a4 4 0 1 1 8 0 a12 12 0 1 1 -20 0 a20 20 0 1 1 32 0 a28 28 0 1 1 -44 0"
        style={{ stroke: color, strokeWidth: 6, strokeLinecap: 'round' }}
      />
    </svg>
  );
}

/** An open book: the course icon. */
export function Book({ fill = 'var(--surface)', className, style }: Shape) {
  return (
    <svg aria-hidden viewBox="-4 -4 108 88" className={className} style={style}>
      <path d="M50 14 C35 4 15 4 2 8 V74 C15 70 35 70 50 80Z" style={{ fill, ...stroke }} />
      <path d="M50 14 C65 4 85 4 98 8 V74 C85 70 65 70 50 80Z" style={{ fill, ...stroke }} />
      <path
        d="M14 24 H38 M14 36 H38 M62 24 H86 M62 36 H86"
        style={{ stroke: ink, strokeWidth: 3 }}
      />
    </svg>
  );
}
