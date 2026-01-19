import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Noise, Vignette, Scanline } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Suspense, useEffect } from 'react';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';

import { FlashlightController } from './FlashlightController';
import { audioManager } from '../../systems/audio/AudioManager';
import { cognitiveEngine } from '../../systems/cognitive/CognitiveEngine';
import { useGameStore } from '../../systems/game/GameStore';
import { Hallway } from './Hallway';
import { PlayerRig } from './PlayerRig';
import { SnowMaze } from './SnowMaze'; // [NEW]
import { HallucinationOverlay } from './HallucinationOverlay';
import { LogOverlay } from '../ui/LogOverlay';
import { HUD } from '../ui/HUD';
import { ErrorBoundary } from '../debug/ErrorBoundary';


const SceneContent = () => {
    const { isGameActive, gameStatus } = useGameStore();

    // Audio Lifecycle
    useEffect(() => {
        console.log(`[SceneContent] Game Active Changed: ${isGameActive}`);
        if (isGameActive) {
            audioManager.init().then(() => {
                console.log("[SceneContent] Audio Manager Initialized");
                audioManager.startDrone();
                // Start listening to the void
                import('../../systems/perception/AudioInputAnalyzer').then(({ audioInputAnalyzer }) => {
                    audioInputAnalyzer.init();
                });
            }).catch(e => console.error("[SceneContent] Audio Init Failed:", e));
        } else {
            audioManager.stopDrone();
        }
    }, [isGameActive]);

    // Heartbeat Loop
    useEffect(() => {
        let timeoutId: any;

        const beatLoop = () => {
            const { affectiveState } = useBioSignalStore.getState();

            // Calculate BPM from Arousal (Simulated Bio-Feedback)
            // Arousal 0.0 -> 60 BPM
            // Arousal 1.0 -> 160 BPM
            const simulatedBpm = 60 + (affectiveState.arousal * 100);

            // Use real metrics if available/higher, otherwise use simulated
            // const { metrics } = useBioSignalStore.getState();
            // const bpm = Math.max(simulatedBpm, metrics.heartRate || 60); 
            // For now, force simulated to ensure gameplay effect
            const bpm = simulatedBpm;

            const safeBpm = Math.max(40, Math.min(180, bpm));

            // Always play if arousal > 0.3 (Lower threshold for tension)
            if (affectiveState.arousal > 0.3) {
                audioManager.triggerHeartbeat();
                useGameStore.getState().triggerHeartbeat(); // Visual sync
            }

            const interval = 60000 / safeBpm;
            timeoutId = setTimeout(beatLoop, interval);
        };

        beatLoop();

        return () => clearTimeout(timeoutId);
    }, []);

    useFrame(({ clock }) => {
        if (isGameActive) {
            // Update Drone based on Arousal AND Gaze Penalty
            const { affectiveState } = useBioSignalStore.getState();
            const { gazePenalty } = useGameStore.getState();

            if (affectiveState) {
                audioManager.updateDrone(affectiveState.arousal, gazePenalty);
            }

            // --- HIVE MIND ---
            // Ask the Brain what to do
            const action = cognitiveEngine.update(clock.getElapsedTime() * 1000);

            // Execute Action
            switch (action.type) {
                case 'AUDIO_SCREAM':
                    audioManager.triggerScream();
                    break;
                case 'AUDIO_WHISPER':
                    audioManager.triggerWhisper(action.location);
                    break;
                case 'LIGHT_FLICKER':
                    audioManager.triggerGlitch();
                    break;
                case 'LIGHT_OFF':
                    audioManager.trackDronePitch(0.5); // Deep sub-bass
                    break;
                case 'AUDIO_DRONE_PITCH':
                    break;
                case 'FAKE_OUT':
                    useGameStore.getState().triggerFakeOut(action.fakeType, action.duration);
                    break;
                case 'VISUAL_JUMPSCARE':
                    useGameStore.getState().triggerFakeOut('JUMP_SCARE', 200); // 200ms flash
                    audioManager.triggerScream(); // Screaming accompaniment
                    break;
                case 'START_CONTAINMENT':
                    useGameStore.getState().startContainment();
                    break;
                case 'GAZE_PUNISHMENT':
                    useGameStore.getState().triggerFakeOut('JUMP_SCARE', 200);
                    audioManager.triggerScream();
                    break;
                case 'NONE':
                    break;
            }
        }
    });

    // Dev Keybinds: 'S' for Scream, 'J' for Jumpscare
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Prevent repeated triggers
            if (e.repeat) return;

            // Allow system keys
            if (e.metaKey || e.ctrlKey) return;

            // FIX: Prevent Default immediately for mapped keys to stop system beep
            if (key === 'j') {
                e.preventDefault();
                // Ensure audio context is ready
                await audioManager.init();
            }

            if (key === 'j') {
                console.log("DEBUG: Forcing Jumpscare");
                useGameStore.getState().triggerFakeOut('JUMP_SCARE', 500);
                audioManager.triggerScream(); // Manual trigger since Overlay no longer does it
            }

            if (key === 'c') {
                console.log("DEBUG: Forcing Containment Breach");
                useGameStore.getState().startContainment();
            }

            // [NEW] Debug Trigger for Maze
            if (key === 'm') {
                console.log("DEBUG: Forcing Snow Maze");
                useGameStore.getState().enterMaze();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);



    return (
        <>
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 5, 45]} />

            <ambientLight intensity={0.05} />

            <FlashlightController />

            {/* CONDITIONAL RENDERING: HALLWAY OR MAZE */}
            {gameStatus === 'MAZE' ? (
                <SnowMaze />
            ) : (
                <Hallway />
            )}

            <PlayerRig />

            {/* --- VISUAL HALLUCINATIONS --- */}
            {/* <HallucinationOverlay /> */}

            {/* --- POST PROCESSING (ANALOG HORROR) --- */}
            <EffectComposer>
                <Noise opacity={0.15} blendFunction={BlendFunction.OVERLAY} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                <Scanline density={1.5} opacity={0.1} />
            </EffectComposer>
        </>
    );
};

export const SceneController = () => {
    return (
        <div className="absolute inset-0 z-0">
            <LogOverlay />
            <HUD />
            <Canvas
                camera={{ position: [0, 0, 5], fov: 75 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
                onCreated={() => console.log("[SceneController] Canvas Created")}
            >
                <ErrorBoundary name="SceneContent">
                    <Suspense fallback={<group><mesh><boxGeometry /><meshBasicMaterial color="magenta" /></mesh></group>}>
                        <SceneContent />
                    </Suspense>
                </ErrorBoundary>
            </Canvas>
        </div>
    );
};
