import { useGameStore } from '../../systems/game/GameStore';
import { useEffect, useState } from 'react';

export const FakeOutOverlay = () => {
    const { fakeOutType } = useGameStore();
    const [localVisible, setLocalVisible] = useState(false);

    useEffect(() => {
        if (fakeOutType !== 'NONE') {
            setLocalVisible(true);
        } else {
            setLocalVisible(false);
        }
    }, [fakeOutType]);

    if (!localVisible) return null;

    return (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center font-mono">
            {fakeOutType === 'CONNECTION_LOST' && (
                <div className="bg-black/90 p-8 border border-red-600 animate-pulse text-center">
                    <h1 className="text-3xl text-red-500 font-bold mb-4">CONNECTION LOST</h1>
                    <p className="text-gray-400">Reconnecting to server...</p>
                    <div className="mt-4 w-full bg-gray-800 h-2">
                        <div className="bg-red-600 h-full w-1/3 animate-ping"></div>
                    </div>
                </div>
            )}

            {fakeOutType === 'FACE_NOT_DETECTED' && (
                <div className="bg-black/80 p-6 border-2 border-yellow-500 text-yellow-500 backdrop-blur-sm">
                    <h2 className="text-xl font-bold mb-2">⚠ SENSOR CALIBRATION ERROR</h2>
                    <p className="text-sm">Cannot detect user biometric signature.</p>
                    <p className="text-lg mt-4 animate-bounce font-bold">PLEASE LEAN CLOSER TO THE SCREEN</p>
                </div>
            )}

            {fakeOutType === 'CRITICAL_ERROR' && (
                <div className="absolute inset-0 bg-blue-700 text-white font-mono p-12 text-left overflow-hidden">
                    <img
                        src="/assets/cracked_screen.png"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 z-10 pointer-events-none mix-blend-multiply"
                    />
                    <div className="relative z-20">
                        <p className="text-xl mb-4">:(</p>
                        <p className="text-lg mb-8">Your device ran into a problem and needs to restart.</p>
                        <p className="text-sm opacity-70">
                            Stop code: CRITICAL_PROCESS_DIED<br />
                            What failed: Panopticon.exe
                        </p>
                    </div>
                    <div className="absolute bottom-12 left-12 text-sm animate-pulse z-20">
                        restarting 0% complete
                    </div>
                </div>
            )}
        </div>
    );
};
