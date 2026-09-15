"use client";

import * as React from "react";

interface Particle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  shape: "circle" | "square" | "sparkle";
  rotation: number;
}

const COLORS = [
  "#a855f7", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#3b82f6", // blue
  "#14b8a6", // teal
];

function generateParticles(count = 14): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Distribute angles predominantly upwards and slightly outward
    const angle = (Math.PI * (i / count) * 2) - Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const distance = 24 + Math.random() * 26; // 24px - 50px (tiny radius)
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 8; // slight upward bias

    const shapes: ("circle" | "square" | "sparkle")[] = ["circle", "square", "sparkle"];
    const shape = shapes[i % shapes.length];

    return {
      id: i,
      dx,
      dy,
      size: shape === "sparkle" ? 10 : 4 + Math.random() * 3,
      color: COLORS[i % COLORS.length],
      shape,
      rotation: Math.random() * 360,
    };
  });
}

interface TimerParticlesProps {
  onComplete?: () => void;
}

export function TimerParticles({ onComplete }: TimerParticlesProps) {
  const [particles] = React.useState(() => generateParticles(16));
  const [isMounted, setIsMounted] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(false);
      onComplete?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isMounted) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      <style>{`
        @keyframes tinyParticleBurst {
          0% {
            transform: translate(0, 0) scale(0.2) rotate(0deg);
            opacity: 1;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0.8) rotate(var(--rot));
            opacity: 0;
          }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rotation}deg`,
              animation: "tinyParticleBurst 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) forwards",
              color: p.color,
            } as React.CSSProperties
          }
        >
          {p.shape === "sparkle" ? (
            <svg
              width={p.size}
              height={p.size}
              viewBox="0 0 24 24"
              fill="currentColor"
              className="drop-shadow-sm"
            >
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          ) : (
            <span
              style={{
                display: "inline-block",
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "9999px" : "1px",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
