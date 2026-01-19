// @ts-nocheck
import { EffectComposer, ChromaticAberration, Noise, Glitch, Vignette, HueSaturation } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';
import * as THREE from 'three';
import { Vector2 } from 'three';

import { useGameStore } from '../../systems/game/GameStore';

export const HallucinationOverlay = () => {
    const { affectiveState } = useBioSignalStore();
    const { containmentActive, gazePenalty, lastBeatTime } = useGameStore(); // Phase 7
    const arousal = affectiveState.arousal;

    // Heartbeat Visual Pulse (Decay over 200ms)
    const timeSinceBeat = Date.now() - lastBeatTime;
    const pulseActive = timeSinceBeat < 200; // 200ms flash
    const pulseIntensity = pulseActive ? (1 - (timeSinceBeat / 200)) * 0.5 : 0; // 0.5 max intensity

    // Derived values
    // Chromatic Aberration: Arousal + Extreme Gaze Penalty + Heartbeat Pulse
    const chromaOffset = new Vector2(
        (arousal * 0.005) + (gazePenalty * 0.05) + (pulseIntensity * 0.02),
        (arousal * 0.005) + (gazePenalty * 0.02)
    );

    // Noise: Arousal + Gaze Penalty
    const noiseOpacity = Math.max(0.05, (arousal * 0.1) + (gazePenalty * 0.5));

    // Vignette heavily impacted by Gaze Penalty + Pulse (Red Tint implied by context or darkness?)
    // PostProcessing Vignette is usually black/darkness. pulsing darkness is also scary.
    // Darkness: Base 0.3 + Arousal + Penalty + Pulse
    const vignetteDarkness = 0.3 + (arousal * 0.4) + (gazePenalty * 0.8) + pulseIntensity;
    // Refs for post-processing effects to be updated in useFrame
    const chromaRef = useRef();
    const noiseRef = useRef();
    const vignetteRef = useRef();

    // Glitch logic: High arousal OR Containment Breach OR High Penalty
    const glitchActive = arousal > 0.85 || containmentActive || gazePenalty > 0.9;

    // 2. Continuous Hallucinations based on Gaze Penalty & Audio
    useFrame((state) => {
        const { gazePenalty, lastBeatTime } = useGameStore.getState(); // Re-fetch lastBeatTime for useFrame
        const { metrics } = useBioSignalStore.getState();

        // --- AUDIO REACTIVITY (Voice Vibrations) ---
        // Audio 0-1.
        // If Audio > 0.1, we start glitching.
        const audioGlitch = Math.max(0, (metrics.audioLevel - 0.1) * 2.0); // 0 -> 1.8 roughly

        // Base penalty effects
        const penaltyFactor = gazePenalty;

        if (chromaRef.current) {
            // Pulse with Heartbeat + Gaze Penalty + Voice
            const baseOffset = new THREE.Vector2(0.002, 0.002);

            // Heartbeat Pulse
            const beatTime = state.clock.elapsedTime * 1000 - lastBeatTime;
            const pulseIntensity = Math.max(0, 1 - beatTime / 300); // 300ms decay

            // Voice Vibration (Jitter)
            const voiceShake = audioGlitch * 0.05;

            chromaRef.current.offset.x =
                (baseOffset.x + (penaltyFactor * 0.05) + (pulseIntensity * 0.01) + voiceShake) *
                ((Math.random() > 0.5) ? 1 : -1);

            chromaRef.current.offset.y =
                (baseOffset.y + (penaltyFactor * 0.05) + (pulseIntensity * 0.01) + voiceShake) *
                ((Math.random() > 0.5) ? 1 : -1);
        }

        if (noiseRef.current) {
            // Penalty noise + Voice static
            noiseRef.current.opacity = 0.15 + (penaltyFactor * 0.5) + (audioGlitch * 0.3);
        }

        if (vignetteRef.current) {
            // Vignette darkness based on penalty and pulse
            vignetteRef.current.darkness = 0.3 + (penaltyFactor * 0.8) + (pulseIntensity * 0.5);
        }
    });

    return (
        <EffectComposer disableNormalPass>
            <ChromaticAberration
                ref={chromaRef} // Attach ref
                radialModulation={false}
                modulationOffset={0}
            // offset will be controlled by useFrame
            />
            <Noise
                ref={noiseRef} // Attach ref
                blendFunction={BlendFunction.OVERLAY}
            // opacity will be controlled by useFrame
            />
            <Vignette
                ref={vignetteRef} // Attach ref
                eskil={false}
                offset={0.1}
            // darkness will be controlled by useFrame
            />
            <HueSaturation
                saturation={-1 * gazePenalty} // Desaturate as penalty increases
            />
            {/* <Glitch
                delay={[1.5, 3.5]}
                duration={[0.1, 0.3]}
                strength={[0.3, 1.0]}
                mode={GlitchMode.SPORADIC}
                active={glitchActive}
                ratio={0.85}
            /> */}
        </EffectComposer>
    );
};
