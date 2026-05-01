import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { COLORS, FONT } from "../utils/colors";
import { SPRING } from "../utils/motion";

interface CinematicTextProps {
  text: string;
  startFrame: number;
  y?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  letterSpacing?: number;
  maxWidth?: number;
  align?: "center" | "left";
  glow?: boolean;
  glowColor?: string;
  delay?: number;
  lineHeight?: number;
}

export const CinematicText: React.FC<CinematicTextProps> = ({
  text,
  startFrame,
  y = 960,
  fontSize = 56,
  fontWeight = 600,
  color = COLORS.textWhite,
  letterSpacing = -0.5,
  maxWidth = 900,
  align = "center",
  glow = false,
  glowColor = COLORS.primaryGlow,
  delay = 0,
  lineHeight = 1.25,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = startFrame + delay;
  const rel = frame - entry;

  if (rel < -5) return null;

  // Spring-based entry
  const p = spring({
    frame: Math.max(0, rel),
    fps,
    config: SPRING.smooth,
  });

  const opacity = interpolate(p, [0, 1], [0, 1]);
  const translateY = interpolate(p, [0, 1], [28, 0]);
  const tracking = interpolate(p, [0, 1], [letterSpacing + 6, letterSpacing], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: align === "center" ? "center" : "flex-start",
        paddingLeft: align === "left" ? 72 : 0,
        paddingRight: 72,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize,
          fontWeight,
          color,
          letterSpacing: tracking,
          lineHeight,
          maxWidth,
          textAlign: align,
          filter: glow ? `drop-shadow(0 0 20px ${glowColor}) drop-shadow(0 0 60px ${glowColor})` : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
};
