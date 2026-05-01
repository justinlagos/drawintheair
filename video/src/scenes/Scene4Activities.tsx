import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
} from "remotion";
import { COLORS, FONT } from "../utils/colors";
import { SPRING, fadeIn, slideUp, kenBurns, progress, stagger } from "../utils/motion";
import { CinematicText } from "../components/CinematicText";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

interface ActivityCardProps {
  image: string;
  title: string;
  subtitle: string;
  color: string;
  accentColor: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  image,
  title,
  subtitle,
  color,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entry animation
  const cardEntry = spring({
    frame: Math.max(0, frame),
    fps,
    config: SPRING.smooth,
  });

  const cardOpacity = interpolate(cardEntry, [0, 1], [0, 1]);
  const cardY = interpolate(cardEntry, [0, 1], [50, 0]);
  const cardScale = interpolate(cardEntry, [0, 1], [0.93, 1]);

  // Ken Burns parallax on image
  const imageScale = kenBurns(frame, 0, 120, 1.0, 1.08);

  // Exit fade for card
  const exitFade = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line animation
  const lineWidth = interpolate(frame, [15, 45], [0, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: COLORS.gradientHero,
          opacity: cardOpacity * exitFade,
        }}
      />

      {/* Ambient glow orb */}
      <GlowOrb
        x={540}
        y={960}
        size={500}
        color={color}
        startFrame={0}
        opacity={0.15}
      />

      {/* Activity header */}
      <div
        style={{
          position: "absolute",
          top: 200,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: cardOpacity * exitFade,
          transform: `translateY(${interpolate(cardEntry, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.textWhite,
            letterSpacing: -0.6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 24,
            fontWeight: 500,
            color: accentColor,
            letterSpacing: 1,
            marginTop: 10,
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Accent line below subtitle */}
      <div
        style={{
          position: "absolute",
          top: 330,
          left: "50%",
          transform: "translateX(-50%)",
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: exitFade,
        }}
      />

      {/* Activity screenshot */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 420,
          transform: `translateX(-50%) translateY(${cardY}px) scale(${cardScale})`,
          opacity: cardOpacity * exitFade,
        }}
      >
        <div
          style={{
            width: 880,
            height: 540,
            borderRadius: 24,
            overflow: "hidden",
            border: `1.5px solid ${color}40`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 35px ${color}30`,
            backgroundColor: "#000",
          }}
        >
          <Img
            src={staticFile(image)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imageScale})`,
            }}
          />
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
          opacity: exitFade,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Scene 4 – Activity Montage (frames 0–600, 20 seconds)
 * Quick cinematic cuts of real product screenshots - energy peak of video
 */
export const Scene4Activities: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      {/* Global ambient effects */}
      <GlowOrb
        x={540}
        y={960}
        size={700}
        color={COLORS.primaryGlow}
        startFrame={0}
        opacity={0.08}
      />
      <ParticleField startFrame={0} count={20} seed={91} opacity={0.3} />

      {/* Activity sequence 1: Free Paint */}
      <Sequence from={0} durationInFrames={120}>
        <ActivityCard
          image="free-paint-particles.jpg"
          title="Free Paint"
          subtitle="Create anything"
          color={COLORS.gold}
          accentColor={COLORS.gold}
        />
      </Sequence>

      {/* Activity sequence 2: Bubble Pop */}
      <Sequence from={120} durationInFrames={120}>
        <ActivityCard
          image="bubble-pop.jpg"
          title="Bubble Pop"
          subtitle="Pop with your finger"
          color={COLORS.green}
          accentColor={COLORS.green}
        />
      </Sequence>

      {/* Activity sequence 3: Sort & Place */}
      <Sequence from={240} durationInFrames={120}>
        <ActivityCard
          image="sort-place.jpg"
          title="Sort & Place"
          subtitle="Think and sort"
          color={COLORS.orange}
          accentColor={COLORS.orange}
        />
      </Sequence>

      {/* Activity sequence 4: Word Search */}
      <Sequence from={360} durationInFrames={120}>
        <ActivityCard
          image="wordsearch.jpg"
          title="Word Search"
          subtitle="Find the words"
          color={COLORS.blue}
          accentColor={COLORS.blue}
        />
      </Sequence>

      {/* Activity sequence 5: Hand Tracking (Tracing) */}
      <Sequence from={480} durationInFrames={120}>
        <ActivityCard
          image="hand-tracking.jpg"
          title="Hand Tracking"
          subtitle="Follow the path"
          color={COLORS.primary}
          accentColor={COLORS.primaryGlow}
        />
      </Sequence>

      {/* Global vignette */}
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
