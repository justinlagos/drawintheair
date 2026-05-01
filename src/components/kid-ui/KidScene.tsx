/**
 * KidScene — light sky background with rolling hills and clouds.
 *
 * Optional decorative wrapper for game canvases. Pure CSS/SVG, zero JS
 * per-frame work. Sits behind the gameplay layer.
 *
 * Hills tone is themable per-mode (e.g. Sort & Place uses green meadow,
 * Free Paint uses lavender, Bubble Pop uses sky-only).
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type KidSceneMood = 'sky' | 'meadow' | 'lavender' | 'sunset';

export interface KidSceneProps {
  children?: ReactNode;
  mood?: KidSceneMood;
  /** Show rolling green hills at the bottom edge */
  hills?: boolean;
  /** Show drifting cloud silhouettes */
  clouds?: boolean;
  className?: string;
  style?: CSSProperties;
}

const skyByMood: Record<KidSceneMood, string> = {
  sky: `linear-gradient(180deg, #BEEBFF 0%, #E5F5FF 70%, #F4FAFF 100%)`,
  meadow: `linear-gradient(180deg, #BEEBFF 0%, #DFFAD9 80%)`,
  lavender: `linear-gradient(180deg, #E8DEFB 0%, #F4FAFF 100%)`,
  sunset: `linear-gradient(180deg, #FFD08A 0%, #FFF6D6 50%, #BEEBFF 100%)`,
} as const;

export const KidScene = ({
  children,
  mood = 'sky',
  hills = true,
  clouds = true,
  className,
  style,
}: KidSceneProps) => {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: skyByMood[mood],
        zIndex: tokens.zIndex.scene,
        ...style,
      }}
    >
      {clouds && (
        <>
          <SoftCloud x="8%" y="12%" size={120} />
          <SoftCloud x="62%" y="18%" size={150} />
          <SoftCloud x="35%" y="6%" size={90} />
          <SoftCloud x="82%" y="32%" size={110} />
        </>
      )}
      {hills && <Hills />}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

const SoftCloud = ({ x, y, size }: { x: string; y: string; size: number }) => (
  <svg
    aria-hidden
    width={size}
    height={size * 0.6}
    viewBox="0 0 200 120"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity: 0.85,
      filter: 'drop-shadow(0 4px 12px rgba(108, 63, 164, 0.06))',
    }}
  >
    <path
      d="M40 80 Q20 80 20 60 Q20 40 45 40 Q50 20 75 22 Q90 8 115 18 Q145 12 155 38 Q180 38 180 60 Q180 84 155 84 L40 84 Z"
      fill={tokens.colors.cloudWhite}
    />
  </svg>
);

const Hills = () => (
  <svg
    aria-hidden
    viewBox="0 0 1440 320"
    preserveAspectRatio="none"
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '38%',
    }}
  >
    {/* Back hills */}
    <path
      d="M0,200 Q360,120 720,180 T1440,160 L1440,320 L0,320 Z"
      fill="#A6E89A"
      opacity={0.55}
    />
    {/* Front hills */}
    <path
      d="M0,250 Q300,180 720,240 T1440,230 L1440,320 L0,320 Z"
      fill={tokens.colors.meadowGreen}
    />
  </svg>
);
