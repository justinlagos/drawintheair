import React from "react";
import { Composition } from "remotion";
import { DrawInTheAir } from "./DrawInTheAir";

export const RemotionRoot: React.FC = () => {
  const FPS = 30;
  const DURATION_SECONDS = 70;

  return (
    <>
      <Composition
        id="DrawInTheAir"
        component={DrawInTheAir}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="DrawInTheAirLandscape"
        component={DrawInTheAir}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
