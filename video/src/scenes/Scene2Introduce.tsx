import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";
import { COLORS, FONT } from "../utils/colors";
import { SPRING, fadeIn, slideUp, kenBurns, progress, stagger } from "../utils/motion";
import { ASSETS } from "../utils/layout";
import { CinematicText } from "../components/CinematicText";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";
import { TraceLine } from "../components/TraceLine";

/**
 * Scene 2 – Product Introduction (5–12 seconds / frames 0–210 relative)
 * Show laptop with child, hand raises to webcam, letter B traces in air with glow.
 * "Meet Draw in the Air. Your webcam becomes a learning tool."
 * 9:16 vertical format optimized.
 */

// Letter B trace points (centered, optimized for vertical screen)
const letterBPoints = [
  { x: 400, y: 700 },
  { x: 400, y: 900 },
  { x: 400, y: 1100 },
  { x: 560, y: 1100 },
  { x: 590, y: 1050 },
  { x: 590, y: 1000 },
  { x: 560, y: 950 },
  { x: 400, y: 950 },
  { x: 560, y: 950 },
  { x: 600, y: 900 },
  { x: 600, y: 800 },
  { x: 560, y: 750 },
  { x: 400, y: 750 },
];

export const Scene2Introduce: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Entry fade from previous scene
  const entryFade = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Background photo with Ken Burns
  const photoScale = kenBurns(frame, 0, 210, 1.0, 1.1);
  const photoOpacity = interpolate(frame, [5, 35, 170, 210], [0, 0.45, 0.45, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Device frame spring entry
  const deviceEntry = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: SPRING.smooth,
  });

  const deviceY = interpolate(deviceEntry, [0, 1], [80, 0]);
  const deviceScale = interpolate(deviceEntry, [0, 1], [0.88, 1]);
  const deviceOpacity = interpolate(deviceEntry, [0, 1], [0, 1]);

  // Title text entry
  const titleEntry = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: SPRING.smooth,
  });

  const titleY = interpolate(titleEntry, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleEntry, [0, 0.6, 1], [0, 0, 1]);

  // Caption text entry (staggered)
  const captionEntry = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: SPRING.smooth,
  });

  const captionY = interpolate(captionEntry, [0, 1], [80, 0]);
  const captionOpacity = interpolate(captionEntry, [0, 0.5, 1], [0, 0, 1]);

  // Letter trace timing
  const traceProgress = interpolate(frame, [80, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse intensity
  const glowPulse = interpolate(frame, [80, 130], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) +
    Math.sin(frame * 0.08) * 0.15;

  // Exit fade
  const exitFade = interpolate(frame, [185, 210], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Base gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: entryFade * exitFade,
        }}
      />

      {/* Background lifestyle photo */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          opacity: photoOpacity * exitFade,
        }}
      >
        <Img
          src={staticFile("child-at-laptop.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${photoScale})`,
            filter: "brightness(0.48) saturate(1.2) contrast(1.05)",
          }}
        />
      </div>

      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(180deg, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.35) 30%, rgba(8,12,24,0.65) 65%, rgba(8,12,24,0.92) 100%)",
          opacity: exitFade,
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow orbs */}
      <GlowOrb
        x={width * 0.5}
        y={height * 0.45}
        size={550}
        color={COLORS.primaryGlow}
        startFrame={10}
        opacity={0.09}
      />
      <GlowOrb
        x={width * 0.75}
        y={height * 0.7}
        size={380}
        color="rgba(167,139,250,0.12)"
        startFrame={20}
        opacity={0.05}
      />

      {/* Particle field */}
      <ParticleField
        startFrame={15}
        count={20}
        seed={99}
        opacity={0.3 * exitFade}
      />

      {/* Title section – "Meet Draw in the Air" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "10%",
          transform: `translateX(-50%) translateY(${titleY}px)`,
          opacity: Math.min(entryFade, titleOpacity) * exitFade,
          textAlign: "center",
          width: "85%",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 300,
            color: COLORS.textSoft,
            letterSpacing: 3,
            marginBottom: 8,
            fontFamily: FONT.display,
            opacity: 0.85,
          }}
        >
          MEET
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: COLORS.textWhite,
            letterSpacing: -1.2,
            lineHeight: 1.05,
            fontFamily: FONT.display,
            textShadow: `0 0 24px ${COLORS.primaryGlow}, 0 0 48px rgba(139, 92, 246, 0.25)`,
          }}
        >
          Draw in<br />the Air
        </div>
      </div>

      {/* Simulated device showing hand tracking */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "28%",
          transform: `translateX(-50%) translateY(${deviceY}px) scale(${deviceScale})`,
          opacity: deviceOpacity * exitFade,
        }}
      >
        {/* Laptop screen frame */}
        <div
          style={{
            width: 760,
            height: 480,
            borderRadius: 18,
            overflow: "hidden",
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.lineBright}`,
            boxShadow: `0 24px 96px rgba(0,0,0,0.7), 0 0 48px ${COLORS.primaryGlow}80`,
          }}
        >
          <Img
            src={staticFile("hand-tracking.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Overlay: glowing letter trace on device */}
          {frame >= 70 && frame <= 195 && (
            <svg
              width={760}
              height={480}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: Math.min(traceProgress, 1),
              }}
            >
              <defs>
                <filter id="traceGlow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Letter B trace with glow */}
              <path
                d={`M ${letterBPoints[0].x} ${letterBPoints[0].y} ${letterBPoints
                  .slice(0, Math.ceil(traceProgress * letterBPoints.length))
                  .map((p) => `L ${p.x} ${p.y}`)
                  .join(" ")}`}
                stroke={COLORS.gold}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8 * glowPulse}
                filter="url(#traceGlow)"
              />

              {/* Trace glow layer */}
              <path
                d={`M ${letterBPoints[0].x} ${letterBPoints[0].y} ${letterBPoints
                  .slice(0, Math.ceil(traceProgress * letterBPoints.length))
                  .map((p) => `L ${p.x} ${p.y}`)
                  .join(" ")}`}
                stroke={COLORS.primaryGlow}
                strokeWidth={20}
                fill="none"
                strokeLinecap="round"
                opacity={0.3 * glowPulse}
                filter="url(#traceGlow)"
              />
            </svg>
          )}
        </div>

        {/* Laptop base/stand */}
        <div
          style={{
            width: 820,
            height: 16,
            marginLeft: -30,
            marginTop: -2,
            borderRadius: "0 0 12px 12px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      {/* Bottom caption text */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "8%",
          transform: `translateX(-50%) translateY(${captionY}px)`,
          opacity: Math.min(entryFade, captionOpacity) * exitFade,
          textAlign: "center",
          width: "88%",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: COLORS.textSoft,
            letterSpacing: 0.3,
            lineHeight: 1.3,
            fontFamily: FONT.display,
          }}
        >
          Your webcam<br />
          becomes a learning tool.
        </div>
      </div>

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
          opacity: 0.6 * exitFade,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
