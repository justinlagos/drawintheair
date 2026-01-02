import { resetPath } from './preWriting/preWritingLogic';

export const PreWritingMode = () => {
    return (
        <div style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 20
        }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)', color: 'white' }}>
                <h2>Trace the Line!</h2>
                <button onClick={() => resetPath()} style={{ marginTop: '10px' }}>
                    Restart Path
                </button>
            </div>
        </div>
    );
};
