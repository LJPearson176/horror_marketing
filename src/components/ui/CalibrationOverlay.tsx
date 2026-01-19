import { useEffect } from 'react';
import { useCalibrationStore } from '../../systems/calibration/CalibrationManager';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';
import { bioVisionManager } from '../../systems/perception/BioVisionManager';
import { useGameStore } from '../../systems/game/GameStore';
import { audioInputAnalyzer } from '../../systems/perception/AudioInputAnalyzer';

export const CalibrationOverlay = () => {
    const { state, setState } = useCalibrationStore();
    const { isFaceLocked } = useBioSignalStore();

    const { startGame } = useGameStore();

    if (state === 'COMPLETE') {
        // Fall through to render "System Online" or return null after delay?
        // User reported "Black Screen". Let's render a "System Online" overlay briefly or permanently for now.
    }

    useEffect(() => {
        // Start camera immediately to allow "Face Lock" acquisition
        bioVisionManager.startCamera();
        // Start Audio Listener immediately
        audioInputAnalyzer.init();
    }, []);

    const { progress, setProgress, setCalibrating, addToBuffer, isCalibrating } = useCalibrationStore();
    const { metrics } = useBioSignalStore();


    // Data Collection Bridge
    useEffect(() => {
        if (isCalibrating) {
            // Average L/R pupil for now
            const avgPupil = (metrics.leftPupilDiameter + metrics.rightPupilDiameter) / 2;
            if (avgPupil > 0) {
                addToBuffer('pupilDiameters', avgPupil);
            }
        }
    }, [metrics, isCalibrating, addToBuffer]);

    useEffect(() => {
        let interval: any;
        if (state === 'LIGHT_TEST' || state === 'DARK_TEST') {
            setCalibrating(true);
            setProgress(0);
            const DURATION = 5000; // 5 Seconds per test
            const STEP = 50;
            let current = 0;

            interval = setInterval(() => {
                current += STEP;
                const pct = Math.min((current / DURATION) * 100, 100);
                setProgress(pct);

                if (current >= DURATION) {
                    clearInterval(interval);
                    setCalibrating(false);
                    if (state === 'LIGHT_TEST') {
                        // Auto-advance or wait for user? User requested verify, let's auto-enable "Next" but not auto-switch to avoid jarring
                    }
                }
            }, STEP);
        }
        return () => clearInterval(interval);
    }, [state, setProgress, setCalibrating]);

    const handleStartCalibration = () => {
        setState('LIGHT_TEST');
    };

    const hasAudio = metrics.audioLevel > 0;

    return (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            {state === 'IDLE' && (
                <div className="pointer-events-auto p-8 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-center">
                    <h1 className="text-4xl font-bold tracking-widest uppercase mb-4 text-red-600">Panopticon</h1>
                    <p className="text-sm font-mono text-gray-400 mb-6">Bio-Feedback Neural Interface // Initializing...</p>

                    <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-xs mx-auto">
                        {!isFaceLocked ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-[10px] text-red-400 font-mono">NO SUBJECT</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-green-500" />
                                <p className="text-[10px] text-green-400 font-mono">SUBJECT LOCK</p>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-full h-1 bg-gray-800 rounded overflow-hidden mt-1.5`}>
                                <div
                                    className={`h-full transition-all duration-75 ${hasAudio ? 'bg-pink-500' : 'bg-red-900'}`}
                                    style={{ width: `${Math.min(100, metrics.audioLevel * 500)}%` }} // Boost visual for low levels
                                />
                            </div>
                            <p className={`text-[10px] font-mono ${hasAudio ? 'text-pink-400' : 'text-red-500 animate-pulse'}`}>
                                {hasAudio ? 'AUDIO FEED OK' : 'NO AUDIO'}
                            </p>
                        </div>
                    </div>

                    <button
                        className={`px-6 py-2 border transition-all font-mono text-xs uppercase tracking-widest ${isFaceLocked && hasAudio ? 'bg-white/10 hover:bg-red-900/50 border-white/20 cursor-pointer' : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'}`}
                        onClick={handleStartCalibration}
                        disabled={!isFaceLocked || !hasAudio}
                    >
                        Start Calibration
                    </button>
                    {!hasAudio && <p className="text-[10px] text-red-500 mt-2">Microphone input required to proceed.</p>}
                </div>
            )}

            {state === 'LIGHT_TEST' && (
                <div className="bg-white w-full h-full flex flex-col items-center justify-center pointer-events-auto">
                    <div className="p-8 text-black text-center max-w-md w-full">
                        <h2 className="text-2xl font-bold uppercase mb-2">Calibration: Light Sensitivity</h2>
                        <p className="mb-4 text-xs font-mono">Keep eyes open. Measuring pupillary constriction.</p>

                        <div className="w-full h-1 bg-gray-200 mt-4 mb-2 overflow-hidden">
                            <div
                                className="h-full bg-black transition-all duration-100 ease-linear"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-[10px] font-mono text-gray-400 mb-6">{Math.round(progress)}% COMPLETE</p>

                        <button
                            className={`px-6 py-2 transition-all font-mono text-xs uppercase tracking-widest mt-4 ${progress === 100 ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            onClick={() => setState('DARK_TEST')}
                            disabled={progress < 100}
                        >
                            Next Step
                        </button>
                    </div>
                </div>
            )}

            {state === 'DARK_TEST' && (
                <div className="bg-black w-full h-full flex flex-col items-center justify-center pointer-events-auto">
                    <div className="p-8 text-white border border-white/10 rounded-lg text-center backdrop-blur-sm bg-black/80 w-full max-w-md">
                        <h2 className="text-2xl font-bold uppercase mb-2 text-gray-200">Calibration: Dark Adaptation</h2>
                        <p className="mb-4 text-xs font-mono text-gray-500">Relax. Measuring pupillary dilation.</p>

                        <div className="w-full h-1 bg-gray-900 mt-4 mb-2 overflow-hidden border border-gray-800">
                            <div
                                className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-[10px] font-mono text-gray-600 mb-6">{Math.round(progress)}% COMPLETE</p>

                        <button
                            className={`px-6 py-2 transition-all font-mono text-xs uppercase tracking-widest mt-4 ${progress === 100 ? 'bg-white/10 hover:bg-white/20 text-white cursor-pointer' : 'bg-transparent text-gray-800 border border-gray-800 cursor-not-allowed'}`}
                            onClick={() => setState('COMPLETE')}
                            disabled={progress < 100}
                        >
                            Complete
                        </button>
                    </div>
                </div>
            )}
            {state === 'COMPLETE' && (
                <div className="flex flex-col items-center justify-center pointer-events-auto">
                    <div className="p-8 text-green-500 border border-green-900/50 rounded-lg text-center backdrop-blur-sm bg-black/80 animate-pulse">
                        <h2 className="text-4xl font-bold uppercase mb-2 tracking-widest">System Online</h2>
                        <p className="font-mono text-xs text-green-700">Neural Interface Calibrated.</p>
                        <p className="font-mono text-[10px] text-green-900/80 mt-2">Awaiting Input...</p>
                        <button
                            className="mt-4 px-4 py-2 border border-green-800 text-green-800 hover:bg-green-900/20 text-xs font-mono uppercase"
                            onClick={() => startGame()}
                        >
                            Enter Simulation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
