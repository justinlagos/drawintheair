import { useEffect, useRef } from 'react';
import { registerMessageCardOverlay, unregisterMessageCardOverlay } from '../core/messageCardService';

export const MessageCardOverlay = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !cardRef.current || !textRef.current) return;
        registerMessageCardOverlay(containerRef.current, cardRef.current, textRef.current);
        return () => {
            unregisterMessageCardOverlay();
        };
    }, []);

    return (
        <div ref={containerRef} className="message-card-overlay" style={{ display: 'none' }}>
            <div ref={cardRef} className="message-card">
                <div ref={textRef} className="message-card-text" />
            </div>
        </div>
    );
};
