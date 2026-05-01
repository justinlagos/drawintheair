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
import { SPRING, fadeIn, kenBurns } from "../utils/motion";
import { CinematicText } from "../components/CinematicText";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

/**
 * Scene 5 – Classroom (frames 0–300, 10s)
 * Shows the app works for teachers and classrooms.
 * Features Class Mode card, student join chips, and animated leaderboard.
 */
export const Scene5Classroom: React.FC = () => {
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

  // Background photo with Ken Burns effect
  const photoScale = kenBurns(frame, 0, 300, 1.02, 1.1);
  const photoOpacity = interpolate(frame, [10, 40, 250, 300], [0, 0.35, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Class Mode card entry
  const cardEntry = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: SPRING.smooth,
  });

  // Student join animation data
  const students = [
    { name: "Maya", color: COLORS.green },
    { name: "Liam", color: COLORS.blue },
    { name: "Aisha", color: COLORS.pink },
    { name: "Noah", color: COLORS.purple },
    { name: "Zara", color: COLORS.orange },
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

      {/* Background classroom image */}
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
          src={staticFile("classroom.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${photoScale})`,
            filter: "brightness(0.45) saturate(1.1)",
          }}
        />
      </div>

      {/* Dark vignette gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, rgba(8,12,24,0.85) 0%, rgba(8,12,24,0.3) 35%, rgba(8,12,24,0.85) 100%)",
          opacity: exitFade,
        }}
      />

      {/* Ambient glow effects */}
      <GlowOrb
        x={540}
        y={650}
        size={400}
        color={COLORS.goldGlow}
        startFrame={10}
        opacity={0.1}
      />
      <ParticleField startFrame={5} count={15} seed={77} opacity={0.3 * exitFade} />

      {/* Title Section */}
      <CinematicText
        text="Designed for"
        startFrame={10}
        y={260}
        fontSize={40}
        fontWeight={300}
        color={COLORS.textSoft}
        letterSpacing={3}
      />
      <CinematicText
        text="classrooms."
        startFrame={18}
        y={310}
        fontSize={68}
        fontWeight={700}
        color={COLORS.textWhite}
        letterSpacing={-0.5}
        glow
        glowColor={COLORS.goldGlow}
      />

      {/* Class Mode Card */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 500,
          transform: `translateX(-50%) translateY(${interpolate(cardEntry, [0, 1], [40, 0])}px)`,
          opacity: interpolate(cardEntry, [0, 1], [0, 1]) * exitFade,
        }}
      >
        <div
          style={{
            width: 750,
            padding: "40px 50px",
            borderRadius: 24,
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.lineBright}`,
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 30,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.textWhite,
                }}
              >
                Class Mode
              </div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 18,
                  color: COLORS.textMuted,
                  marginTop: 4,
                }}
              >
                Live session active
              </div>
            </div>
            <div
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                background: COLORS.primaryFaint,
                border: `1px solid ${COLORS.primary}30`,
                fontFamily: FONT.mono,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.primary,
                letterSpacing: 2,
              }}
            >
              DRAW-42
            </div>
          </div>

          {/* Students Joining Chips */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {students.map((student, i) => {
              const chipEntry = spring({
                frame: Math.max(0, frame - 80 - i * 12),
                fps,
                config: SPRING.snappy,
              });

              return (
                <div
                  key={i}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 20,
                    background: `${student.color}15`,
                    border: `1px solid ${student.color}30`,
                    fontFamily: FONT.body,
                    fontSize: 20,
                    fontWeight: 500,
                    color: student.color,
                    opacity: interpolate(chipEntry, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(chipEntry, [0, 1], [0.8, 1])})`,
                  }}
                >
                  {student.name}
                </div>
              );
            })}
          </div>

          {/* Mini Leaderboard Preview */}
          <div
            style={{
              marginTop: 30,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {students.slice(0, 3).map((student, i) => {
              const barEntry = spring({
                frame: Math.max(0, frame - 140 - i * 10),
                fps,
                config: SPRING.gentle,
              });

              const widths = [100, 78, 62];
              const colors = [COLORS.gold, COLORS.primary, COLORS.green];

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    opacity: interpolate(barEntry, [0, 1], [0, 1]),
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT.body,
                      fontSize: 16,
                      color: COLORS.textMuted,
                      width: 60,
                    }}
                  >
                    {student.name}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: COLORS.lineSubtle,
                    }}
                  >
                    <div
                      style={{
                        width: `${interpolate(barEntry, [0, 1], [0, widths[i]])}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: colors[i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
