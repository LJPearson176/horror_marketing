
import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../systems/game/GameStore';

export const PlayerRig = () => {
    const { camera } = useThree();
    const { setCurrentSegment } = useGameStore();

    const positionXRef = useRef(0);
    const positionRef = useRef(0); // Start at Z=0 (Entrance of Segment 0)
    const fovRef = useRef(75); // Standard FOV

    useEffect(() => {
        console.log(`[PlayerRig] Mounted at Z=${positionRef.current}`);
    }, []);

    const moveSpeed = 0.1;

    // Mouse Look State
    const mouseRef = useRef({ x: 0, y: 0 });

    // Input State
    const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });

    // Segment Tracking
    const lastReportedSegment = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    setMovement(m => ({ ...m, forward: true }));
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    setMovement(m => ({ ...m, backward: true }));
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    setMovement(m => ({ ...m, left: true }));
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    setMovement(m => ({ ...m, right: true }));
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    setMovement(m => ({ ...m, forward: false }));
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    setMovement(m => ({ ...m, backward: false }));
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    setMovement(m => ({ ...m, left: false }));
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    setMovement(m => ({ ...m, right: false }));
                    break;
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Stop page scroll
            const delta = e.deltaY * 0.05;
            fovRef.current = THREE.MathUtils.clamp(fovRef.current + delta, 10, 120);
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            mouseRef.current = { x, y };
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    useFrame(() => {
        // Movement Logic
        // Calculate forward/right vectors based on CAMERA rotation (Yaw only)
        // Actually, simple FPS logic: W moves in direction of look (Projected on XZ plane)? 
        // Or just absolute Z axis? 
        // Original was absolute Z. Let's make it more immersive:
        // Movement is Relative to Camera Yaw.

        // We need the ACTUAL current rotation or just use the mouse input as "intention"?
        // Mouse Look is lerped. Let's use camera.rotation.y?
        // camera.rotation is Euler. 

        // Let's stick to Absolute Z for "Forward" because it's a Hallway Simulator. 
        // If we make it relative, they might walk into walls easily.
        // Actually the user wants to "explore side hallways".
        // So W/S should strictly move along Z (Hallway Axis).
        // A/D should strictly move along X (Side Axis).
        // This effectively "Slides" the camera. 

        // 1. Movement Calculations
        let newZ = positionRef.current;
        let newX = positionXRef.current;

        if (movement.forward) newZ -= moveSpeed;
        if (movement.backward) newZ += moveSpeed;
        if (movement.left) newX -= moveSpeed;
        if (movement.right) newX += moveSpeed;

        // 2. Collision Logic (Solid Walls)
        // Hall Width is 4 (-2 to 2). Player radius approx 0.5.
        // Standard bounds: -1.5 to 1.5.

        // Calculate current segment index based on Z position
        // Z = -(index * 10) - 5.   So index approx (-Z - 5) / 10
        // Wait, standard logic used below is: Math.floor((-rawZ + 5) / 10)
        // Let's stick to the Z->Index formula used for tracking.
        const predictedIndex = Math.floor((-newZ + 5) / 10);

        // Branching Logic (Must match Hallway.tsx)
        const canGoLeft = (predictedIndex % 8 === 4);
        const canGoRight = (predictedIndex % 8 === 0 && predictedIndex !== 0);

        const wallLimit = 1.5;

        // Clamp X
        if (!canGoLeft && newX < -wallLimit) newX = -wallLimit;
        if (!canGoRight && newX > wallLimit) newX = wallLimit;

        // Apply
        positionRef.current = newZ;
        positionXRef.current = newX;

        // 3. Camera Smoothing
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, positionRef.current, 0.1);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, positionXRef.current, 0.1);

        // 1b. Infinite Hallway Calculation
        const rawZ = positionRef.current;
        const index = Math.floor((-rawZ + 5) / 10);
        const clampedIndex = Math.max(0, index);

        if (clampedIndex !== lastReportedSegment.current) {
            lastReportedSegment.current = clampedIndex;
            setCurrentSegment(clampedIndex);
        }

        // 2. LOOK (Parallax / Mouse Aim)
        const targetEuler = new THREE.Euler(
            mouseRef.current.y * 0.3, // Pitch
            mouseRef.current.x * -1.5, // Yaw (Wider range for exploration)
            0, // Roll
            'YXZ'
        );

        const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
        camera.quaternion.slerp(targetQuat, 0.1);

        // 3. ZOOM (FOV)
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, fovRef.current, 0.1);
            camera.updateProjectionMatrix();
        }
    });

    return null; // Rig is logic only
};
