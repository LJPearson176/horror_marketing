import { useBioSignalStore } from '../perception/BioSignalStore';
// Fix import path: affect/ -> calibration/
import { useCalibrationStore } from '../calibration/CalibrationManager';
import { useGameStore } from '../game/GameStore';

class AffectiveEngine {
    // Config
    private readonly HR_WEIGHT = 0.6;
    private readonly PUPIL_WEIGHT = 0.4;
    private lastDistance = 0;

    public update() {
        // Run at ~30Hz max, or just every frame. Frame is fine.

        const bioStore = useBioSignalStore.getState();
        const calStore = useCalibrationStore.getState();
        const metrics = bioStore.metrics;

        // --- 1. NORMALIZATION (Z-Score) ---
        // We need baselines. If calibration incomplete, use defaults.
        const restingHR = calStore.baselines.hr?.mean || 60;
        const restingPupil = calStore.baselines.pupil?.mean || 8.0; // Updated for Normalized Scale (Iris ratio * 100)

        // HR Arousal: (Current - Resting) / Range
        // Max HR assumed ~140 (Panic)
        const hrDelta = metrics.heartRate - restingHR;
        const hrArousal = Math.max(0, Math.min(1, hrDelta / 80)); // 80bpm range above resting

        // Pupil Arousal: (Current - Resting) / Range
        // Pupil expands ~1-2mm in arousal.
        const avgPupil = (metrics.leftPupilDiameter + metrics.rightPupilDiameter) / 2;
        const pupilDelta = avgPupil - restingPupil;
        const pupilArousal = Math.max(0, Math.min(1, pupilDelta / 1.5));

        // --- 2. SENSOR FUSION (Confidence Weighted) ---
        // Weights
        const hrConf = metrics.hrConfidence || 0;
        const pupilConf = metrics.pupilConfidence || 0;

        // "Paranoia" / Simulation Mode
        // If sensors are offline/noisy (low confidence), sim internal anxiety.
        let simArousal = 0;
        if (hrConf < 0.3 && pupilConf < 0.3) {
            // Low signal quality -> Drift towards mild panic
            // Use time-based noise or just random walk?
            // Simple: Drift between 0.3 and 0.6
            const noise = (Math.sin(Date.now() / 2000) * 0.5 + 0.5); // 0-1 Slow wave
            simArousal = 0.3 + (noise * 0.3);
        }

        // Avoid div/0
        const totalWeight = (this.HR_WEIGHT * hrConf) + (this.PUPIL_WEIGHT * pupilConf) + 0.001;

        let fusedArousal = (
            (hrArousal * this.HR_WEIGHT * hrConf) +
            (pupilArousal * this.PUPIL_WEIGHT * pupilConf) +
            (simArousal * 0.5 * (1.0 - Math.min(1, hrConf + pupilConf))) // Add Sim if conf is low
        ) / (totalWeight + (1.0 - Math.min(1, hrConf + pupilConf)) * 0.5);

        // --- 3. PALLOR MODIFIER (The "Fear" Boost) ---
        // Pallor < -0.1 means blood draining (Fear).
        // Modulate arousal UP if Pale.
        if (metrics.pallor < -0.1) {
            // Boost arousal by up to 20% based on pallor depth
            fusedArousal += Math.min(0.3, Math.abs(metrics.pallor));
        }

        // --- 3.1 MOTION / SURPRISE MODIFIER (Delta Z) ---
        // "We do want the distance to help in detecting a user jump back or suprise motion."
        // We need to track previous distance to find delta.
        // We will store lastDistance in the class instance (stateful).

        // Note: metrics.distanceZ is Inverse Face Width (Proximity).
        // Higher = Closer. Lower = Farther.
        // Jump Back = Sudden DECREASE in distanceZ.

        const currentDist = metrics.distanceZ || 0;

        if (this.lastDistance > 0 && currentDist > 0) {
            const delta = this.lastDistance - currentDist; // Positive if moving AWAY
            // Threshold for "Jump": Sudden change.
            // Typical frame-to-frame delta is small.
            // If delta > 0.005 (tuned), it's a jump.

            if (delta > 0.002) { // Sensitivity tuned
                // User recoiled.
                console.log("AffectiveEngine: SURPRISE DETECTED (Recoil)", delta);
                // Immediate Arousal Spike
                fusedArousal += 0.4;
                // Potentially trigger "Gasp" audio via Brain?
                // For now, just spike arousal.
            }
        }
        this.lastDistance = currentDist;


        const { gazePenalty } = useGameStore.getState();
        if (gazePenalty > 0) {
            // Darkness/Fear overrides calm.
            // If penalty is 1.0 (Darkness), Arousal forced to > 0.8
            fusedArousal = Math.max(fusedArousal, gazePenalty * 0.9);
        }

        // --- 4. SMOOTHING / DECAY ---
        // Lerp functionality or simple decay?
        // Let's Lerp towards the new target for smoothness
        const currentArousal = bioStore.affectiveState.arousal;
        const alpha = 0.1; // Smooth factor

        const smoothArousal = currentArousal + (fusedArousal - currentArousal) * alpha;

        // --- 5. UPDATE STORE ---
        bioStore.setAffectiveState({
            arousal: Math.max(0, Math.min(1, smoothArousal)),
            valence: 0, // TODO: Blendshape analysis
            dominance: metrics.pallor < -0.2 ? 0.2 : 0.5 // Pale = Low Dominance (Fear)
        });
    }
}

export const affectiveEngine = new AffectiveEngine();
