/**
 * KidModal — soft sky overlay + rounded white card for prompts.
 *
 * Spec: rounded white cards, darkened sky overlay only if needed,
 * warm copy ("Ready to play?", "Great effort").
 *
 * Use for: camera permission, parent/teacher lock, completion prompts,
 * pause menus.
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';
import { kidAnimation } from '../../styles/motion';

export interface KidModalProps {
  open: boolean;
  children: ReactNode;
  onDismiss?: () => void;
  /** Click-outside dismisses the modal. Default: true if onDismiss is set */
  dismissOnBackdrop?: boolean;
  /** Soft sky tint instead of dark dim */
  tone?: 'sky' | 'dim';
  className?: string;
  style?: CSSProperties;
}

export const KidModal = ({
  open,
  children,
  onDismiss,
  dismissOnBackdrop,
  tone = 'sky',
  className,
  style,
}: KidModalProps) => {
  if (!open) return null;

  const allowBackdropDismiss = dismissOnBackdrop ?? !!onDismiss;
  const backdrop = tone === 'sky'
    ? 'rgba(190, 235, 255, 0.55)'
    : 'rgba(63, 64, 82, 0.55)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: tokens.zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
      }}
    >
      <div
        onClick={allowBackdropDismiss ? onDismiss : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          background: backdrop,
          animation: kidAnimation.fadeIn,
          cursor: allowBackdropDismiss ? 'pointer' : 'default',
        }}
      />
      <div
        className={className}
        style={{
          position: 'relative',
          maxWidth: '520px',
          width: '100%',
          background: tokens.semantic.bgPanel,
          borderRadius: tokens.radius.xxl,
          padding: tokens.spacing.xxl,
          boxShadow: tokens.shadow.modal,
          fontFamily: tokens.fontFamily.body,
          color: tokens.semantic.textPrimary,
          animation: kidAnimation.popIn,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
