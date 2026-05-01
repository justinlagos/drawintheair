import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface GlowOrbProps {
  x: number;
  y: number;
  size: number;
  color: string;
  startFrame: number;
  pulseSpeed?: number;
  pulseAmount?: number;
  opacity?: number;
  driftAmount?: number;
  driftSpeed?: number;
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  x,
  y,
  size,
  color,
  startFrame,
  pulseSpeed = 0.02,
  pulseAmount = 0.15,
  opacity = 0.3,
  driftAmount = 20,
  driftSpeed = 0.008,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  if (relFrame < 0) return null;

  const fadeIn = interpolate(relFrame, [0, 30], [0, opacity], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Multi-layer pulse for smoother breathing effect
  const pulse = 1 + Math.sin(relFrame * pulseSpeed) * pulseAmount;
  const secondaryPulse = 1 + Math.sin(relFrame * pulseSpeed * 0.5 + Math.PI) * (pulseAmount * 0.5);

  const driftX = Math.sin(relFrame * driftSpeed) * driftAmount;
  const driftY = Math.cos(relFrame * driftSpeed * 0.8) * driftAmount * 0.5;

  const blurAmount = size * 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: x - (size / 2) * pulse,
        top: y - (size / 2) * pulse + driftY,
        width: size * pulse,
        height: size * pulse,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: fadeIn * 0.7,
        filter: `blur(${blurAmount}px)`,
        pointerEvents: "none",
        transform: `translate(${driftX}px, 0)`,
        transition: "none",
      }}
    />
  );
};
