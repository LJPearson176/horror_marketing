import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SnowMaze = () => {
    // Atmospheric Fog
    useFrame(({ scene }) => {
        if (!scene.fog || scene.fog.color.getHexString() !== '050510') {
            scene.fog = new THREE.FogExp2('#050510', 0.15); // Blue-ish dark fog, dense
            scene.background = new THREE.Color('#050510');
        }
    });

    // Snow Particles
    const snowCount = 2000;
    const snowRef = useRef<THREE.InstancedMesh>(null);
    const snowDummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < snowCount; i++) {
            temp.push({
                x: (Math.random() - 0.5) * 40,
                y: Math.random() * 10,
                z: (Math.random() - 0.5) * 40,
                speedY: -0.05 - Math.random() * 0.1,
                speedX: (Math.random() - 0.5) * 0.02,
                speedZ: (Math.random() - 0.5) * 0.02
            });
        }
        return temp;
    }, []);

    useFrame(() => {
        if (!snowRef.current) return;
        particles.forEach((p, i) => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.z += p.speedZ;

            if (p.y < 0) {
                p.y = 10;
                p.x = (Math.random() - 0.5) * 40; // Respawn random
                p.z = (Math.random() - 0.5) * 40;
            }

            snowDummy.position.set(p.x, p.y, p.z);
            snowDummy.scale.setScalar(0.05);
            snowDummy.updateMatrix();
            snowRef.current.setMatrixAt(i, snowDummy.matrix);
        });
        snowRef.current.instanceMatrix.needsUpdate = true;
    });

    // Maze Generation (Simple Grid)
    // 1 = Wall, 0 = Path
    // A simple hardcoded mini-maze for testing
    const mazeGrid = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    const cellSize = 3;

    return (
        <group>
            {/* Ground (Snow) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#eeeeff" roughness={0.9} />
            </mesh>

            {/* Snow Hedges */}
            {mazeGrid.map((row, z) =>
                row.map((cell, x) => {
                    if (cell === 1) {
                        return (
                            <mesh
                                key={`${x}-${z}`}
                                position={[
                                    (x - 5) * cellSize,
                                    1.5, // Height/2
                                    (z - 5) * cellSize
                                ]}
                                castShadow
                                receiveShadow
                            >
                                <boxGeometry args={[cellSize, 3, cellSize]} />
                                <meshStandardMaterial
                                    color="#1a2e1a" // Dark Green
                                    roughness={0.9}
                                    map={null /* Texture would be better */}
                                />
                                {/* Snow on top */}
                                <mesh position={[0, 1.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                    <planeGeometry args={[cellSize, cellSize]} />
                                    <meshStandardMaterial color="#eeeeff" />
                                </mesh>
                            </mesh>
                        );
                    }
                    return null;
                })
            )}

            {/* Falling Snow */}
            <instancedMesh ref={snowRef} args={[undefined, undefined, snowCount]}>
                <sphereGeometry args={[1, 8, 8]} />{/* Scale handled in matrix */}
                <meshBasicMaterial color="white" transparent opacity={0.8} />
            </instancedMesh>

            {/* Moonlight */}
            <directionalLight
                position={[10, 20, 10]}
                intensity={0.5}
                color="#aaccff"
                castShadow
            />
            <ambientLight intensity={0.1} color="#000033" />

        </group>
    );
};
