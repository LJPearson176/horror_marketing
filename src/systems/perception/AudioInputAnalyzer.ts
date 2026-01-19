import { useBioSignalStore } from './BioSignalStore';

export class AudioInputAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphone: MediaStreamAudioSourceNode | null = null;
    private dataArray: Uint8Array | null = null;
    private isActive = false;

    // Tuning
    private screamThreshold = 0.2; // Normalized volume (0-1) - Lowered from 0.5 for easier triggering
    // private breathThreshold = 0.05; // Future use

    async init() {
        if (this.isActive) return;

        try {
            console.log("AudioAnalyzer: Requesting Microphone Access...");
            // 1. Initial Request to unlock permissions/enumeration
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Enumerate & Find "Angetube"
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(d => d.kind === 'audioinput');
            console.log("AudioAnalyzer: Available Devices:", audioDevices.map(d => d.label));

            // 2. Enumerate & Find "AngeTube" (Case insensitive, broad search)
            const targetDevice = audioDevices.find(d => {
                const label = d.label.toLowerCase();
                return label.includes("angetube") || label.includes("angletube");
            }) || audioDevices.find(d => d.label.toLowerCase().includes("usb")); // Fallback to any USB device

            const deviceId = targetDevice ? targetDevice.deviceId : undefined;

            if (targetDevice) {
                console.log(`AudioAnalyzer: FOUND TARGET DEVICE: ${targetDevice.label}`);
            } else {
                console.warn("AudioAnalyzer: Target 'Angetube' not found. Using default.");
            }

            // 3. Get Specific Stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceId ? { exact: deviceId } : undefined
                },
                video: false
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();

            // FFT Size
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.microphone.connect(this.analyser);
            // Do NOT connect to destination (speakers) to avoid feedback loop!

            this.isActive = true;
            console.log("AudioAnalyzer: Listening.");
            this.analyzeLoop();
        } catch (e) {
            console.warn("AudioAnalyzer: Mic access denied or failed.", e);
        }
    }

    private analyzeLoop = () => {
        if (!this.isActive || !this.analyser || !this.dataArray) return;

        requestAnimationFrame(this.analyzeLoop);

        // Get Time Domain Data (Waveform) for Volume
        // @ts-ignore - TS Strictness issue with ArrayBufferLike
        this.analyser.getByteTimeDomainData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            // Center around 128
            const x = (this.dataArray[i] - 128) / 128.0;
            sum += x * x;
        }

        const rms = Math.sqrt(sum / this.dataArray.length);

        // Push to Store
        const { updateMetric, affectiveState, setAffectiveState } = useBioSignalStore.getState();

        updateMetric('audioLevel', rms);

        // Heuristic: Scream?
        // High volume?
        const isScreaming = rms > this.screamThreshold;

        if (isScreaming) {
            console.log("AudioAnalyzer: SCREAM DETECTED!", rms);
            updateMetric('isScreaming', 1);

            // Immediate Arousal Spike
            const newArousal = Math.min(1.0, affectiveState.arousal + 0.2);
            if (newArousal > affectiveState.arousal) {
                setAffectiveState({ arousal: newArousal });
            }
        } else {
            updateMetric('isScreaming', 0);
        }
    };

    stop() {
        this.isActive = false;
        if (this.microphone) this.microphone.disconnect();
        if (this.audioContext) this.audioContext.close();
    }
}

export const audioInputAnalyzer = new AudioInputAnalyzer();
