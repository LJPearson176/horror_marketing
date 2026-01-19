import { useGameStore } from '../../systems/game/GameStore';
import { audioManager } from '../../systems/audio/AudioManager';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';

export const TitleScreen = () => {
    const { gameStatus, startGame, resetGame } = useGameStore();
    const { metrics, affectiveState } = useBioSignalStore();

    const stressLevel = (affectiveState.arousal || 0) * 100;

    const handleStart = async () => {
        await audioManager.init();
        startGame();
    };

    if (gameStatus === 'PLAYING' || gameStatus === 'MAZE') return null;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'black',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            color: '#eee',
            fontFamily: '"Courier New", monospace',
            textAlign: 'center'
        }}>
            {gameStatus === 'TITLE' && (
                <>
                    <h1 style={{
                        fontSize: '4rem',
                        marginBottom: '0.5rem',
                        textShadow: '0 0 10px white',
                        letterSpacing: '0.5rem'
                    }}>
                        PANOPTICON
                    </h1>
                    <div style={{ marginBottom: '2rem', opacity: 0.7 }}>
                        SUBJECT #994 // BIOMETRIC DATA REQUIRED
                    </div>

                    <div style={{
                        fontSize: '0.9rem',
                        color: '#888',
                        marginBottom: '4rem',
                        maxWidth: '400px'
                    }}>
                        WARNING: This simulation adapts to your fear.<br />
                        Allow Camera/Microphone access for full immersion.
                    </div>

                    <button
                        onClick={handleStart}
                        style={{
                            background: 'transparent',
                            border: '1px solid white',
                            color: 'white',
                            padding: '1rem 2rem',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        INITIATE SEQUENCE
                    </button>
                </>
            )}

            {gameStatus === 'ENDING' && (
                <>
                    <h1 style={{
                        fontSize: '3rem',
                        color: 'red',
                        marginBottom: '1rem',
                        textShadow: '0 0 15px red'
                    }}>
                        SUBJECT EVALUATED
                    </h1>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        marginBottom: '3rem',
                        fontSize: '1.2rem',
                        backgroundColor: '#111',
                        padding: '2rem',
                        border: '1px solid #333'
                    }}>
                        <div>FINAL HEART RATE: <span style={{ color: 'red' }}>{Math.round(metrics.heartRate)} BPM</span></div>
                        <div>STRESS LEVEL: <span style={{ color: 'red' }}>{Math.round(stressLevel)}%</span></div>
                        <div>STATUS: <span style={{ color: 'red' }}>TERMINATED</span></div>
                    </div>

                    <button
                        onClick={() => resetGame()}
                        style={{
                            background: 'transparent',
                            border: '1px solid red',
                            color: 'red',
                            padding: '1rem 2rem',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        RETURN TO MENU
                    </button>
                </>
            )}
        </div>
    );
};
