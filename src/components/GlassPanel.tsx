import React from 'react';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', style = {} }) => {
    return (
        <div
            className={`glass-panel ${className}`}
            style={{
                padding: '24px',
                ...style
            }}
        >
            {children}
        </div>
    );
};
