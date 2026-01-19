import { useBioSignalStore } from '../perception/BioSignalStore';
import { useGameStore } from '../game/GameStore';

// Actions the Brain can take
export type CognitiveAction =
    | { type: 'NONE' }
    | { type: 'LIGHT_FLICKER', intensity: number }
    | { type: 'LIGHT_OFF', duration: number }
    | { type: 'AUDIO_SCREAM' }
    | { type: 'AUDIO_WHISPER', location: 'left' | 'right' }
    | { type: 'AUDIO_DRONE_PITCH', pitch: number }
    | { type: 'FAKE_OUT', fakeType: 'CONNECTION_LOST' | 'FACE_NOT_DETECTED' | 'CRITICAL_ERROR', duration: number }
    | { type: 'VISUAL_JUMPSCARE' }
    | { type: 'START_CONTAINMENT' }
    | { type: 'GAZE_PUNISHMENT' };

class CognitiveEngine {
    private lastDecisionTime = 0;
    private decisionInterval = 1000; // Decision every 1s initially

    // Cooldown Manager
    private lastActionTime = 0;
    private actionCooldown = 3000; // Minimum 3s between major actions
    private fakeOutCooldown = 30000; // 30s between Fake Outs
    private lastFakeOutTime = 0;

    // Simulation / World Model
    // Predicts: Next Affective State given Action

    public async init() {
        console.log("Cognitive Engine: Initializing ONNX Runtime...");
        try {
            // Future: Load actual .onnx model
            // this.session = await ONNX.InferenceSession.create('/models/jepa_predictor.onnx');
            console.log("Cognitive Engine: ONNX Runtime Ready (Stub Mode)");
        } catch (e) {
            console.warn("Cognitive Engine: Failed to load brain", e);
        }
    }

    public update(timestamp: number): CognitiveAction {
        // --- CONTINUOUS STATE UPDATES (Per Frame) ---
        const { isFaceLocked, isFaceDetected, metrics } = useBioSignalStore.getState();
        const { gazePenalty, setGazePenalty } = useGameStore.getState();

        let newPenalty = gazePenalty;

        // 1. Gaze Penalty (Looking Away)
        // [Refined Logic]: Must be looking AT screen (Center).
        const isLookingAtScreen = isFaceDetected && (metrics.gazeAlignment > 0.4);

        if (isFaceLocked && isLookingAtScreen) {
            newPenalty -= 0.01; // Fast Recovery (Trusted & Focused)
        } else if (isFaceDetected && isLookingAtScreen) {
            newPenalty -= 0.002; // Slow Recovery (Immediate Mercy)
        } else {
            // Punishment conditions:
            // 1. Face Missing
            // 2. Head Turned (Implicit in Face Missing usually)
            // 3. Eyes Averted (gazeAlignment < 0.4)
            newPenalty += 0.005;
        }

        // 2. Audio Penalty (Making Noise)
        // If speaking (audioLevel > 0.4), penalty rises FAST.
        if (metrics.audioLevel > 0.4) {
            newPenalty += 0.02;
            console.log("Brain: NOISE DETECTED. AGGRO RISING.", metrics.audioLevel);
        }

        // 3. Scream Penalty (Immediate Danger)
        if (metrics.isScreaming) {
            newPenalty += 0.1; // Instant spike
        }

        newPenalty = Math.max(0, Math.min(1.0, newPenalty));
        setGazePenalty(newPenalty);

        // Immediate Retaliation for Screaming (Bypasses Decision Interval?)
        // Let's allow it to bypass interval if cooldown is ready, OR force it.
        if (metrics.isScreaming && (timestamp - this.lastActionTime > 1000)) {
            this.lastActionTime = timestamp;
            console.log("Brain: SUBJECT SCREAMED. RETALIATING.");
            return { type: 'AUDIO_SCREAM' };
        }

        // --- DECISION INTERVAL CHECK ---
        if (timestamp - this.lastDecisionTime < this.decisionInterval) {
            return { type: 'NONE' };
        }

        this.lastDecisionTime = timestamp;

        // Cooldown check for Major Actions
        if (timestamp - this.lastActionTime < this.actionCooldown) {
            return { type: 'NONE' };
        }

        const { affectiveState } = useBioSignalStore.getState();
        const { arousal } = affectiveState;

        // Guaranteed punishment at max penalty (Throttled by Decision Interval)
        if (newPenalty > 0.95 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
            return { type: 'GAZE_PUNISHMENT' };
        }

        // --- 1. ENCODE OBSERVATION ---
        // Map [Arousal, Valence, Dominance] -> Latent Space
        // Stub: Just raw mapping

        // --- 2. JEPA PREDICTION (Mental Simulation) ---
        // "If I scream, arousal goes up."
        // "If I stay silent, arousal decays."

        // --- 3. MOE ROUTER (Policy Selection) ---
        // Policy: "The Tormentor" V1.2 (Jumpscare + Containment)
        // Goal: Keep arousal between 0.6 and 0.8 (High tension, but not numbing panic)

        let action: CognitiveAction = { type: 'NONE' };

        if (arousal < 0.4) {
            // Bored (<0.4)
            // Goal: Agitate.
            if (Math.random() > 0.9) {
                // Rare Fake Out check
                if (Math.random() > 0.95 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                    action = { type: 'FAKE_OUT', fakeType: 'FACE_NOT_DETECTED', duration: 4000 };
                    this.lastFakeOutTime = timestamp;
                    console.log("Brain: Gaslighting subject (Face Not Detected)");
                } else {
                    action = { type: 'AUDIO_SCREAM' };
                    console.log("Brain: Bored. Poking subject.");
                }
                this.lastActionTime = timestamp;
            } else {
                // Subtle creeping dread (Very commmon)
                if (Math.random() > 0.6) {
                    action = { type: 'AUDIO_DRONE_PITCH', pitch: 1.1 + Math.random() * 0.2 };
                    this.lastActionTime = timestamp;
                }
            }
        } else if (arousal > 0.95) {
            // CRITICAL PANIC (>0.95)
            // JUMPSCARE TIME?
            if (Math.random() > 0.8 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                action = { type: 'VISUAL_JUMPSCARE' };
                this.lastFakeOutTime = timestamp;
                console.log("Brain: JUMPSCARE!");
                this.lastActionTime = timestamp;
            } else {
                action = { type: 'LIGHT_OFF', duration: 300 };
                this.lastActionTime = timestamp;
            }
        } else if (arousal > 0.9) {
            // Panic (>0.9)
            // Goal: Mercy or Breaking Point.
            if (Math.random() > 0.9 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                action = { type: 'FAKE_OUT', fakeType: 'CRITICAL_ERROR', duration: 5000 };
                this.lastFakeOutTime = timestamp;
                console.log("Brain: Fake Crash (Mercy)");
                this.lastActionTime = timestamp;
            } else {
                // High chance of mercy (Lights Off)
                if (Math.random() > 0.5) {
                    action = { type: 'LIGHT_OFF', duration: 200 };
                    this.lastActionTime = timestamp;
                }
            }
        } else {
            // Flow (0.4 - 0.9)
            // Goal: Maintain.

            // Phase 7: Containment Check
            // If arousal > 0.7, 10% chance per tick to trigger containment breach
            if (arousal > 0.7 && Math.random() > 0.90 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                action = { type: 'START_CONTAINMENT' };
                // Containment is a special state, doesn't strictly follow fakeOut cooldown but we use it to prevent spam
                this.lastFakeOutTime = timestamp;
                this.lastActionTime = timestamp;
                console.log("Brain: CONTAINMENT BREACH INITIATED");
            }
            else if (Math.random() > 0.995 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                action = { type: 'VISUAL_JUMPSCARE' };
                this.lastFakeOutTime = timestamp;
                console.log("Brain: Random JUMPSCARE (Flow Break)!");
                this.lastActionTime = timestamp;
            } else if (Math.random() > 0.99 && (timestamp - this.lastFakeOutTime > this.fakeOutCooldown)) {
                action = { type: 'FAKE_OUT', fakeType: 'CONNECTION_LOST', duration: 3000 };
                this.lastFakeOutTime = timestamp;
                this.lastActionTime = timestamp;
            } else if (Math.random() > 0.8) {
                action = { type: 'AUDIO_WHISPER', location: Math.random() > 0.5 ? 'left' : 'right' };
                this.lastActionTime = timestamp;
            }
        }

        return action;
    }
}

export const cognitiveEngine = new CognitiveEngine();
