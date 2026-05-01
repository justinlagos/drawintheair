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

/**
 * Scene 1 – Opening Hook (0–5 seconds / frames 0–150)
 * Dark screen fades in with lifestyle photography. "Children learn best when they move."
 * Emotional hook with subtle motion, glow effects, and cinematic text.
 * 9:16 vertical format optimized.
 */
export const Scene1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Main background fade from black
  const bgOpacity = interpolate(frame, [0, 35], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Hero photo with subtle Ken Burns zoom
  const photoScale = kenBurns(frame, 0, 150, 1.0, 1.12);
  const photoOpacity = interpolate(frame, [10, 45, 115, 150], [0, 0.4, 0.4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text stagger animation using stagger utility
  const headlineEntry = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: SPRING.smooth,
  });

  const headlineY = interpolate(headlineEntry, [0, 1], [100, 0]);
  const headlineOpacity = interpolate(headlineEntry, [0, 0.5, 1], [0, 0, 1]);

  const subheadlineEntry = spring({
    frame: Math.max(0, frame - 35),
    fps,
    config: SPRING.smooth,
  });

  const subheadlineY = interpolate(subheadlineEntry, [0, 1], [100, 0]);
  const subheadlineOpacity = interpolate(subheadlineEntry, [0, 0.5, 1], [0, 0, 1]);

  // Accent line growth
  const accentLineWidth = interpolate(frame, [50, 85], [0, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Exit fade
  const exitFade = interpolate(frame, [120, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Vignette intensity
  const vignetteOpacity = interpolate(frame, [0, 50], [0.3, 0.7], {
    extrapolateRight: "clamp",
  }) * exitFade;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Base gradient hero background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: bgOpacity * exitFade,
        }}
      />

      {/* Lifestyle photo with Ken Burns effect */}
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
          src={staticFile("child-drawing-light.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${photoScale})`,
            filter: "brightness(0.55) saturate(1.15) contrast(1.1)",
          }}
        />
      </div>

      {/* Top-to-bottom gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, rgba(8,12,24,0.92) 0%, rgba(8,12,24,0.2) 35%, rgba(8,12,24,0.75) 100%)",
          opacity: exitFade,
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow orbs */}
      <GlowOrb
        x={width * 0.5}
        y={height * 0.55}
        size={700}
        color={COLORS.primaryGlow}
        startFrame={5}
        opacity={0.08}
      />
      <GlowOrb
        x={width * 0.2}
        y={height * 0.8}
        size={450}
        color="rgba(167,139,250,0.15)"
        startFrame={15}
        opacity={0.06}
      />

      {/* Floating particle field */}
      <ParticleField
        startFrame={10}
        count={25}
        seed={42}
        opacity={0.35 * exitFade}
      />

      {/* Headline text – "Children learn best" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          transform: `translateX(-50%) translateY(${headlineY}px)`,
          opacity: Math.min(bgOpacity, headlineOpacity) * exitFade,
          textAlign: "center",
          width: "90%",
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 300,
            color: COLORS.textLight,
            letterSpacing: 1.5,
            lineHeight: 1.1,
            fontFamily: FONT.display,
          }}
        >
          Children learn best
        </div>
      </div>

      {/* Subheadline text – "when they move." with glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: `translateX(-50%) translateY(${subheadlineY}px)`,
          opacity: Math.min(bgOpacity, subheadlineOpacity) * exitFade,
          textAlign: "center",
          width: "90%",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.textWhite,
            letterSpacing: -0.8,
            lineHeight: 1.1,
            fontFamily: FONT.display,
            textShadow: `0 0 20px ${COLORS.primaryGlow}, 0 0 40px rgba(139, 92, 246, 0.3)`,
          }}
        >
          when they move.
        </div>
      </div>

      {/* Accent line under text */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "56%",
          transform: "translateX(-50%)",
          width: accentLineWidth,
          height: 2.5,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
          opacity: exitFade * 0.8,
          filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))",
        }}
      />

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
          opacity: vignetteOpacity,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
