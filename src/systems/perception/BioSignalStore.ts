import { create } from 'zustand';

interface BioSignalStore {
    metrics: {
        rawRPPG: number; // Raw Green Channel Signal
        heartRate: number; // Smoothed BPM
        hrConfidence: number; // 0.0 - 1.0 (Signal Quality)

        pallor: number; // Skin perfusion index (positive = flush, negative = pale)
        respiratoryRate: number; // BPM (from audio/visual)

        blinkRate: number; // Blinks per minute
        leftPupilDiameter: number;
        rightPupilDiameter: number;
        pupilConfidence: number; // based on lighting/occlusion

        leftEAR: number;
        rightEAR: number;

        audioLevel: number; // 0-1
        isScreaming: number; // 0 or 1
        distanceZ: number; // Inverse Face Width (Proximity)
        gazeAlignment: number; // 0.0 - 1.0 (1=Center)
        gazeDirection: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
    };

    // Derived Affective State
    affectiveState: {
        arousal: number; // 0.0 - 1.0 (Sensor Fused)
        valence: number; // -1.0 - 1.0 (Positive/Negative)
        dominance: number; // 0.0 - 1.0 (Submissive/Dominant)
    };

    // Face tracking state

    isFaceDetected: boolean;
    isFaceLocked: boolean;
    faceLandmarks: any[] | null;
    isLeftEyeClosed: boolean;
    isRightEyeClosed: boolean;
    workerStatus: 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
    workerError: string | null;

    updateMetric: (key: keyof BioSignalStore['metrics'], value: number) => void;
    setFaceDetected: (detected: boolean) => void;
    setFaceLocked: (locked: boolean) => void;
    setFaceLandmarks: (landmarks: import('@mediapipe/tasks-vision').NormalizedLandmark[] | null) => void;
    setEyeState: (leftClosed: boolean, rightClosed: boolean) => void;
    setWorkerStatus: (status: 'IDLE' | 'LOADING' | 'READY' | 'ERROR') => void;
    setWorkerError: (error: string | null) => void;
    setAffectiveState: (state: Partial<BioSignalStore['affectiveState']>) => void;
}

export const useBioSignalStore = create<BioSignalStore>((set) => ({
    metrics: {
        rawRPPG: 0,
        heartRate: 0,
        hrConfidence: 0,
        pallor: 0,
        respiratoryRate: 0,
        blinkRate: 0,
        leftPupilDiameter: 0,
        rightPupilDiameter: 0,
        pupilConfidence: 0,
        leftEAR: 0,
        rightEAR: 0,
        audioLevel: 0,
        isScreaming: 0,
        distanceZ: 0,
        gazeAlignment: 0,
        gazeDirection: 'CENTER'
    },
    affectiveState: {
        arousal: 0.2,
        valence: 0,
        dominance: 0.5
    },
    // Face Tracking
    isFaceDetected: false,
    isFaceLocked: false, // Stable detection for set duration
    faceLandmarks: null,
    isLeftEyeClosed: false,
    isRightEyeClosed: false,
    workerStatus: 'IDLE',
    workerError: null,

    updateMetric: (key, value) => set((state) => ({
        metrics: { ...state.metrics, [key]: value }
    })),

    setAffectiveState: (newState) => set((state) => ({
        affectiveState: { ...state.affectiveState, ...newState }
    })),

    setFaceDetected: (detected) => set({ isFaceDetected: detected }),
    setFaceLocked: (locked) => set({ isFaceLocked: locked }),
    setFaceLandmarks: (landmarks) => set({ faceLandmarks: landmarks }),
    setEyeState: (leftClosed, rightClosed) => set({ isLeftEyeClosed: leftClosed, isRightEyeClosed: rightClosed }),
    setWorkerStatus: (status) => set({ workerStatus: status }),
    setWorkerError: (error) => set({ workerError: error }),
}));
