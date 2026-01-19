import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../systems/game/GameStore';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';
import { audioManager } from '../../systems/audio/AudioManager';

interface Node {
    id: number;
    x: number;
    y: number;
    size: number;
}

export const ContainmentOverlay = () => {
    const { containmentActive, endContainment, triggerFakeOut } = useGameStore();
    const { setAffectiveState } = useBioSignalStore.getState();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [timeLeft, setTimeLeft] = useState(5.0);
    const [hasSpawned, setHasSpawned] = useState(false);
    const audioInterval = useRef<any>(null);

    useEffect(() => {
        if (containmentActive) {
            // Spawn Nodes
            const count = 3 + Math.floor(Math.random() * 3); // 3-5 nodes
            const newNodes: Node[] = [];
            for (let i = 0; i < count; i++) {
                newNodes.push({
                    id: i,
                    x: 10 + Math.random() * 80, // 10-90%
                    y: 10 + Math.random() * 80,
                    size: 60 + Math.random() * 40 // 60-100px
                });
            }
            setNodes(newNodes);
            setHasSpawned(true);
            setTimeLeft(5.0);

            // Audio Alarm
            audioInterval.current = setInterval(() => {
                // Clicking ticking sound
                audioManager.playBeep(800, 0.05);
            }, 500);

        } else {
            setNodes([]);
            setHasSpawned(false);
            if (audioInterval.current) clearInterval(audioInterval.current);
        }
        return () => {
            if (audioInterval.current) clearInterval(audioInterval.current);
        };
    }, [containmentActive]);

    useEffect(() => {
        if (!containmentActive || !hasSpawned) return;

        if (nodes.length === 0) {
            // SUCCESS
            endContainment(true);
            setHasSpawned(false); // Reset
            // Reward
            const { affectiveState } = useBioSignalStore.getState();
            setAffectiveState({ arousal: Math.max(0.2, affectiveState.arousal - 0.3) });
            // Play success sound?
        }
    }, [nodes, containmentActive, hasSpawned]);

    useEffect(() => {
        if (!containmentActive) return;

        const tick = 0.1;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    // FAILURE
                    clearInterval(timer);
                    endContainment(false);
                    // PUNISHMENT
                    triggerFakeOut('CRITICAL_ERROR', 4000);
                    return 0;
                }
                return prev - tick;
            });
        }, tick * 1000);

        return () => clearInterval(timer);
    }, [containmentActive]);

    const handleNodeClick = (id: number) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        // Click sound
        if (navigator.vibrate) navigator.vibrate(50);
    };

    if (!containmentActive) return null;

    return (
        <div className="absolute inset-0 z-50 pointer-events-auto bg-blue-900 font-mono flex flex-col items-center justify-center overflow-hidden">
            {/* Scanlines Overlay for this screen specifically */}
            <div className="absolute inset-0 bg-[url('/assets/scanlines.png')] opacity-10 pointer-events-none"></div>

            <div className="absolute top-10 text-center animate-pulse">
                <h1 className="text-4xl font-bold text-white bg-red-600 px-4 py-2 inline-block mb-2">CRITICAL SYSTEM FAILURE</h1>
                <p className="text-red-300 text-xl">BIO-CONTAINMENT BREACH DETECTED</p>
                <p className="text-white text-2xl mt-4">PURGE CORRUPTION: {timeLeft.toFixed(1)}s</p>
            </div>

            {/* Matrix / Terminal Background Text */}
            <div className="absolute inset-0 text-blue-800 opacity-20 text-xs p-4 pointer-events-none whitespace-pre-wrap overflow-hidden">
                {Array(50).fill("0xF44A ERROR CORRUPTION SEGMENTATION FAULT 0x000 ").join("\n")}
            </div>

            {/* Nodes as "Glitch Blocks" */}
            {nodes.map(node => (
                <div
                    key={node.id}
                    className="absolute bg-black border-2 border-red-500 cursor-crosshair hover:bg-white active:bg-green-500 transition-colors"
                    style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        width: `${node.size}px`,
                        height: `${node.size}px`,
                    }}
                    onMouseDown={() => handleNodeClick(node.id)}
                >
                    <div className="w-full h-full flex items-center justify-center text-red-500 font-bold text-xs animate-pulse">
                        ERR_0{node.id}
                    </div>
                </div>
            ))}
        </div>
    );
};
