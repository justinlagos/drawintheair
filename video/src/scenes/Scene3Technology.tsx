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
import { CinematicText } from "../components/CinematicText";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

/**
 * Scene 3 – Letter Tracing (frames 0–240, 8 seconds)
 * Show the tracing experience with product screenshot and feature highlights
 */
export const Scene3Technology: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry and exit animations
  const entryFade = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const exitFade = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Screenshot reveal animation
  const screenEntry = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: SPRING.smooth,
  });

  const screenY = interpolate(screenEntry, [0, 1], [60, 0]);
  const screenScale = interpolate(screenEntry, [0, 1], [0.92, 1]);
  const screenOpacity = interpolate(screenEntry, [0, 1], [0, 1]) * exitFade;

  // Feature pills with staggered entrance
  const features = [
    { text: "No tablet.", color: COLORS.primary },
    { text: "No stylus.", color: COLORS.primary },
    { text: "No downloads.", color: COLORS.primary },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: entryFade * exitFade,
        }}
      />

      {/* Ambient effects */}
      <GlowOrb
        x={540}
        y={960}
        size={600}
        color={COLORS.primaryGlow}
        startFrame={5}
        opacity={0.12}
      />
      <ParticleField
        startFrame={10}
        count={22}
        seed={73}
        opacity={0.4 * exitFade}
      />

      {/* Main title */}
      <CinematicText
        text="Trace letters in the air."
        startFrame={15}
        y={240}
        fontSize={56}
        fontWeight={700}
        color={COLORS.textWhite}
        letterSpacing={-0.6}
        glow
        glowColor={COLORS.primaryGlow}
      />

      {/* Product screenshot container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 480,
          transform: `translateX(-50%) translateY(${screenY}px) scale(${screenScale})`,
          opacity: screenOpacity,
        }}
      >
        {/* Device frame */}
        <div
          style={{
            width: 840,
            height: 520,
            borderRadius: 20,
            overflow: "hidden",
            border: `1.5px solid ${COLORS.lineBright}`,
            boxShadow: `0 20px 70px rgba(0,0,0,0.6), 0 0 40px ${COLORS.primaryGlow}40`,
            backgroundColor: "#000",
          }}
        >
          <Img
            src={staticFile("tracing-letter.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        {/* Device base */}
        <div
          style={{
            width: 900,
            height: 14,
            marginLeft: -30,
            borderRadius: "0 0 10px 10px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
          }}
        />
      </div>

      {/* Feature pills row */}
      <div
        style={{
          position: "absolute",
          bottom: 420,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16,
          opacity: exitFade,
        }}
      >
        {features.map((feature, i) => {
          const pillEntry = spring({
            frame: Math.max(0, frame - 100 - i * 12),
            fps,
            config: SPRING.snappy,
          });

          const pillOpacity = interpolate(pillEntry, [0, 1], [0, 1]);
          const pillY = interpolate(pillEntry, [0, 1], [24, 0]);

          return (
            <div
              key={i}
              style={{
                padding: "12px 26px",
                borderRadius: 32,
                background: COLORS.primaryFaint,
                border: `1px solid ${COLORS.primary}30`,
                fontFamily: FONT.display,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.primary,
                letterSpacing: 0.2,
                opacity: pillOpacity,
                transform: `translateY(${pillY}px)`,
                whiteSpace: "nowrap",
              }}
            >
              {feature.text}
            </div>
          );
        })}
      </div>

      {/* Bottom caption */}
      <CinematicText
        text="Just a laptop and a webcam."
        startFrame={120}
        y={1680}
        fontSize={28}
        fontWeight={400}
        color={COLORS.textMuted}
        letterSpacing={0.8}
      />

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientVignette,
          pointerEvents: "none",
          opacity: exitFade,
        }}
      />
    </AbsoluteFill>
  );
};
