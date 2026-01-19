import { useEffect } from 'react';
import { useGameStore } from '../../systems/game/GameStore';
import { audioManager } from '../../systems/audio/AudioManager';

export const LogOverlay = () => {
    const { readingLog, setReadingLog } = useGameStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (readingLog && (e.key === 'Escape' || e.key.toLowerCase() === 'e')) {
                setReadingLog(null);
                audioManager.playBeep(300, 0.05); // Close blip
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readingLog, setReadingLog]);

    if (!readingLog) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 10, 0, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000, // Above everything
            color: '#00ff00',
            fontFamily: '"Courier New", Courier, monospace',
            backdropFilter: 'blur(5px)'
        }}>
            {/* CRT Scanline Effect Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                backgroundSize: '100% 2px, 3px 100%',
                pointerEvents: 'none'
            }} />

            <div style={{
                width: '600px',
                maxWidth: '90%',
                border: '2px solid #00ff00',
                padding: '40px',
                position: 'relative',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
            }}>
                {/* Header */}
                <div style={{
                    borderBottom: '1px solid #00ff00',
                    paddingBottom: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontWeight: 'bold' }}>PANOPTICON_LOG_READER_V1.0</span>
                    <span>{readingLog.date}</span>
                </div>

                {/* Content */}
                <h2 style={{ margin: '0 0 20px 0', textTransform: 'uppercase' }}>{readingLog.title}</h2>
                <div style={{
                    whiteSpace: 'pre-line',
                    lineHeight: '1.6',
                    fontSize: '16px',
                    opacity: 0.9
                }}>
                    {readingLog.content}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '40px',
                    textAlign: 'center',
                    fontSize: '12px',
                    opacity: 0.7
                }}>
                    [PRESS 'E' OR 'ESC' TO CLOSE CONNECTION]
                </div>
            </div>
        </div>
    );
};
