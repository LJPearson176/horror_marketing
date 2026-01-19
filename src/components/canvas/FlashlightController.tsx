import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { SpotLight } from 'three';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';
import { audioManager } from '../../systems/audio/AudioManager';
import { useGameStore } from '../../systems/game/GameStore';
import * as THREE from 'three';

export const FlashlightController = () => {
    const rigRef = useRef<THREE.Group>(null);
    const lightRef = useRef<SpotLight>(null);
    const [target] = useState(() => new THREE.Object3D());
    const { camera } = useThree();
    const { metrics } = useBioSignalStore();

    // Game Store
    const {
        flashlightOn, flashlightBattery,
        toggleFlashlight, drainBattery, rechargeBattery
    } = useGameStore();

    // Internal state for noise
    const noiseOffset = useRef(Math.random() * 100);

    // Keybind for 'F'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'f') {
                toggleFlashlight();
                audioManager.playBeep(200, 0.05); // Click sound
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleFlashlight]);

    useFrame(({ clock }, delta) => {
        if (!rigRef.current || !lightRef.current) return;

        // Battery Logic
        if (flashlightOn) {
            // Drain 1.5% per second (Life: ~66 seconds)
            drainBattery(1.5 * delta);
        } else {
            // Recharge 3.0% per second (Recharge: ~33 seconds)
            rechargeBattery(3.0 * delta);
        }

        const t = clock.getElapsedTime();

        // 1. Calculate Arousal
        const rawArousal = (metrics.heartRate - 60) / (140 - 60);
        const arousal = Math.max(0, Math.min(1, rawArousal));

        // 2. Sync Rig to Camera
        rigRef.current.position.copy(camera.position);
        rigRef.current.quaternion.copy(camera.quaternion);

        // 3. Tremor Logic (Unchanged)
        let noiseX = 0;
        let noiseY = 0;

        if (arousal > 0.2) {
            const freq = arousal > 0.7 ? 2.0 : 15.0;
            const amp = arousal > 0.7 ? 0.5 : 0.05;

            noiseX = Math.sin(t * freq + noiseOffset.current) * amp * arousal;
            noiseY = Math.cos(t * freq * 1.3 + noiseOffset.current) * amp * arousal;
        }

        const localTarget = new THREE.Vector3(noiseX, noiseY, -20);
        localTarget.applyMatrix4(rigRef.current.matrixWorld);

        target.position.copy(localTarget);
        target.updateMatrixWorld();
        lightRef.current.target = target;

        // 4. Intensity & Flicker
        let intensity = flashlightOn ? 50.0 : 0.0;

        // Dimming based on Battery
        const batteryHealth = flashlightBattery / 100;
        intensity *= Math.max(0.1, batteryHealth); // Never fully black if ON, but very dim

        // Low Battery Flicker (< 20%)
        if (flashlightOn && flashlightBattery < 20) {
            if (Math.random() > 0.8 + (batteryHealth)) { // More flicker as health drops
                intensity = 0;
            }
        }

        // Arousal Flicker (Sanity Glitch)
        if (flashlightOn && arousal > 0.6) {
            const flickerThreshold = 0.95 - (arousal * 0.1);
            if (Math.random() > flickerThreshold) {
                intensity = Math.random() * 20.0;
                if (Math.random() > 0.5) audioManager.triggerGlitch();
            }
        }

        lightRef.current.intensity = intensity;

        // 5. Cone
        const baseAngle = 0.6;
        const constriction = arousal * 0.4;
        lightRef.current.angle = baseAngle - constriction;
        lightRef.current.penumbra = 0.5;
    });

    return (
        <>
            <group ref={rigRef}>
                <spotLight
                    ref={lightRef}
                    position={[0, 0, 0]}
                    intensity={50.0}
                    distance={60}
                    angle={0.6}
                    penumbra={0.5}
                    color="#ffeecc"
                    castShadow
                />

                {/* Volumetric Beam Mesh (Only Visible if ON and Battery > 0) */}
                {flashlightOn && flashlightBattery > 5 && (
                    <mesh position={[0, 0, -10]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.1, 4.0, 20, 32, 1, true]} />
                        <meshBasicMaterial
                            color="#ffffee"
                            transparent
                            opacity={0.03 * (flashlightBattery / 100)}
                            depthWrite={false}
                            blending={THREE.AdditiveBlending}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}
            </group>

            <primitive object={target} />
        </>
    );
};
