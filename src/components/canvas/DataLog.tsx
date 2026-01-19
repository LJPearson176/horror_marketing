import { useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../systems/game/GameStore';
import { audioManager } from '../../systems/audio/AudioManager';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface LogProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    data: {
        title: string;
        content: string;
        date: string;
    };
}

export const DataLog = ({ position, rotation = [0, 0, 0], data }: LogProps) => {
    const { camera } = useThree();
    const { setReadingLog, readingLog } = useGameStore();
    const [isHovered, setIsHovered] = useState(false);

    // Check Proximity
    useFrame(() => {
        if (readingLog) {
            setIsHovered(false);
            return;
        }

        const dist = camera.position.distanceTo(new THREE.Vector3(...position));
        if (dist < 2.5) {
            if (!isHovered) setIsHovered(true);
        } else {
            if (isHovered) setIsHovered(false);
        }
    });

    // Interaction
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isHovered && e.key.toLowerCase() === 'e') {
                setReadingLog(data);
                audioManager.playBeep(400, 0.1); // Scan sound
            }
        };

        if (isHovered) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, data, setReadingLog]);

    return (
        <group position={position} rotation={rotation as any}>
            {/* The Device (Tablet/Clipboard) */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.3, 0.4, 0.05]} />
                <meshStandardMaterial color="#333" roughness={0.6} />
            </mesh>

            {/* Screen */}
            <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[0.25, 0.35]} />
                <meshBasicMaterial color={isHovered ? "#00ff00" : "#004400"} />
            </mesh>

            {/* Glowing Status Light */}
            <pointLight
                position={[0, 0.15, 0.1]}
                distance={1}
                intensity={isHovered ? 2 : 0.5}
                color={isHovered ? "green" : "red"}
            />

            {/* Floating UI Prompt */}
            {isHovered && !readingLog && (
                <Html position={[0, 0.5, 0]} center>
                    <div style={{
                        color: 'white',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: '4px 8px',
                        border: '1px solid #00ff00',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        textAlign: 'center'
                    }}>
                        [E] EXAMINE LOG
                    </div>
                </Html>
            )}
        </group>
    );
};
