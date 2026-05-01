import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { COLORS } from "./utils/colors";
import { Scene1Opening } from "./scenes/Scene1Opening";
import { Scene2Introduce } from "./scenes/Scene2Introduce";
import { Scene3Technology } from "./scenes/Scene3Technology";
import { Scene4Activities } from "./scenes/Scene4Activities";
import { Scene5Classroom } from "./scenes/Scene5Classroom";
import { Scene6Devices } from "./scenes/Scene6Devices";
import { Scene7Closing } from "./scenes/Scene7Closing";

/**
 * Draw in the Air – Cinematic Product Demo
 * Master Composition
 *
 * Total: 70 seconds @ 30fps = 2100 frames
 *
 * Scene 1: Opening Hook         0–5s    (frames 0–150)
 * Scene 2: Introduce the Idea   5–12s   (frames 150–360)
 * Scene 3: Technology            12–20s  (frames 360–600)
 * Scene 4: Activity Montage     20–40s  (frames 600–1200)
 * Scene 5: Classroom            40–50s  (frames 1200–1500)
 * Scene 6: Devices              50–60s  (frames 1500–1800)
 * Scene 7: Closing              60–70s  (frames 1800–2100)
 */

// ─── Cinematic Cross-Fade Transition ───────────────────────────────
const CrossFade: React.FC<{
  children: React.ReactNode;
  startFrame: number;
  endFrame: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}> = ({ children, startFrame, endFrame, fadeInDuration = 20, fadeOutDuration = 20 }) => {
  const frame = useCurrentFrame();

  let opacity = 0;
  if (frame < startFrame) {
    opacity = 0;
  } else if (frame < startFrame + fadeInDuration) {
    opacity = interpolate(frame, [startFrame, startFrame + fadeInDuration], [0, 1], {
      easing: Easing.out(Easing.cubic),
    });
  } else if (frame < endFrame - fadeOutDuration) {
    opacity = 1;
  } else if (frame < endFrame) {
    opacity = interpolate(frame, [endFrame - fadeOutDuration, endFrame], [1, 0], {
      easing: Easing.in(Easing.cubic),
    });
  }

  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const DrawInTheAir: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Scene 1 – Opening Hook (0–5s) */}
      <CrossFade startFrame={0} endFrame={165} fadeInDuration={1} fadeOutDuration={15}>
        <Sequence from={0} durationInFrames={165}>
          <Scene1Opening />
        </Sequence>
      </CrossFade>

      {/* Scene 2 – Introduce the Idea (5–12s) */}
      <CrossFade startFrame={140} endFrame={375} fadeInDuration={20} fadeOutDuration={15}>
        <Sequence from={140} durationInFrames={235}>
          <Scene2Introduce />
        </Sequence>
      </CrossFade>

      {/* Scene 3 – Technology (12–20s) */}
      <CrossFade startFrame={355} endFrame={615} fadeInDuration={20} fadeOutDuration={15}>
        <Sequence from={355} durationInFrames={260}>
          <Scene3Technology />
        </Sequence>
      </CrossFade>

      {/* Scene 4 – Activity Montage (20–40s) */}
      <CrossFade startFrame={595} endFrame={1215} fadeInDuration={20} fadeOutDuration={15}>
        <Sequence from={595} durationInFrames={620}>
          <Scene4Activities />
        </Sequence>
      </CrossFade>

      {/* Scene 5 – Classroom (40–50s) */}
      <CrossFade startFrame={1195} endFrame={1515} fadeInDuration={20} fadeOutDuration={15}>
        <Sequence from={1195} durationInFrames={320}>
          <Scene5Classroom />
        </Sequence>
      </CrossFade>

      {/* Scene 6 – Devices (50–60s) */}
      <CrossFade startFrame={1495} endFrame={1815} fadeInDuration={20} fadeOutDuration={15}>
        <Sequence from={1495} durationInFrames={320}>
          <Scene6Devices />
        </Sequence>
      </CrossFade>

      {/* Scene 7 – Closing (60–70s) */}
      <CrossFade startFrame={1795} endFrame={2100} fadeInDuration={20} fadeOutDuration={1}>
        <Sequence from={1795} durationInFrames={305}>
          <Scene7Closing />
        </Sequence>
      </CrossFade>

      {/* Global subtle grain overlay for cinematic texture */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.03,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
