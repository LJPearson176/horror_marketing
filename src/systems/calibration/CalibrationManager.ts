import { create } from 'zustand';
import { calculateStats } from '../../utils/statistics';

export type CalibrationState = 'IDLE' | 'LIGHT_TEST' | 'DARK_TEST' | 'STRESS_TEST' | 'COMPLETE';

interface CalibrationStore {
    state: CalibrationState;
    setState: (state: CalibrationState) => void;

    // Raw data buffers for calibration
    buffers: {
        heartRates: number[];
        pupilDiameters: number[];
    };
    addToBuffer: (metric: 'heartRates' | 'pupilDiameters', value: number) => void;

    // Progress State
    progress: number; // 0-100
    isCalibrating: boolean;
    setProgress: (progress: number) => void;
    setCalibrating: (isCalibrating: boolean) => void;

    // Calculated Baselines (Mean, StdDev)
    baselines: {
        hr: { mean: number; stdDev: number } | null;
        pupil: { mean: number; stdDev: number } | null;
    };
    computeBaselines: () => void;
}

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    state: 'IDLE',
    setState: (state) => set({ state }),

    buffers: {
        heartRates: [],
        pupilDiameters: [],
    },

    addToBuffer: (metric, value) => set((state) => ({
        buffers: {
            ...state.buffers,
            [metric]: [...state.buffers[metric], value]
        }
    })),

    progress: 0,
    isCalibrating: false,
    setProgress: (progress) => set({ progress }),
    setCalibrating: (isCalibrating) => set({ isCalibrating }),

    baselines: {
        hr: null,
        pupil: null
    },

    computeBaselines: () => {
        const { buffers } = get();
        const hrStats = calculateStats(buffers.heartRates);
        const pupilStats = calculateStats(buffers.pupilDiameters);

        set({
            baselines: {
                hr: hrStats,
                pupil: pupilStats
            }
        });
    }
}));
