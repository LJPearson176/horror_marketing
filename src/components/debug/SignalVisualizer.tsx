import { useBioSignalStore } from '../../systems/perception/BioSignalStore';

import { useCalibrationStore } from '../../systems/calibration/CalibrationManager';
import { useGameStore } from '../../systems/game/GameStore';

export const SignalVisualizer = () => {
    const { metrics, isFaceDetected, workerStatus, workerError } = useBioSignalStore();
    const { buffers, isCalibrating } = useCalibrationStore();

    // Quick stats for debug display
    const sampleCount = buffers.pupilDiameters.length;
    const currentMean = sampleCount > 0
        ? (buffers.pupilDiameters.reduce((a, b) => a + b, 0) / sampleCount) * 100 // Scale for display
        : 0;

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-black/80 border border-red-900/50 rounded text-xs font-mono text-green-500 w-64 pointer-events-none">
            <h3 className="text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">Bio-Metrics (DEBUG)</h3>

            <div className="flex justify-between mb-1">
                <span>System:</span>
                <span className={workerStatus === 'READY' ? "text-green-400" : "text-yellow-500"}>
                    {workerStatus}
                </span>
            </div>

            {workerStatus === 'ERROR' && (
                <div className="mb-2 p-1 bg-red-900/50 border border-red-500 rounded text-red-300 break-words whitespace-pre-wrap">
                    {workerError || "Unknown Error"}
                </div>
            )}

            <div className="flex justify-between mb-1">
                <span>Face Lock:</span>
                <span className={isFaceDetected ? "text-green-400" : "text-red-500"}>
                    {isFaceDetected ? "LOCKED" : "SEARCHING"}
                </span>
            </div>

            <div className="flex justify-between mb-1">
                <span>Heart Rate (Raw):</span>
                <span>{metrics.heartRate.toFixed(1)} BPM</span>
            </div>

            <div className="flex justify-between mb-1 text-gray-500">
                <span>Signal (G):</span>
                <span className="font-mono">{metrics.rawRPPG.toFixed(2)}</span>
            </div>

            <div className="flex justify-between mb-1 text-blue-400">
                <span>Pupil Ø (L/R):</span>
                <span className="font-mono">
                    {(metrics.leftPupilDiameter * 100).toFixed(3)} / {(metrics.rightPupilDiameter * 100).toFixed(3)}
                </span>
            </div>


            <div className="flex justify-between mb-1 text-purple-400">
                <span>Eyes (L|R):</span>
                <span className="font-mono text-[10px]">
                    {useBioSignalStore.getState().isLeftEyeClosed ? "CLSD" : "OPEN"} ({metrics.leftEAR.toFixed(2)}) | {useBioSignalStore.getState().isRightEyeClosed ? "CLSD" : "OPEN"} ({metrics.rightEAR.toFixed(2)})
                </span>
            </div>

            <div className="flex justify-between mb-1 text-yellow-400">
                <span>Blink Rate (1m):</span>
                <span className="font-mono">{metrics.blinkRate}</span>
            </div>

            <div className="border-t border-gray-800 my-2 pt-1">
                <h4 className="text-gray-500 text-[10px] uppercase mb-1">Gameplay Dynamics</h4>

                <div className="flex justify-between mb-1 text-orange-400">
                    <span>Arousal:</span>
                    <span className="font-mono">{(useBioSignalStore.getState().affectiveState.arousal * 100).toFixed(0)}%</span>
                </div>

                <div className="flex justify-between mb-1 text-pink-400">
                    <span>Audio In:</span>
                    <span className="font-mono">{(metrics.audioLevel * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-900 h-1 mb-2">
                    <div className="bg-pink-500 h-full transition-all duration-75" style={{ width: `${Math.min(100, metrics.audioLevel * 100)}%` }} />
                </div>

                <div className="flex justify-between mb-1 text-red-400">
                    <span>Gaze Penalty:</span>
                    <span className="font-mono">{(useGameStore.getState().gazePenalty * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-900 h-1 mb-2">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${useGameStore.getState().gazePenalty * 100}%` }} />
                </div>

                <div className="flex justify-between mb-1">
                    <span>Containment:</span>
                    <span className={useGameStore.getState().containmentActive ? "text-red-500 animate-pulse font-bold" : "text-gray-500"}>
                        {useGameStore.getState().containmentActive ? "BREACH" : "STABLE"}
                    </span>
                </div>
            </div>

            <div className="border-t border-gray-800 my-2 pt-1">
                <div className="flex justify-between mb-1 text-gray-400">
                    <span>Calibration:</span>
                    <span className={isCalibrating ? "text-green-400 animate-pulse" : "text-gray-600"}>
                        {isCalibrating ? "ACTIVE" : "IDLE"}
                    </span>
                </div>
                {sampleCount > 0 && (
                    <div className="flex justify-between mb-1 text-cyan-600">
                        <span>Buffer (N/Mean):</span>
                        <span className="font-mono text-[10px]">
                            {sampleCount} / {currentMean.toFixed(3)}
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-2 h-16 w-full bg-gray-900 overflow-hidden relative border border-gray-700">
                {/* Placeholder for real graph canvas later */}
                <div className="absolute top-1/2 w-full h-[1px] bg-gray-800" />
                <p className="text-[10px] text-gray-600 p-1">rPPG Signal Graph (TODO)</p>
            </div>
        </div>
    );
};
