/**
 * ChildSelfView — small mirrored "here's you" camera preview for the child,
 * driven by the parent `camera_reassurance` control.
 *
 *   off      → not shown
 *   standard → shown, with a gentle way to hide it (default)
 *   gentle   → shown, always on (the parent's "Always on" option)
 *
 * It borrows the SAME MediaStream as the hidden tracking video (no extra
 * getUserMedia, no second permission prompt) — the identical technique used by
 * ParentTransparencyBanner. The video stays on the device; nothing is uploaded.
 */

import React, { useEffect, useRef, useState } from 'react';

export type CameraReassurance = 'off' | 'standard' | 'gentle';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  mode: CameraReassurance;
}

export function ChildSelfView({ videoRef, cameraActive, mode }: Props) {
  const selfRef = useRef<HTMLVideoElement | null>(null);
  const [hidden, setHidden] = useState(false);

  const visible = mode !== 'off' && cameraActive && !hidden;

  // Mirror the live stream from the tracking video into this preview.
  useEffect(() => {
    if (!visible) return;
    const source = videoRef.current;
    const local = selfRef.current;
    if (!source || !local) return;
    const stream = source.srcObject as MediaStream | null;
    if (stream && local.srcObject !== stream) {
      local.srcObject = stream;
      local.play().catch(() => { /* autoplay/user-gesture failure is fine */ });
    }
    return () => { if (local) local.srcObject = null; };
  }, [visible, videoRef]);

  if (!visible) return null;

  // 'gentle' = the parent's "Always on" choice, so no hide affordance.
  const dismissible = mode === 'standard';

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 40,
        width: 132, borderRadius: 16, overflow: 'hidden',
        background: '#0B1430',
        boxShadow: '0 10px 26px rgba(7, 12, 24, 0.35)',
        border: '2px solid rgba(255,255,255,0.85)',
      }}
      aria-label="A small preview of your camera"
    >
      <video
        ref={selfRef}
        autoPlay
        muted
        playsInline
        style={{
          display: 'block', width: '100%', height: 99, objectFit: 'cover',
          transform: 'scaleX(-1)', // mirror, what a child expects of themselves
        }}
      />
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 8px', background: 'rgba(11, 20, 48, 0.9)',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 11, fontWeight: 800, color: '#fff',
        }}
      >
        <span>👋 You</span>
        {dismissible && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Hide my camera preview"
            style={{
              border: 'none', background: 'transparent', color: '#C9CBE0',
              cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
