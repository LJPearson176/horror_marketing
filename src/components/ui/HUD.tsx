import { useEffect, useState } from 'react';
import { useGameStore } from '../../systems/game/GameStore';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';

export const HUD = () => {
    const { flashlightBattery, flashlightOn } = useGameStore();
    const { metrics } = useBioSignalStore();

    // Formatting Time
    const [timeString, setTimeString] = useState("00:00:00");
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTimeString(now.toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Derived State
    const bpm = Math.round(metrics.heartRate || 65);
    const stress = Math.round(metrics.stressLevel || 0);
    const audioLevel = metrics.audioLevel || 0;
    const isScreaming = metrics.isScreaming;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 10,
            padding: '40px',
            fontFamily: '"Courier New", Courier, monospace',
            color: 'rgba(50, 255, 50, 0.8)', // Retro Green
            textShadow: '0 0 5px rgba(50, 255, 50, 0.5)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            {/* TOP BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Top Left: REC & TIME */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 'bold' }}>
                        <div style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: 'red',
                            animation: 'pulse 2s infinite' // Needs CSS
                        }} />
                        <span>REC</span>
                    </div>
                    <div style={{ fontSize: '18px', marginTop: '5px' }}>{timeString}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>SUBJ_ID: 994-ALPHA</div>
                    {/* New Gaze State rows */}
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-purple-400">Eyes (L|R):</span>
                        <span className="font-mono text-purple-200">
                            {metrics.isLeftEyeClosed ? 'CLSD' : 'OPEN'} ({metrics.leftEAR.toFixed(2)}) | {metrics.isRightEyeClosed ? 'CLSD' : 'OPEN'} ({metrics.rightEAR.toFixed(2)})
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-blue-300">Gaze State:</span>
                        <span className={`font-mono font-bold ${metrics.gazeDirection === 'CENTER' ? 'text-green-400' : 'text-red-500'}`}>
                            {metrics.gazeDirection} ({(metrics.gazeAlignment * 100).toFixed(0)}%)
                        </span>
                    </div>
                </div>

                {/* Top Right: BATTERY */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>FLASHLIGHT [F]</div>
                    <div style={{
                        width: '150px',
                        height: '15px',
                        border: '2px solid rgba(50, 255, 50, 0.5)',
                        padding: '2px',
                        opacity: flashlightOn ? 1 : 0.5
                    }}>
                        <div style={{
                            width: `${flashlightBattery}%`,
                            height: '100%',
                            backgroundColor: flashlightBattery < 20 ? 'red' : 'rgba(50, 255, 50, 0.8)',
                            transition: 'width 0.2s',
                        }} />
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>{Math.round(flashlightBattery)}%</div>
                </div>
            </div>

            {/* BOTTOM BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {/* Bottom Left: BIOMETRICS */}
                <div>
                    <div style={{ fontSize: '18px', borderBottom: '1px solid rgba(50, 255, 50, 0.5)', marginBottom: '5px', display: 'inline-block' }}>
                        BIO_MONITOR
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>HEART RATE</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                {bpm} <span style={{ fontSize: '14px' }}>BPM</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>STRESS</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                {stress}%
                            </div>
                        </div>
                    </div>
                    {/* Fake EKG Line (CSS Animation Placeholder) */}
                    <div style={{
                        width: '200px',
                        height: '2px',
                        backgroundColor: 'rgba(50, 255, 50, 0.3)',
                        marginTop: '10px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: '20px',
                            height: '100%',
                            background: 'rgba(50, 255, 50, 0.9)',
                            position: 'absolute',
                            left: '-20px',
                            animation: `ekg ${60 / Math.max(40, bpm)}s linear infinite` // Dynamic speed
                        }} />
                    </div>
                </div>

                {/* Bottom Right: AUDIO INPUT */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', borderBottom: '1px solid rgba(50, 255, 50, 0.5)', marginBottom: '5px', display: 'inline-block' }}>
                        AUDIO_INPUT
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        {/* Audio Visualizer Bars */}
                        {[...Array(10)].map((_, i) => {
                            const threshold = (i + 1) * 0.1;
                            const isActive = audioLevel >= threshold;
                            const isWarning = i > 7; // Top bars are red zone
                            return (
                                <div key={i} style={{
                                    width: isActive ? `${30 + (i * 5)}px` : '10px', // Expand when active
                                    height: '4px',
                                    backgroundColor: isActive
                                        ? (isWarning || isScreaming ? 'red' : 'rgba(50, 255, 50, 0.9)')
                                        : 'rgba(50, 255, 50, 0.2)',
                                    transition: 'width 0.05s, background-color 0.1s'
                                }} />
                            );
                        })}
                    </div>
                    <div style={{
                        marginTop: '5px',
                        fontSize: '12px',
                        color: isScreaming ? 'red' : 'inherit',
                        fontWeight: isScreaming ? 'bold' : 'normal'
                    }}>
                        {isScreaming ? "WARNING: HIGH VOLUME" : "LISTENING..."}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
                @keyframes ekg {
                    0% { left: -20px; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
};
