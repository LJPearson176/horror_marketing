import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const MazeRig = () => {
    const { camera } = useThree();

    // Start at a safe spot in the maze
    // Grid (1, 1) -> World (-12, -12)
    const START_POS = new THREE.Vector3(-12, 0, -12);

    const positionRef = useRef(START_POS.clone());
    const rotationRef = useRef({ yaw: 0, pitch: 0 });

    const moveSpeed = 0.15;

    // Input State
    const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': setMovement(m => ({ ...m, forward: true })); break;
                case 'ArrowDown': case 's': case 'S': setMovement(m => ({ ...m, backward: true })); break;
                case 'ArrowLeft': case 'a': case 'A': setMovement(m => ({ ...m, left: true })); break;
                case 'ArrowRight': case 'd': case 'D': setMovement(m => ({ ...m, right: true })); break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': setMovement(m => ({ ...m, forward: false })); break;
                case 'ArrowDown': case 's': case 'S': setMovement(m => ({ ...m, backward: false })); break;
                case 'ArrowLeft': case 'a': case 'A': setMovement(m => ({ ...m, left: false })); break;
                case 'ArrowRight': case 'd': case 'D': setMovement(m => ({ ...m, right: false })); break;
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            rotationRef.current.yaw -= e.movementX * 0.002;
            rotationRef.current.pitch -= e.movementY * 0.002;
            rotationRef.current.pitch = Math.max(-1.5, Math.min(1.5, rotationRef.current.pitch));
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);

        // Force initial camera sync
        camera.position.copy(START_POS);
        camera.rotation.set(0, 0, 0);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [camera]);

    useFrame(() => {
        // 1. Rotation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(rotationRef.current.pitch, rotationRef.current.yaw, 0, 'YXZ'));
        camera.quaternion.slerp(quaternion, 0.2);

        // 2. Movement direction relative to Yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRef.current.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRef.current.yaw);

        const moveDir = new THREE.Vector3();
        if (movement.forward) moveDir.add(forward);
        if (movement.backward) moveDir.sub(forward);
        if (movement.left) moveDir.sub(right);
        if (movement.right) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize().multiplyScalar(moveSpeed);
            positionRef.current.add(moveDir);
        }

        // 3. Simple Bounds Collision (Outer walls of maze approx 30x30)
        // Center 0, Size ~30. Bounds -15 to 15.
        const BOUNDS = 14;
        if (positionRef.current.x < -BOUNDS) positionRef.current.x = -BOUNDS;
        if (positionRef.current.x > BOUNDS) positionRef.current.x = BOUNDS;
        if (positionRef.current.z < -BOUNDS) positionRef.current.z = -BOUNDS;
        if (positionRef.current.z > BOUNDS) positionRef.current.z = BOUNDS;

        camera.position.lerp(positionRef.current, 0.1);
    });

    return null;
};
