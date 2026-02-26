/**
 * Hand Guidance Overlay - Kid-Readable Visual Feedback
 * 
 * Part E: Visual guidance with arrows and center zone
 * Shows when hands are not visible, confidence is low, or hand is near edges
 */

import { getTrackingFlag } from '../core/flags/TrackingFlags';

interface HandGuidanceOverlayProps {
    hasHand: boolean;
    confidence: number;
    filteredPoint: { x: number; y: number } | null;
    minConfidence: number;
}

export const HandGuidanceOverlay = ({ 
    hasHand, 
    confidence, 
    filteredPoint,
    minConfidence 
}: HandGuidanceOverlayProps) => {
    const showGuidance = getTrackingFlag('visualGuidance');
    
    if (!showGuidance) {
        return null;
    }
    
    // Determine if guidance should be shown
    const shouldShow = !hasHand || confidence < minConfidence || (filteredPoint && (
        filteredPoint.x < 0.15 || 
        filteredPoint.x > 0.85 || 
        filteredPoint.y < 0.15 || 
        filteredPoint.y > 0.85
    ));
    
    if (!shouldShow) {
        return null;
    }
    
    // Determine guidance type
    let guidanceType: 'center' | 'visible' | 'confidence' = 'center';
    if (!hasHand) {
        guidanceType = 'visible';
    } else if (confidence < minConfidence) {
        guidanceType = 'confidence';
    } else if (filteredPoint) {
        guidanceType = 'center';
    }
    
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Center dashed zone */}
            <div style={{
                width: '60%',
                height: '60%',
                border: '2px dashed rgba(255, 217, 61, 0.4)',
                borderRadius: '24px',
                position: 'relative',
                animation: 'guidancePulse 2s ease-in-out infinite'
            }}>
                {/* Arrows pointing to center */}
                {guidanceType === 'center' && filteredPoint && (
                    <>
                        {/* Left arrow */}
                        {filteredPoint.x < 0.15 && (
                            <div style={{
                                position: 'absolute',
                                left: '-60px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '2rem',
                                color: 'rgba(255, 217, 61, 0.8)',
                                animation: 'arrowPulse 1.5s ease-in-out infinite'
                            }}>
                                →
                            </div>
                        )}
                        
                        {/* Right arrow */}
                        {filteredPoint.x > 0.85 && (
                            <div style={{
                                position: 'absolute',
                                right: '-60px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '2rem',
                                color: 'rgba(255, 217, 61, 0.8)',
                                animation: 'arrowPulse 1.5s ease-in-out infinite'
                            }}>
                                ←
                            </div>
                        )}
                        
                        {/* Top arrow */}
                        {filteredPoint.y < 0.15 && (
                            <div style={{
                                position: 'absolute',
                                top: '-60px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '2rem',
                                color: 'rgba(255, 217, 61, 0.8)',
                                animation: 'arrowPulse 1.5s ease-in-out infinite'
                            }}>
                                ↓
                            </div>
                        )}
                        
                        {/* Bottom arrow */}
                        {filteredPoint.y > 0.85 && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-60px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '2rem',
                                color: 'rgba(255, 217, 61, 0.8)',
                                animation: 'arrowPulse 1.5s ease-in-out infinite'
                            }}>
                                ↑
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* Minimal text indicator */}
            {guidanceType === 'visible' && (
                <div style={{
                    position: 'absolute',
                    bottom: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '1.2rem',
                    color: 'rgba(255, 217, 61, 0.9)',
                    fontWeight: 600,
                    textAlign: 'center'
                }}>
                    👋 Show your hands
                </div>
            )}
            
            <style>{`
                @keyframes guidancePulse {
                    0%, 100% {
                        opacity: 0.4;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(1.02);
                    }
                }
                @keyframes arrowPulse {
                    0%, 100% {
                        opacity: 0.6;
                        transform: translateY(-50%) translateX(0);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(-50%) translateX(10px);
                    }
                }
            `}</style>
        </div>
    );
};
