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
import { SPRING, kenBurns } from "../utils/motion";
import { CinematicText } from "../components/CinematicText";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

/**
 * Scene 6 – Accessibility/Devices (frames 0–300, 10s)
 * "Works instantly in the browser."
 * Shows browser mockup with real app interface and device compatibility.
 */
export const Scene6Devices: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry and exit animations
  const entryFade = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const exitFade = interpolate(frame, [260, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Browser window entry
  const browserEntry = spring({
    frame: Math.max(0, frame - 90),
    fps,
    config: SPRING.smooth,
  });

  // Feature lines stagger
  const lines = [
    { text: "No apps to install.", delay: 40 },
    { text: "No tablets needed.", delay: 55 },
    { text: "No setup required.", delay: 70 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: entryFade * exitFade,
        }}
      />

      {/* Ambient glow effects */}
      <GlowOrb
        x={540}
        y={800}
        size={500}
        color={COLORS.primaryGlow}
        startFrame={5}
        opacity={0.08}
      />
      <GlowOrb
        x={300}
        y={500}
        size={300}
        color={COLORS.goldGlow}
        startFrame={15}
        opacity={0.06}
      />
      <ParticleField startFrame={5} count={12} seed={99} opacity={0.25 * exitFade} />

      {/* Title Section */}
      <CinematicText
        text="Works instantly"
        startFrame={10}
        y={300}
        fontSize={56}
        fontWeight={600}
        color={COLORS.textWhite}
        letterSpacing={-0.5}
      />
      <CinematicText
        text="in the browser."
        startFrame={18}
        y={370}
        fontSize={56}
        fontWeight={600}
        color={COLORS.primary}
        letterSpacing={-0.5}
        glow
        glowColor={COLORS.primaryGlow}
      />

      {/* Browser Window Mockup */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 520,
          transform: `translateX(-50%) translateY(${interpolate(browserEntry, [0, 1], [40, 0])}px)`,
          opacity: interpolate(browserEntry, [0, 1], [0, 1]) * exitFade,
        }}
      >
        {/* Browser Chrome */}
        <div
          style={{
            width: 880,
            borderRadius: "16px 16px 0 0",
            background: "rgba(30, 40, 60, 0.9)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Traffic Lights */}
          <div style={{ display: "flex", gap: 7 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((color, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: color,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>

          {/* URL Bar */}
          <div
            style={{
              flex: 1,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
              fontFamily: FONT.body,
              fontSize: 15,
              color: COLORS.textMuted,
              letterSpacing: 0.3,
            }}
          >
            drawintheair.com/play
          </div>
        </div>

        {/* Browser Content Area */}
        <div
          style={{
            width: 880,
            height: 500,
            borderRadius: "0 0 16px 16px",
            overflow: "hidden",
            border: `1px solid ${COLORS.lineBright}`,
            borderTop: "none",
            boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
          }}
        >
          <Img
            src={staticFile("parent-child-screen.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      </div>

      {/* Feature Lines */}
      <div
        style={{
          position: "absolute",
          bottom: 380,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: exitFade,
        }}
      >
        {lines.map(({ text, delay }, i) => {
          const lineEntry = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: SPRING.gentle,
          });

          return (
            <div
              key={i}
              style={{
                fontFamily: FONT.display,
                fontSize: 30,
                fontWeight: 400,
                color: COLORS.textSoft,
                letterSpacing: 0.5,
                opacity: interpolate(lineEntry, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(lineEntry, [0, 1], [15, 0])}px)`,
              }}
            >
              {text}
            </div>
          );
        })}
      </div>

      {/* Device Compatibility Badge */}
      <div
        style={{
          position: "absolute",
          bottom: 250,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: (() => {
            const e = spring({
              frame: Math.max(0, frame - 120),
              fps,
              config: SPRING.smooth,
            });
            return interpolate(e, [0, 1], [0, 1]) * exitFade;
          })(),
        }}
      >
        <div
          style={{
            padding: "12px 32px",
            borderRadius: 30,
            background: COLORS.primaryFaint,
            border: `1px solid ${COLORS.primary}20`,
            fontFamily: FONT.display,
            fontSize: 22,
            fontWeight: 500,
            color: COLORS.primary,
            letterSpacing: 1,
          }}
        >
          Any laptop or Chromebook
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
