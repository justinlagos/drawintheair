import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS } from "../utils/colors";

interface Point {
  x: number;
  y: number;
}

interface TraceLineProps {
  points: Point[];
  startFrame: number;
  duration: number;
  color?: string;
  strokeWidth?: number;
  glow?: boolean;
  easing?: (progress: number) => number;
  tipSize?: number;
}

export const TraceLine: React.FC<TraceLineProps> = ({
  points,
  startFrame,
  duration,
  color = COLORS.primary,
  strokeWidth = 6,
  glow = true,
  easing = Easing.inOut(Easing.cubic),
  tipSize = 2,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  if (relFrame < 0 || points.length < 2) return null;

  // Pre-compute path and length metrics
  const { pathD, totalLength, getTipAtProgress } = useMemo(() => {
    // Build smooth cubic Bezier path
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;

      // Calculate control points for smooth curve
      const cpx1 = prev.x + (curr.x - (points[i - 2]?.x ?? prev.x)) * 0.2;
      const cpy1 = prev.y + (curr.y - (points[i - 2]?.y ?? prev.y)) * 0.2;
      const cpx2 = curr.x - (next.x - prev.x) * 0.2;
      const cpy2 = curr.y - (next.y - prev.y) * 0.2;

      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    // Calculate approximate total length
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    length *= 1.25; // Curve length approximation factor

    // Calculate tip position at given progress
    const getTipAtProgress = (p: number): Point => {
      const idx = Math.min(Math.floor(p * (points.length - 1)), points.length - 2);
      const t = (p * (points.length - 1)) - idx;
      return {
        x: points[idx].x + (points[idx + 1].x - points[idx].x) * t,
        y: points[idx].y + (points[idx + 1].y - points[idx].y) * t,
      };
    };

    return { pathD: d, totalLength: length, getTipAtProgress };
  }, [points]);

  const progress = interpolate(relFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const visibleLength = totalLength * progress;
  const hiddenLength = totalLength - visibleLength;
  const tip = getTipAtProgress(progress);

  return (
    <svg
      width="1080"
      height="1920"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
      viewBox="0 0 1080 1920"
    >
      <defs>
        {glow && (
          <>
            <filter id="traceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
            </filter>
            <filter id="traceTipGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </>
        )}
      </defs>

      {/* Glow layer (wider, softer) */}
      {glow && (
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${visibleLength} ${hiddenLength}`}
          opacity={0.2}
          filter="url(#traceGlow)"
        />
      )}

      {/* Main stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${visibleLength} ${hiddenLength}`}
        opacity={0.95}
      />

      {/* Animated tip dot */}
      {progress > 0.02 && progress < 0.98 && (
        <circle
          cx={tip.x}
          cy={tip.y}
          r={strokeWidth * tipSize}
          fill={color}
          opacity={0.9}
          filter={glow ? "url(#traceTipGlow)" : undefined}
        />
      )}
    </svg>
  );
};
