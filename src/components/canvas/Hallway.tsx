import { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';
import { audioManager } from '../../systems/audio/AudioManager';
import { useGameStore } from '../../systems/game/GameStore';
import { DataLog } from './DataLog';
import { LOG_ENTRIES } from '../../data/Lore';

// Debug Logger
// const log = (msg: string) => console.log(`[Hallway] ${msg}`);

// Constants
const SEGMENT_LENGTH = 10;

const HALL_WIDTH = 4;
const HALL_HEIGHT = 3.5;

// Hanging wires using simple bezier curves
const WireClutter = () => {
    // Generate random wire curve
    const points = useMemo(() => {
        const start = new THREE.Vector3((Math.random() - 0.5) * HALL_WIDTH, HALL_HEIGHT / 2 - 0.1, (Math.random() - 0.5) * SEGMENT_LENGTH);
        const end = new THREE.Vector3((Math.random() - 0.5) * HALL_WIDTH, HALL_HEIGHT / 2 - 0.1, (Math.random() - 0.5) * SEGMENT_LENGTH);
        // Hang down in middle
        const mid = new THREE.Vector3(
            (start.x + end.x) / 2,
            HALL_HEIGHT / 2 - 1.0 - Math.random(), // Hang 1-2m down
            (start.z + end.z) / 2
        );
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        return curve.getPoints(20);
    }, []);

    const line = useMemo(() => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: "#111", linewidth: 2 });
        return new THREE.Line(geometry, material);
    }, [points]);

    return <primitive object={line} />;
};

const ShadowFigure = ({ visible = true, zOffset: externalZOffset = 0 }: { visible?: boolean, zOffset?: number }) => {
    const { affectiveState, isLeftEyeClosed, isRightEyeClosed } = useBioSignalStore();
    const meshRef = useRef<THREE.Mesh>(null);
    const [hasWhispered, setHasWhispered] = useState(false);

    // Position state
    const [zOffset, setZOffset] = useState(0);

    useFrame((_state, delta) => {
        if (!meshRef.current) return;

        // Is User Blinking? (Both eyes closed)
        const isBlinking = isLeftEyeClosed && isRightEyeClosed;

        // "Don't Blink" Mechanic
        if (isBlinking) {
            // Move closer quickly when blinking
            // Delta * Speed
            const approachSpeed = 8.0;
            const nextZ = zOffset + (approachSpeed * delta);
            // Cap max approach (don't clip through camera yet, assume camera is at approx +5 relative to segment start)
            if (nextZ < 4.0) {
                setZOffset(nextZ);
            }
        }

        // Apply Position
        // Base position is [0, -1, 0] inside the group
        // We add zOffset to come closer
        // Also add externalZOffset (from parent spawn logic)
        meshRef.current.position.z = zOffset + externalZOffset;

        // Only visible if Arousal > 0.6 AND parent says so (visible prop)
        const isVisible = visible && (affectiveState.arousal > 0.6);
        meshRef.current.visible = isVisible;

        if (isVisible) {
            // Jitter position slightly (X/Y)
            meshRef.current.position.x = (Math.random() - 0.5) * 0.2;

            // Trigger Audio Once per appearance
            if (!hasWhispered) {
                audioManager.triggerWhisper('center');
                setHasWhispered(true);
            }
        } else {
            // Reset if hidden (wanders off)
            if (hasWhispered && Math.random() > 0.99) {
                setHasWhispered(false);
                setZOffset(0); // Reset distance
            }
        }
    });

    return (
        <mesh ref={meshRef} position={[0, -1, 0]}>
            <planeGeometry args={[0.8, 2]} />
            <meshBasicMaterial
                color="black"
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};


const FlushMountLight = ({ position }: { position: [number, number, number] }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (!lightRef.current || !meshRef.current) return;

        // Flickering Logic (White Light)
        // Mostly on, random flickers off
        if (Math.random() > 0.95) {
            // Flicker dim
            lightRef.current.intensity = Math.random() * 0.5;
            (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
        } else {
            // Normal On
            lightRef.current.intensity = 1.5;
            (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
        }
    });

    return (
        <group position={position}>
            {/* Base */}
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.3, 0.35, 0.1, 32]} />
                <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Diffuser (Bulb) */}
            <mesh ref={meshRef} position={[0, 0, 0]}>
                <sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={1.0}
                    roughness={0.1}
                />
            </mesh>
            <pointLight ref={lightRef} distance={8} decay={2} color="#ffffff" castShadow />
        </group>
    );
};

const TrashCan = ({ position }: { position: [number, number, number] }) => {
    const metalTexture = useLoader(THREE.TextureLoader, '/assets/brushed_metal.png');

    return (
        <group position={position}>
            {/* Can Body */}
            <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.15, 0.12, 0.5, 16]} />
                <meshStandardMaterial
                    map={metalTexture}
                    color="#888888"
                    roughness={0.4}
                    metalness={0.8}
                />
            </mesh>
            {/* Can Rim */}
            <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.01, 8, 16]} />
                <meshStandardMaterial color="#111" roughness={0.5} metalness={0.8} />
            </mesh>
            {/* Garbage inside (simple dark circle) */}
            <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.14, 16]} />
                <meshBasicMaterial color="#000" />
            </mesh>
        </group>
    );
};

const MedicalGurney = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
    return (
        <group position={position} rotation={rotation as any} scale={[1.25, 1.25, 1.25]}>
            {/* Bed Frame / Mattress */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.7, 0.2, 1.8]} />
                <meshStandardMaterial color="#eeeeee" roughness={0.9} /> {/* Dirty Sheet */}
            </mesh>

            {/* Legs */}
            <mesh position={[0.3, 0.2, 0.8]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
            <mesh position={[-0.3, 0.2, 0.8]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
            <mesh position={[0.3, 0.2, -0.8]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
            <mesh position={[-0.3, 0.2, -0.8]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>

            {/* Draped Cloth / Mess */}
            <mesh position={[0.1, 0.53, 0.4]} rotation={[0, 0.2, 0]}>
                <boxGeometry args={[0.4, 0.05, 0.4]} />
                <meshStandardMaterial color="#dddddd" />
            </mesh>
        </group>
    );
};

// Aesthetic Components
const SideDoor = ({ side, hasTag = false }: { side: 'left' | 'right', hasTag?: boolean }) => {
    const xPos = side === 'left' ? -HALL_WIDTH / 2 + 0.1 : HALL_WIDTH / 2 - 0.1;
    const rotY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    // Load wood texture
    const woodTexture = useLoader(THREE.TextureLoader, '/assets/wood_dark.png');

    return (
        <group position={[xPos, -0.5, 0]} rotation={[0, rotY, 0]}>
            {/* Door Frame */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.4, 2.5, 0.1]} />
                <meshStandardMaterial color="#331100" roughness={0.6} />
            </mesh>
            {/* Door Leaf (Wood) */}
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[1.2, 2.3, 0.05]} />
                <meshStandardMaterial
                    map={woodTexture}
                    color="#ffffff"
                    roughness={0.3}
                />
            </mesh>
            {/* Knob */}
            <mesh position={[0.4, 0.0, 0.0]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshStandardMaterial color="#ffd700" metalness={1.0} roughness={0.1} />
            </mesh>

            {/* Room 237 Red Tag */}
            {hasTag && (
                <group position={[0.4, -0.15, 0.05]} rotation={[0, 0, 0.1]}>
                    <mesh>
                        <boxGeometry args={[0.08, 0.15, 0.01]} />
                        <meshStandardMaterial color="#aa0000" />
                    </mesh>
                    {/* Ring */}
                    <mesh position={[0, 0.1, 0]}>
                        <torusGeometry args={[0.02, 0.005, 8, 16]} />
                        <meshStandardMaterial color="silver" metalness={1} roughness={0.2} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

const DustParticles = () => {
    // Sparse ash/soot
    const count = 20;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * HALL_WIDTH;
            pos[i * 3 + 1] = (Math.random() - 0.5) * HALL_HEIGHT;
            pos[i * 3 + 2] = (Math.random() - 0.5) * SEGMENT_LENGTH;
        }
        return pos;
    }, []);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color="#222222"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
};



// --- NEW ASSETS: ELEVATOR & BLOOD ---

const ElevatorDoors = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            {/* Frame */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[3.0, 2.5, 0.1]} />
                <meshStandardMaterial color="#222" roughness={0.7} />
            </mesh>
            {/* Doors (Gold/Bronze) */}
            <mesh position={[-0.7, 0, 0.05]}>
                <boxGeometry args={[1.3, 2.4, 0.05]} />
                <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0.7, 0, 0.05]}>
                <boxGeometry args={[1.3, 2.4, 0.05]} />
                <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Dial Indicators */}
            <mesh position={[-0.7, 1.4, 0.05]}>
                <circleGeometry args={[0.2, 16]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.7, 1.4, 0.05]}>
                <circleGeometry args={[0.2, 16]} />
                <meshStandardMaterial color="#111" />
            </mesh>
        </group>
    );
};

const BloodWave = ({ position }: { position: [number, number, number] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 500;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Initialize particle data
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                x: (Math.random() - 0.5) * 3.8, // Full width of hall
                y: -1.7 + Math.random() * 3.5,  // Height (Wave height)
                z: -10 + Math.random() * 6,     // Depth spread near elevator
                speedZ: 0.05 + Math.random() * 0.15, // Forward flow
                speedY: -0.01 - Math.random() * 0.05, // Gravity
                scale: Math.random() * 0.3 + 0.1,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }
        return temp;
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;

        particles.forEach((p, i) => {
            // Update Physics
            p.z += p.speedZ;
            p.y += p.speedY;

            // Rotation for chaos
            dummy.rotateX(p.rotSpeed);
            dummy.rotateY(p.rotSpeed);

            // Simulation Bounds & Reset
            // If hits floor or too close to camera
            if (p.y < -1.75 || p.z > 0) {
                // Respawn at source (Elevator)
                p.z = -10 + Math.random() * 2;
                p.y = -0.5 + Math.random() * 3.0; // High up spray
                p.x = (Math.random() - 0.5) * 3.5;
                p.speedY = -0.02 - Math.random() * 0.05; // Reset gravity
            }

            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group position={position}>
            {/* Floor Puddle (Reflection) */}
            <mesh position={[0, -1.74, -4]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[3.8, 14]} />
                <meshStandardMaterial
                    color="#660000"
                    roughness={0.02}
                    metalness={0.8}
                    emissive="#330000"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* The Particle Flow */}
            <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshStandardMaterial
                    color="#aa0000"
                    roughness={0.1}
                    metalness={0.7}
                    emissive="#550000"
                    emissiveIntensity={0.1}
                />
            </instancedMesh>

            {/* Volumetric Glow (Fake) */}
            <pointLight position={[0, 0, -5]} color="#ff0000" intensity={5} distance={10} decay={2} />
        </group>
    );
};

const SideHallway = ({ position, rotation, variant = 'standard' }: { position: [number, number, number], rotation: [number, number, number], variant?: 'standard' | 'elevator_blood' }) => {
    // Reuse textures (Ideally pass dows, but unique instance is fine for now)
    const carpetTexture = useLoader(THREE.TextureLoader, '/assets/carpet_overlook.png');

    // Depth of side hallway
    const SIDE_DEPTH = 20;

    return (
        <group position={position} rotation={rotation as any}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -HALL_HEIGHT / 2, -SIDE_DEPTH / 2 + HALL_WIDTH / 2]} receiveShadow>
                <planeGeometry args={[HALL_WIDTH, SIDE_DEPTH]} />
                <meshStandardMaterial map={carpetTexture} roughness={0.8} />
            </mesh>

            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT / 2, -SIDE_DEPTH / 2 + HALL_WIDTH / 2]} receiveShadow>
                <planeGeometry args={[HALL_WIDTH, SIDE_DEPTH]} />
                <meshStandardMaterial color="#e8e8e8" roughness={0.5} />
            </mesh>

            {/* Side Walls (Long) */}
            <mesh rotation={[0, Math.PI / 2, 0]} position={[-HALL_WIDTH / 2, 0, -SIDE_DEPTH / 2 + HALL_WIDTH / 2]} receiveShadow>
                <planeGeometry args={[SIDE_DEPTH, HALL_HEIGHT]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
            </mesh>
            <mesh rotation={[0, -Math.PI / 2, 0]} position={[HALL_WIDTH / 2, 0, -SIDE_DEPTH / 2 + HALL_WIDTH / 2]} receiveShadow>
                <planeGeometry args={[SIDE_DEPTH, HALL_HEIGHT]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
            </mesh>

            {variant === 'standard' ? (
                <>
                    {/* End Cap (Darkness) */}
                    <mesh position={[0, 0, -SIDE_DEPTH + HALL_WIDTH / 2]}>
                        <planeGeometry args={[HALL_WIDTH, HALL_HEIGHT]} />
                        <meshBasicMaterial color="#000000" />
                    </mesh>

                    {/* Spooky: % Chance of Shadow Figure deep in the hall */}
                    <ShadowFigure visible={Math.random() > 0.8} zOffset={-10} />
                </>
            ) : (
                <>
                    {/* ELEVATOR & BLOOD VARIANT */}
                    {/* Move Elevator much closer: -10 instead of -18 */}
                    <ElevatorDoors position={[0, -HALL_HEIGHT / 2 + 1.25, -10]} />

                    {/* Wall behind elevator to seal it */}
                    <mesh position={[0, 0, -10.1]}>
                        <planeGeometry args={[HALL_WIDTH, HALL_HEIGHT]} />
                        <meshStandardMaterial color="#222" />
                    </mesh>

                    <BloodWave position={[0, 0, -6]} />

                    {/* Lighting - Brightened */}
                    <pointLight position={[0, 1, -8]} color="#ff0000" intensity={8} distance={20} />
                    <pointLight position={[0, -1, -4]} color="#ff4444" intensity={4} distance={12} />
                </>
            )}
        </group>
    );
};

// Error Safe Segment Wrapper?

const HallwaySegment = ({ position, index, branchSide }: { position: [number, number, number], index: number, branchSide?: 'left' | 'right' }) => {
    const { metrics } = useBioSignalStore();
    const wallRef = useRef<THREE.Group>(null);

    // Deterministic Randomness based on Index
    const isEmergency = useMemo(() => {
        // Emergency Sector (Index 25-35) or random pockets
        return (index > 25 && index < 35) || (Math.abs(Math.sin(index * 132.1)) > 0.85);
    }, [index]);

    const hasGurney = useMemo(() => {
        // 5% chance, but NOT if there's a side branch (don't block path too much)
        return !branchSide && Math.abs(Math.sin(index * 99.3)) > 0.95;
    }, [index, branchSide]);

    // Texture Loading
    const carpetTexture = useLoader(THREE.TextureLoader, '/assets/carpet_overlook.png');

    // Configure Textures
    useMemo(() => {
        if (carpetTexture) {
            carpetTexture.wrapS = THREE.RepeatWrapping;
            carpetTexture.wrapT = THREE.RepeatWrapping;
            carpetTexture.repeat.set(2, 5);
        }
    }, [carpetTexture, index]);

    // Breathing Walls Logic
    useFrame(() => {
        if (!wallRef.current) return;
        const bpm = metrics.heartRate || 60;
        const breathSpeed = bpm / 60 * Math.PI * 2;
        const time = Date.now() / 1000;
        // Breathing is more intense in Emergency sectors
        const intensity = isEmergency ? 0.08 : 0.05;
        const scale = 1.0 - (Math.sin(time * breathSpeed) * intensity * 0.3);
        wallRef.current.scale.set(scale, 1, 1);
    });

    // Easter Egg Flags
    const isRoom237 = index === 23;
    const isTwins = index === 42;
    const isBlood = index === 66;

    // Use isBlood or isEmergency for red tint
    const wallColor = (isEmergency || isBlood) ? "#aa4444" : "#f0f0f0";
    const ceilingColor = (isEmergency || isBlood) ? "#550000" : "#e8e8e8";

    // Blood Flood Glossiness
    const floorRoughness = isBlood ? 0.05 : 0.8; // Slick
    const floorColor = isBlood ? "#880000" : (isEmergency ? "#ffcccc" : "white");

    return (
        <group position={position}>
            <group ref={wallRef}>
                {/* Floor */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -HALL_HEIGHT / 2, 0]} receiveShadow>
                    <planeGeometry args={[HALL_WIDTH, SEGMENT_LENGTH]} />
                    <meshStandardMaterial
                        map={carpetTexture}
                        roughness={floorRoughness}
                        metalness={isBlood ? 0.5 : 0.0}
                        color={floorColor}
                    />
                </mesh>

                {/* Ceiling */}
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT / 2, 0]} receiveShadow>
                    <planeGeometry args={[HALL_WIDTH, SEGMENT_LENGTH]} />
                    <meshStandardMaterial
                        color={ceilingColor}
                        roughness={0.5}
                        metalness={0.1}
                    />
                </mesh>

                {/* Left Wall */}
                {branchSide !== 'left' ? (
                    <mesh rotation={[0, Math.PI / 2, 0]} position={[-HALL_WIDTH / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[SEGMENT_LENGTH, HALL_HEIGHT]} />
                        <meshStandardMaterial color={wallColor} roughness={isBlood ? 0.1 : 0.5} metalness={isBlood ? 0.3 : 0} />
                    </mesh>
                ) : (
                    <SideHallway
                        position={[-HALL_WIDTH / 2 - 0.1, 0, 0]}
                        rotation={[0, Math.PI / 2, 0]}
                        variant={index === 4 ? 'elevator_blood' : 'standard'}
                    />
                )}

                {/* Right Wall */}
                {branchSide !== 'right' ? (
                    <mesh rotation={[0, -Math.PI / 2, 0]} position={[HALL_WIDTH / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[SEGMENT_LENGTH, HALL_HEIGHT]} />
                        <meshStandardMaterial color={wallColor} roughness={isBlood ? 0.1 : 0.5} metalness={isBlood ? 0.3 : 0} />
                    </mesh>
                ) : (
                    <SideHallway
                        position={[HALL_WIDTH / 2 + 0.1, 0, 0]}
                        rotation={[0, -Math.PI / 2, 0]}
                        variant={index === 8 ? 'twins' : 'standard'}
                    />
                )}
            </group>

            <DustParticles />

            {/* Lights */}
            {(isEmergency || isBlood) ? (
                // EMERGENCY / BLOOD LIGHTING
                <group position={[0, HALL_HEIGHT / 2 - 0.5, 0]}>
                    <pointLight distance={10} decay={2} intensity={2} color="#ff0000" />
                    <mesh>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="#ff0000" />
                    </mesh>
                </group>
            ) : (
                // STANDARD LIGHTING
                <>
                    {/* Narrative: Flickering Ceiling Light (Red) - Keeping the old one too for variety? 
                        Actually, replace generic flickering with Emergency system mostly. 
                        Let's keep FlushMount for standard. */}
                    {index % 5 === 2 && (
                        <FlushMountLight position={[0, HALL_HEIGHT / 2 - 0.2, 0]} />
                    )}
                </>
            )}

            {/* Structural: Door Frame */}
            <group position={[0, 0, -SEGMENT_LENGTH / 2 + 0.5]}>
                <mesh position={[-HALL_WIDTH / 2 + 0.2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.4, HALL_HEIGHT, 0.4]} />
                    <meshStandardMaterial color="#222" roughness={0.7} />
                </mesh>
                <mesh position={[HALL_WIDTH / 2 - 0.2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.4, HALL_HEIGHT, 0.4]} />
                    <meshStandardMaterial color="#222" roughness={0.7} />
                </mesh>
                <mesh position={[0, HALL_HEIGHT / 2 - 0.2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[HALL_WIDTH, 0.4, 0.4]} />
                    <meshStandardMaterial color="#222" roughness={0.7} />
                </mesh>

                {/* Shadow Figure Event (Standard) */}
                {index === 5 && !isTwins && (
                    <ShadowFigure />
                )}

                {/* THE TWINS (Easter Egg) */}
                {isTwins && (
                    <group>
                        <ShadowFigure zOffset={0} visible={true} />
                        <group position={[1.2, 0, 0]}>
                            <ShadowFigure zOffset={0} visible={true} />
                        </group>
                    </group>
                )}
            </group>

            {/* Procedural Clutter */}
            {index % 2 !== 0 && !isTwins && (
                <WireClutter />
            )}

            {/* Medical Gurney */}
            {hasGurney && !isTwins && !isBlood && (
                <MedicalGurney
                    position={useMemo(() => [
                        (Math.sin(index * 12.3) * 0.5) * 1.5, // Deterministic random X
                        -HALL_HEIGHT / 2,
                        (Math.cos(index * 45.6) * 0.5) * 4
                    ], [index])}
                    rotation={useMemo(() => [0, Math.sin(index) * 0.5, 0], [index]) as any}
                />
            )}

            {/* Side Doors */}
            {index % 3 === 1 && (
                <>
                    {/* ROOM 237 */}
                    {isRoom237 ? (
                        // Force spawn on Left
                        <SideDoor side="left" hasTag={true} />
                    ) : (
                        <>
                            {index % 2 === 0 && branchSide !== 'left' && <SideDoor side="left" />}
                            {index % 2 !== 0 && branchSide !== 'right' && <SideDoor side="right" />}
                        </>
                    )}
                </>
            )}

            {/* Trash Can */}
            {index % 4 === 2 && !hasGurney && !isTwins && !isBlood && (
                <TrashCan position={[
                    index % 2 === 0 ? -HALL_WIDTH / 2 + 0.4 : HALL_WIDTH / 2 - 0.4,
                    -HALL_HEIGHT / 2,
                    0
                ]} />
            )}

            {/* Narrative Logs - Reduced Frequency */}
            {index % 13 === 2 && !isTwins && (
                <DataLog
                    position={[
                        index % 2 === 0 ? -HALL_WIDTH / 2 + 0.05 : HALL_WIDTH / 2 - 0.05,
                        0,
                        0
                    ]}
                    rotation={[0, index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
                    data={LOG_ENTRIES[Math.floor(index / 5) % LOG_ENTRIES.length]}
                />
            )}
        </group>
    );
};

// --- THE ENDING ---
const EXIT_SEGMENT_INDEX = 50;

const TheExit = ({ position }: { position: [number, number, number] }) => {
    const { enterMaze } = useGameStore();
    const { camera } = useThree();
    const [triggered, setTriggered] = useState(false);

    useFrame(() => {
        if (triggered) return;

        const dist = Math.abs(camera.position.z - position[2]);

        if (dist < 3.0) {
            setTriggered(true);
            console.log("THE EXIT REACHED");

            // SENSORY OVERLOAD SEQUENCE
            // 1. Audio Screech
            audioManager.trackDronePitch(5.0);

            // 2. Enter Maze
            setTimeout(() => {
                enterMaze();
            }, 1000);
        }
    });

    return (
        <group position={position}>
            <ambientLight intensity={1} />
        </group>
    );
};

export const Hallway = () => {
    const { currentSegmentIndex } = useGameStore();

    // Render Window: 8 segments (1 behind, 7 ahead)
    const renderDistance = 8;
    const segments = [];

    // We render [current - 1] to [current + renderDistance - 1]
    const start = Math.max(0, currentSegmentIndex - 1);
    const end = currentSegmentIndex + renderDistance;

    // Door Audio Logic
    const [doorsPassed, setDoorsPassed] = useState(0);
    const [targetDoors, setTargetDoors] = useState(3);
    const lastSegmentRef = useRef(currentSegmentIndex);

    useFrame(() => {
        if (currentSegmentIndex !== lastSegmentRef.current) {
            // Player moved to a new segment
            const prevIndex = lastSegmentRef.current;
            // Check if the previous segment had a door
            // Logic: SideDoor renders if index % 3 === 1
            if (prevIndex % 3 === 1) {
                const newCount = doorsPassed + 1;
                console.log(`[Hallway] Passed Door. Count: ${newCount} / ${targetDoors}`);

                if (newCount >= targetDoors) {
                    // Play Sound
                    // Small delay to simulate distance behind
                    setTimeout(() => {
                        audioManager.triggerDoorClose();
                    }, 500);

                    // Reset
                    setDoorsPassed(0);
                    setTargetDoors(Math.floor(Math.random() * 10) + 1);
                    console.log(`[Hallway] triggered Audio. New Target: ${targetDoors}`);
                } else {
                    setDoorsPassed(newCount);
                }
            }
            lastSegmentRef.current = currentSegmentIndex;
        }
    });

    for (let i = start; i < end; i++) {
        // Logic: Stop rendering past exit
        if (i > EXIT_SEGMENT_INDEX) continue;

        const zPos = -(i * SEGMENT_LENGTH) - (SEGMENT_LENGTH / 2);

        if (i === EXIT_SEGMENT_INDEX) {
            segments.push(<TheExit key={`exit`} position={[0, 0, zPos]} />);
        } else {
            // Determine branching
            let branchSide: 'left' | 'right' | undefined = undefined;
            if (i % 8 === 4) branchSide = 'left';
            if (i % 8 === 0 && i !== 0) branchSide = 'right'; // Don't branch at start (0)

            segments.push(
                <HallwaySegment
                    key={i}
                    index={i}
                    position={[0, 0, zPos]}
                    branchSide={branchSide}
                />
            );
        }
    }

    return (
        <group>
            {segments}
            {/* End Cap (The Void) */}
            {currentSegmentIndex < EXIT_SEGMENT_INDEX && (
                <mesh position={[0, 0, -(end * SEGMENT_LENGTH) - 0.1]}>
                    <planeGeometry args={[HALL_WIDTH + 1, HALL_HEIGHT + 1]} />
                    <meshBasicMaterial color="black" />
                </mesh>
            )}
        </group>
    );
};
