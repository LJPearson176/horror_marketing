import { useGameStore } from '../../systems/game/GameStore';
import { useEffect, useState } from 'react';

// Preload asset pool
const ASSETS = [
    '/assets/scary_face.png',
    '/assets/scary_face_2.png',
    '/assets/scary_face_3.png'
];

ASSETS.forEach(src => {
    const img = new Image();
    img.src = src;
});

export const JumpscareOverlay = () => {
    const { fakeOutType } = useGameStore();
    const [visible, setVisible] = useState(false);
    const [currentAsset, setCurrentAsset] = useState(ASSETS[0]);

    useEffect(() => {
        console.log(`[JumpscareOverlay] fakeOutType changed to: ${fakeOutType}`);
        if (fakeOutType === 'JUMP_SCARE') {
            // Pick random asset
            const randomAsset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
            console.log(`[JumpscareOverlay] Selected Asset: ${randomAsset}`);
            setCurrentAsset(randomAsset);
            setVisible(true);

            // Flash duration handled by GameStore's duration, but let's vibrate too?
            if (navigator.vibrate) navigator.vibrate([200, 50, 200]);

            // Trigger Audio handled by SceneController / System to avoid race conditions
            // audioManager.triggerScream();
        } else {
            console.log(`[JumpscareOverlay] Hiding Overlay`);
            setVisible(false);
        }
    }, [fakeOutType]);

    if (!visible) return null;

    return (
        <div className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none">
            {/* Debug Background - Red Tint */}
            <div className="absolute inset-0 bg-red-900/40"></div>

            <div className="relative z-10 flex flex-col items-center">
                <h1 className="text-6xl font-bold text-white mb-4 animate-bounce">SCARE!</h1>
                <img
                    src={currentAsset}
                    alt="SCARE_ASSET"
                    className="w-[500px] h-[500px] object-contain border-4 border-red-500"
                    onError={(e) => console.error("Jumpscare Image Error:", e.currentTarget.src)}
                    onLoad={() => console.log("Jumpscare Image Loaded Success")}
                />
            </div>
        </div>
    );
};
