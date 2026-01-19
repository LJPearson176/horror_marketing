import { useBioSignalStore } from './BioSignalStore';
import BioVisionWorker from './BioVisionWorker?worker'; // Vite Worker Import
import { affectiveEngine } from '../../systems/affect/AffectiveEngine';

class BioVisionManager {
    private worker: Worker | null = null;
    private video: HTMLVideoElement | null = null;
    private isRunning: boolean = false;
    private isWorkerBusy: boolean = false;

    constructor() {
        console.log("[BioVisionManager] Instantiating Worker...");
        this.worker = new BioVisionWorker({ type: 'classic' } as any);
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.postMessage({ type: 'INIT' });
    }

    private handleWorkerMessage(e: MessageEvent) {
        const { type } = e.data;
        if (type === 'ERROR') {
            console.error("[BioVisionManager] Worker Error:", e.data.error);
            useBioSignalStore.getState().setWorkerStatus('ERROR');

            let errorMsg = 'Unknown Worker Error';
            if (e.data.error) {
                if (typeof e.data.error === 'string') errorMsg = e.data.error;
                else if (e.data.error.message) errorMsg = e.data.error.message;
                else errorMsg = JSON.stringify(e.data.error);
            }
            useBioSignalStore.getState().setWorkerError(errorMsg);
        }
        if (type === 'INIT_COMPLETE') {
            console.log("[BioVisionManager] Worker reports INIT_COMPLETE");
            useBioSignalStore.getState().setWorkerStatus('READY');
        }
        if (type === 'RESULT') {
            const { landmarks, blendshapes, rppg, roiColor, confidence, leftPupil, rightPupil, distanceZ, ear, leftEAR, rightEAR } = e.data;
            const store = useBioSignalStore.getState();

            // --- GAZE ALIGNMENT CALCULATION ---
            if (blendshapes && blendshapes.categories) {
                const getScore = (name: string) => blendshapes.categories.find((c: any) => c.categoryName === name)?.score || 0;

                // Left Eye
                const lookInLeft = getScore('eyeLookInLeft');
                const lookOutLeft = getScore('eyeLookOutLeft');
                const lookUpLeft = getScore('eyeLookUpLeft');
                const lookDownLeft = getScore('eyeLookDownLeft');

                // Right Eye
                const lookInRight = getScore('eyeLookInRight');
                const lookOutRight = getScore('eyeLookOutRight');
                const lookUpRight = getScore('eyeLookUpRight');
                const lookDownRight = getScore('eyeLookDownRight');

                // Consolidate (Average Directions)
                // Note: "In" for Left eye is Right direction, "Out" is Left.
                // "In" for Right eye is Left direction.
                const lookLeft = (lookOutLeft + lookInRight) / 2;
                const lookRight = (lookInLeft + lookOutRight) / 2;
                const lookUp = (lookUpLeft + lookUpRight) / 2;
                const lookDown = (lookDownLeft + lookDownRight) / 2;

                // Max Deviation
                const deviation = Math.max(lookLeft, lookRight, lookUp, lookDown);

                // Alignment Score (1.0 = Center, 0.0 = Deviated)
                const alignment = Math.max(0, 1.0 - (deviation * 1.5));
                store.updateMetric('gazeAlignment', alignment);

                // Determine Direction State
                let direction: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' = 'CENTER';
                if (deviation > 0.4) { // Threshold for "Away"
                    if (lookLeft === deviation) direction = 'LEFT';
                    else if (lookRight === deviation) direction = 'RIGHT';
                    else if (lookUp === deviation) direction = 'UP';
                    else if (lookDown === deviation) direction = 'DOWN';
                }
                // @ts-ignore
                store.updateMetric('gazeDirection', direction);
            }

            store.setFaceDetected(!!landmarks);
            store.setFaceLandmarks(landmarks || null);

            // Face Lock Logic (Stable detection for 2 seconds)
            if (landmarks) {
                if (!this.faceDetectedStartTime) {
                    this.faceDetectedStartTime = performance.now();
                } else if (performance.now() - this.faceDetectedStartTime > 2000) {
                    store.setFaceLocked(true);
                }
            } else {
                this.faceDetectedStartTime = null;
                store.setFaceLocked(false);
            }

            // --- Signal Processing & Verification ---
            if (typeof rppg === 'number') {
                store.updateMetric('rawRPPG', rppg);
            }
            if (typeof confidence === 'number') {
                store.updateMetric('hrConfidence', confidence);
                store.updateMetric('pupilConfidence', confidence); // Share for now
            }

            // --- PALLOR / HEMODYNAMIC CALCULATION ---
            if (roiColor) {
                // Project ROI Mean onto Hemoglobin Vector approximation
                // Simple ratio: Green Channel vs Red Channel
                // Vasoconstriction (Fear) -> Less Blood -> Less Green Absorption -> Higher Green Reflectance relative to Red?
                // Actually, Blood absorbs Green (530nm). 
                // More Blood (Flush) = Lower Green Channel (Darker Green component).
                // Less Blood (Pallor) = Higher Green Channel (Lighter Green component).

                // Let's normalize by luma to handle lighting changes roughly
                // Pallor Index = Green / (Red + Green + Blue)
                // High index = More Green relative to others = Less Blood?
                // Let's us specific Red-Green balance:
                // PerfusionProxy = (meanR - meanG) / (meanR + meanG);
                // High Red = High Perfusion (Flush). Low Red = Low Perfusion (Pallor).

                const perfusion = (roiColor.r - roiColor.g) / (roiColor.r + roiColor.g + 0.1); // Avoid div/0
                store.updateMetric('pallor', perfusion);
            }

            if (typeof leftPupil === 'number') store.updateMetric('leftPupilDiameter', leftPupil);
            if (typeof rightPupil === 'number') store.updateMetric('rightPupilDiameter', rightPupil);
            if (typeof distanceZ === 'number') store.updateMetric('distanceZ', distanceZ);

            // --- FUSION UPDATE ---
            // Calculate high-level state based on new metrics
            affectiveEngine.update();

            // Blink Logic (Split Eye Detection)
            if (typeof leftEAR === 'number' && typeof rightEAR === 'number') {
                this.updateBlinkRate(leftEAR, rightEAR, store);
            } else if (typeof ear === 'number') {
                // Fallback for older worker? shouldn't happen
                this.updateBlinkRate(ear, ear, store);
            }
            // Release lock for next frame
            this.isWorkerBusy = false;
        }
    }

    private blinkCount = 0;
    private blinkHistory: number[] = [];
    private isBlinking = false;
    private faceDetectedStartTime: number | null = null;

    private updateBlinkRate(leftEAR: number, rightEAR: number, store: any) {
        const BLINK_THRESHOLD = 0.25;
        const now = performance.now();

        const isLeftClosed = leftEAR < BLINK_THRESHOLD;
        const isRightClosed = rightEAR < BLINK_THRESHOLD;

        // Update Store for UI
        store.setEyeState(isLeftClosed, isRightClosed);
        store.updateMetric('leftEAR', leftEAR);
        store.updateMetric('rightEAR', rightEAR);

        // Count as "Blink" only if BOTH are closed (Synchronous Blink)
        const isBlinkingNow = isLeftClosed && isRightClosed;

        if (isBlinkingNow) {
            if (!this.isBlinking) {
                this.isBlinking = true;
                this.blinkCount++;

                // Add to history
                this.blinkHistory.push(now);
            }
        } else {
            this.isBlinking = false;
        }

        // Prune history > 60 seconds
        this.blinkHistory = this.blinkHistory.filter(t => now - t < 60000);

        // Blink Rate = Count in last 60s
        // Blink Rate = Count in last 60s
        store.updateMetric('blinkRate', this.blinkHistory.length);
    }

    public getStream(): MediaStream | null {
        return this.video?.srcObject as MediaStream | null;
    }

    public async startCamera() {
        if (this.isRunning) return;

        try {
            this.video = document.createElement('video');
            this.video.autoplay = true;
            this.video.playsInline = true;
            this.video.muted = true; // Crucial for autoplay policy

            // 1. Enumerate Devices to find "BRIO"
            // Note: We might need a permission trigger first if this fails to list labels
            let videoDeviceId: string | undefined = undefined;
            try {
                // Try getting a dummy stream first for permissions if not already granted
                await navigator.mediaDevices.getUserMedia({ video: true });

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                console.log("[BioVisionManager] Available Video Devices:", videoDevices.map(d => d.label));

                // Prefer "BRIO" or "Logitech" if available, but take ANY first device if not.
                const targetDevice = videoDevices.find(d => d.label.includes("BRIO") || d.label.includes("Logitech"));

                if (targetDevice) {
                    console.log(`[BioVisionManager] FOUND TARGET DEVICE: ${targetDevice.label}`);
                    videoDeviceId = targetDevice.deviceId;
                } else if (videoDevices.length > 0) {
                    // Fallback to first available
                    console.log(`[BioVisionManager] Target not found. Using default: ${videoDevices[0].label}`);
                    videoDeviceId = videoDevices[0].deviceId;
                } else {
                    console.warn("[BioVisionManager] No video devices found!");
                }
            } catch (e) {
                console.warn("[BioVisionManager] Device enumeration failed, using system default.", e);
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                    width: 640,
                    height: 480,
                    frameRate: { ideal: 30 }
                }
            });
            this.video.srcObject = stream;
            await this.video.play();
            console.log("[BioVisionManager] Camera started successfully.");

            // Setup offscreen canvas for frame capture
            // Note: In some browsers we can pass VideoFrame directly, but ImageBitmap is safer for now
            this.isRunning = true;
            this.loop();
        } catch (err) {
            console.error("[BioVisionManager] Camera access denied:", err);
        }
    }

    private async loop() {
        if (!this.isRunning || !this.video || !this.worker) return;

        if (this.video.readyState === 4) { // HAVE_ENOUGH_DATA
            // Backpressure: Drop frame if worker is busy
            if (this.isWorkerBusy) {
                requestAnimationFrame(this.loop.bind(this));
                return;
            }

            this.isWorkerBusy = true;
            const bitmap = await createImageBitmap(this.video);
            this.worker.postMessage({
                type: 'PROCESS_FRAME',
                data: { image: bitmap, timestamp: performance.now() }
            }, [bitmap]);
        }

        requestAnimationFrame(this.loop.bind(this));
    }

    public stop() {
        this.isRunning = false;
        if (this.video && this.video.srcObject) {
            const tracks = (this.video.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
        }
    }
}

export const bioVisionManager = new BioVisionManager();
