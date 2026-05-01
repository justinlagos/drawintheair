import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS } from "../utils/colors";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  baseOpacity: number;
  delay: number;
  phase: number;
}

interface ParticleFieldProps {
  count?: number;
  startFrame: number;
  duration?: number;
  color?: string;
  seed?: number;
  opacity?: number;
}

/**
 * LCG pseudo-random generator for deterministic particle generation
 * Ensures consistent particle placement across renders
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 40,
  startFrame,
  duration = 40,
  color = COLORS.primary,
  seed = 42,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  // Generate particles once per seed/count combination
  const particles = useMemo<Particle[]>(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: rng() * 1080,
      y: rng() * 1920,
      size: rng() * 3.5 + 0.8,
      speed: rng() * 0.35 + 0.15,
      baseOpacity: rng() * 0.5 + 0.15,
      delay: rng() * 25,
      phase: rng() * Math.PI * 2,
    }));
  }, [count, seed]);

  if (relFrame < 0) return null;

  // Fade in field over specified duration
  const fieldOpacity = interpolate(relFrame, [0, duration], [0, opacity], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <svg
      width="1080"
      height="1920"
      viewBox="0 0 1080 1920"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        opacity: fieldOpacity,
      }}
    >
      {particles.map((p, i) => {
        // Stagger particle entrance
        const particleFrame = Math.max(0, relFrame - p.delay);

        // Smooth upward motion with wrapping
        const traveled = particleFrame * p.speed * 0.25;
        const y = ((p.y - traveled) % 1920 + 1920) % 1920;

        // Organic twinkle using particle's unique phase
        const twinkle = 0.6 + Math.sin(particleFrame * 0.04 + p.phase) * 0.4;

        // Horizontal drift for organic feel
        const driftX = Math.sin(particleFrame * 0.01 + p.phase) * 8;

        return (
          <circle
            key={`particle-${i}`}
            cx={p.x + driftX}
            cy={y}
            r={p.size}
            fill={color}
            opacity={p.baseOpacity * twinkle}
          />
        );
      })}
    </svg>
  );
};
