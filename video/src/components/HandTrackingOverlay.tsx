import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS } from "../utils/colors";

interface HandTrackingOverlayProps {
  startFrame: number;
  exitFrame?: number;
  fingerTipX: number;
  fingerTipY: number;
}

function generateHandLandmarks(tipX: number, tipY: number, frame: number) {
  const w = Math.sin(frame * 0.05) * 3;
  return [
    { x: tipX + 40, y: tipY + 280 + w },
    { x: tipX + 30, y: tipY + 220 + w },
    { x: tipX + 20, y: tipY + 180 + w },
    { x: tipX + 10, y: tipY + 100 + w },
    { x: tipX + 5, y: tipY + 50 + w },
    { x: tipX, y: tipY },
    { x: tipX + 25, y: tipY + 60 + w },
    { x: tipX + 40, y: tipY + 80 + w },
    { x: tipX + 55, y: tipY + 100 + w },
    { x: tipX + 65, y: tipY + 130 + w },
  ];
}

const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [2, 6], [6, 7], [7, 8], [8, 9],
];

export const HandTrackingOverlay: React.FC<HandTrackingOverlayProps> = ({
  startFrame,
  exitFrame,
  fingerTipX,
  fingerTipY,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  if (rel < 0) return null;

  const entryOp = interpolate(rel, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  let exitOp = 1;
  if (exitFrame !== undefined && frame >= exitFrame) {
    exitOp = interpolate(frame - exitFrame, [0, 15], [1, 0], { extrapolateRight: "clamp" });
  }

  const opacity = entryOp * exitOp;
  const landmarks = generateHandLandmarks(fingerTipX, fingerTipY, frame);

  return (
    <svg width="1080" height="1920" style={{ position: "absolute", top: 0, left: 0, opacity }}>
      {connections.map(([a, b], i) => (
        <line key={i} x1={landmarks[a].x} y1={landmarks[a].y} x2={landmarks[b].x} y2={landmarks[b].y} stroke={COLORS.primary} strokeWidth={2} opacity={0.5} />
      ))}
      {landmarks.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={i === 5 ? 8 : 4} fill={i === 5 ? COLORS.gold : COLORS.primary} opacity={i === 5 ? 1 : 0.7} />
      ))}
      <circle cx={landmarks[5].x} cy={landmarks[5].y} r={20} fill="none" stroke={COLORS.gold} strokeWidth={2} opacity={0.4 + Math.sin(frame * 0.1) * 0.2} />
      <circle cx={landmarks[5].x} cy={landmarks[5].y} r={35} fill="none" stroke={COLORS.goldGlow} strokeWidth={1} opacity={0.2} />
    </svg>
  );
};
