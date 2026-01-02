import { drawingEngine } from '../../core/drawingEngine';

const COLORS = [
    '#ff006e', // Pink
    '#3a86ff', // Blue
    '#8338ec', // Purple
    '#ffbe0b', // Yellow
    '#00f5d4', // Teal
    '#ffffff', // White
];

const BRUSH_SIZES = [
    { label: 'S', size: 4 },
    { label: 'M', size: 8 },
    { label: 'L', size: 16 },
    { label: 'XL', size: 32 },
];

export const FreePaintMode = () => {
    const handleColorChange = (color: string) => {
        drawingEngine.setColor(color);
    };

    const handleSizeChange = (size: number) => {
        drawingEngine.setWidth(size);
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center',
            pointerEvents: 'auto', // Allow clicks
            zIndex: 20
        }}>
            {/* Colors */}
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                {COLORS.map(color => (
                    <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: color,
                            border: '3px solid white',
                            cursor: 'pointer',
                            padding: 0
                        }}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>

            {/* Sizes */}
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                {BRUSH_SIZES.map(bush => (
                    <button
                        key={bush.label}
                        onClick={() => handleSizeChange(bush.size)}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#333',
                            color: 'white',
                            border: '2px solid white',
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        {bush.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
