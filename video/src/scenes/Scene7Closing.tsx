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
import { SPRING } from "../utils/motion";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

/**
 * Scene 7 – Closing (frames 0–300, 10s)
 * The emotional landing. Logo reveals. Final CTA.
 * 9:16 vertical (1080x1920), 30fps
 */
export const Scene7Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry fade
  const entryFade = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Logo entrance animation
  const logoEntry = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: SPRING.cinematic,
  });

  const logoScale = interpolate(logoEntry, [0, 1], [0.8, 1]);
  const logoY = interpolate(logoEntry, [0, 1], [30, 0]);

  // Tagline entrance
  const tagEntry = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: SPRING.smooth,
  });

  // URL entrance
  const urlEntry = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: SPRING.smooth,
  });

  // Final fade to black
  const finalFade = interpolate(frame, [250, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Gradient background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: entryFade * finalFade,
        }}
      />

      {/* Warm glow effects behind logo */}
      <GlowOrb
        x={540}
        y={700}
        size={600}
        color={COLORS.goldGlow}
        startFrame={20}
        opacity={0.15 * finalFade}
      />
      <GlowOrb
        x={540}
        y={700}
        size={400}
        color={COLORS.primaryGlow}
        startFrame={25}
        opacity={0.1 * finalFade}
      />
      <GlowOrb
        x={300}
        y={1100}
        size={300}
        color="rgba(167,139,250,0.15)"
        startFrame={30}
        opacity={0.08 * finalFade}
      />

      <ParticleField startFrame={10} count={30} seed={42} opacity={0.4 * finalFade} />

      {/* Logo Image (real product asset) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 520,
          transform: `translateX(-50%) translateY(${logoY}px) scale(${logoScale})`,
          opacity: interpolate(logoEntry, [0, 1], [0, 1]) * finalFade,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 500,
            height: "auto",
            filter: `drop-shadow(0 0 40px ${COLORS.goldGlow}) drop-shadow(0 0 80px ${COLORS.primaryGlow})`,
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: 1020,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: interpolate(tagEntry, [0, 1], [0, 1]) * finalFade,
          transform: `translateY(${interpolate(tagEntry, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 38,
            fontWeight: 300,
            color: COLORS.textLight,
            letterSpacing: 3,
          }}
        >
          Learning through movement.
        </div>
      </div>

      {/* Separator Line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 1085,
          transform: "translateX(-50%)",
          width: interpolate(tagEntry, [0, 1], [0, 160]),
          height: 1,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}60, transparent)`,
          opacity: finalFade,
        }}
      />

      {/* Website URL */}
      <div
        style={{
          position: "absolute",
          top: 1130,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: interpolate(urlEntry, [0, 1], [0, 1]) * finalFade,
          transform: `translateY(${interpolate(urlEntry, [0, 1], [15, 0])}px)`,
        }}
      >
        <div
          style={{
            padding: "14px 40px",
            borderRadius: 40,
            background: COLORS.primaryFaint,
            border: `1px solid ${COLORS.primary}20`,
            fontFamily: FONT.display,
            fontSize: 26,
            fontWeight: 500,
            color: COLORS.primary,
            letterSpacing: 1.5,
          }}
        >
          drawintheair.com
        </div>
      </div>

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientVignette,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
