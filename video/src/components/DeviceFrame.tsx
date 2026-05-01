import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { COLORS } from "../utils/colors";

interface DeviceFrameProps {
  startFrame: number;
  type: "laptop" | "chromebook";
  x?: number;
  y?: number;
  scale?: number;
  children?: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  startFrame,
  type,
  x = 540,
  y = 960,
  scale = 1,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - startFrame;
  if (relFrame < -5) return null;

  const entryProgress = spring({
    frame: Math.max(0, relFrame),
    fps,
    config: { damping: 18, stiffness: 80, mass: 1 },
  });

  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);
  const translateY = interpolate(entryProgress, [0, 1], [80, 0]);
  const scaleAnim = interpolate(entryProgress, [0, 1], [0.85, 1]);

  const screenW = type === "laptop" ? 680 : 600;
  const screenH = type === "laptop" ? 440 : 380;
  const bezelR = 16;
  const baseH = type === "laptop" ? 20 : 16;

  return (
    <div
      style={{
        position: "absolute",
        left: x - (screenW * scale) / 2,
        top: y - (screenH * scale) / 2 + translateY,
        opacity,
        transform: `scale(${scale * scaleAnim})`,
        transformOrigin: "center center",
      }}
    >
      {/* Screen bezel */}
      <div
        style={{
          width: screenW,
          height: screenH,
          borderRadius: bezelR,
          background: COLORS.bgNavy,
          border: `2px solid ${COLORS.lineBright}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Screen content */}
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            background: COLORS.bgDeep,
          }}
        >
          {children}
        </div>
        {/* Camera dot */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: COLORS.textMuted,
          }}
        />
      </div>
      {/* Base */}
      <div
        style={{
          width: screenW + 40,
          height: baseH,
          marginLeft: -20,
          borderRadius: `0 0 ${bezelR}px ${bezelR}px`,
          background: `linear-gradient(180deg, ${COLORS.lineBright}, ${COLORS.lineSubtle})`,
        }}
      />
      {/* Label */}
      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          fontFamily: "SF Pro Display, sans-serif",
          fontSize: 20,
          color: COLORS.textMuted,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {type === "laptop" ? "Any Laptop" : "Chromebook"}
      </div>
    </div>
  );
};
