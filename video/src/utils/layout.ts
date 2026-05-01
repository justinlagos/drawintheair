/** 9:16 vertical layout constants */
export const LAYOUT = {
  width: 1080,
  height: 1920,
  cx: 540,
  cy: 960,
  margin: 72,
  fps: 30,
  totalDuration: 70, // seconds
  totalFrames: 2100, // 70 * 30
} as const;

/** Frame ranges for each scene at 30fps */
export const SCENES = {
  opening:    { from: 0,    dur: 150  },  // 0–5s
  introduce:  { from: 150,  dur: 210  },  // 5–12s
  tracing:    { from: 360,  dur: 240  },  // 12–20s
  activities: { from: 600,  dur: 600  },  // 20–40s
  classroom:  { from: 1200, dur: 300  },  // 40–50s
  devices:    { from: 1500, dur: 300  },  // 50–60s
  closing:    { from: 1800, dur: 300  },  // 60–70s
} as const;

/** Image asset paths (relative to public/) */
export const ASSETS = {
  logo: "/logo.png",
  logoColor: "/DRAWINTHEAIR-LOGO-COLOUR.jpg",
  childAtLaptop: "/child-at-laptop.jpg",
  childDrawingLight: "/child-drawing-light.jpg",
  parentChildScreen: "/parent-child-screen.jpg",
  tracingLetter: "/tracing-letter.jpg",
  bubblePop: "/bubble-pop.jpg",
  freePaintParticles: "/free-paint-particles.jpg",
  sortPlace: "/sort-place.jpg",
  wordsearch: "/wordsearch.jpg",
  handTracking: "/hand-tracking.jpg",
  classroom: "/classroom.jpg",
  heroNeonWaves: "/hero-neon-waves.jpg",
  privacyCamera: "/privacy-camera.jpg",
} as const;
