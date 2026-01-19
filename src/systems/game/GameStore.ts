import { create } from 'zustand';

interface GameStore {
    // Game Lifecycle
    gameStatus: 'TITLE' | 'PLAYING' | 'ENDING' | 'MAZE';
    isGameActive: boolean;
    isGameOver: boolean;

    // Actions
    startGame: () => void;
    endGame: () => void;
    resetGame: () => void;
    enterMaze: () => void;

    fakeOutType: 'NONE' | 'CONNECTION_LOST' | 'FACE_NOT_DETECTED' | 'CRITICAL_ERROR' | 'JUMP_SCARE';
    triggerFakeOut: (type: 'NONE' | 'CONNECTION_LOST' | 'FACE_NOT_DETECTED' | 'CRITICAL_ERROR' | 'JUMP_SCARE', duration: number) => void;

    // Core Game State
    currentSegmentIndex: number;
    setCurrentSegment: (index: number) => void;
    hallwaySeed: number;

    gazePenalty: number; // 0.0 - 1.0
    setGazePenalty: (penalty: number) => void;

    containmentActive: boolean;
    startContainment: () => void;
    endContainment: (success: boolean) => void;

    // Flashlight
    flashlightOn: boolean;
    flashlightBattery: number; // 0 - 100
    flashlightFlicker: boolean;
    toggleFlashlight: () => void;
    setFlashlightInfo: (on: boolean, battery: number) => void;
    drainBattery: (amount: number) => void;
    rechargeBattery: (amount: number) => void;

    // Heartbeat Sync
    lastBeatTime: number;
    triggerHeartbeat: () => void;

    // Narrative Logs
    readingLog: { title: string; content: string; date: string } | null;
    setReadingLog: (log: { title: string; content: string; date: string } | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    gameStatus: 'TITLE',
    isGameActive: false,
    isGameOver: false, // Initial state for isGameOver
    currentSegmentIndex: 0,
    hallwaySeed: 12345, // Initial seed
    gazePenalty: 0,
    containmentActive: false,

    flashlightOn: true,
    flashlightBattery: 100,
    flashlightFlicker: false,

    lastBeatTime: 0,

    startGame: () => set({
        gameStatus: 'PLAYING',
        isGameActive: true,
        isGameOver: false, // Ensure game is not over
        currentSegmentIndex: 0,
        gazePenalty: 0,
        flashlightBattery: 100,
        containmentActive: false
    }),

    endGame: () => set({
        gameStatus: 'ENDING',
        isGameActive: false,
        isGameOver: true, // Mark game as over
        flashlightOn: false
    }),

    enterMaze: () => set({
        gameStatus: 'MAZE',
        isGameActive: true, // Still active!
        isGameOver: false,
        flashlightOn: true, // Need flashlight!
        flashlightBattery: 50 // Low battery for tension
    }),

    resetGame: () => set({
        gameStatus: 'TITLE',
        isGameActive: false,
        isGameOver: false, // Reset game over status
        currentSegmentIndex: 0,
        gazePenalty: 0,
        flashlightBattery: 100,
        containmentActive: false
    }),

    fakeOutType: 'NONE' as 'NONE' | 'CONNECTION_LOST' | 'FACE_NOT_DETECTED' | 'CRITICAL_ERROR' | 'JUMP_SCARE',
    triggerFakeOut: (type: 'NONE' | 'CONNECTION_LOST' | 'FACE_NOT_DETECTED' | 'CRITICAL_ERROR' | 'JUMP_SCARE', duration: number) => {
        console.log(`[GameStore] Triggering FakeOut: ${type} for ${duration}ms`);
        set({ fakeOutType: type });
        if (duration > 0) {
            setTimeout(() => {
                console.log(`[GameStore] Ending FakeOut (Timeout)`);
                set({ fakeOutType: 'NONE' });
            }, duration);
        }
    },

    // Initial State & Actions are defined above.
    // Explicitly reusing the initial values for clarity if needed, 
    // but in Zustand we just define them once.

    // We already defined startGame, endGame, resetGame above.
    // We already defined initial values for flashlight, gaze, etc above.

    startContainment: () => set({ containmentActive: true }),
    endContainment: (_success: boolean) => set({ containmentActive: false }),
    setGazePenalty: (penalty: number) => set({ gazePenalty: penalty }),
    setCurrentSegment: (index: number) => set({ currentSegmentIndex: index }),

    triggerHeartbeat: () => set({ lastBeatTime: Date.now() }),

    toggleFlashlight: () => set((state) => ({ flashlightOn: !state.flashlightOn })),
    setFlashlightInfo: (on: boolean, battery: number) => set({ flashlightOn: on, flashlightBattery: battery }),
    drainBattery: (amount: number) => set((state) => ({
        flashlightBattery: Math.max(0, state.flashlightBattery - amount)
    })),
    rechargeBattery: (amount: number) => set((state) => ({
        flashlightBattery: Math.min(100, state.flashlightBattery + amount)
    })),

    readingLog: null,
    setReadingLog: (log) => set({ readingLog: log }),
}));
