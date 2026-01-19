import * as Tone from 'tone';

class AudioManager {
    private droneL: Tone.Oscillator | null = null;
    private droneR: Tone.Oscillator | null = null;
    private screamSynth: Tone.PolySynth | null = null;
    private noise: Tone.Noise | null = null;
    private isInitialized = false;

    // New SFX
    private heartbeatSynth: Tone.MembraneSynth | null = null;
    private glitchSynth: Tone.NoiseSynth | null = null;
    private whisperSynth: Tone.NoiseSynth | null = null;
    private whisperPanner: Tone.Panner3D | null = null;

    private screamPlayer: Tone.Player | null = null;
    private pianoPlayer: Tone.Player | null = null;
    private doorClosePlayer: Tone.Player | null = null;
    private doorPanner: Tone.Panner3D | null = null;

    // ...

    public async init() {
        if (this.isInitialized) return;

        await Tone.start();
        console.log("Audio Context Started");

        // Load specific audio file
        this.screamPlayer = new Tone.Player({
            url: "/woman_yelling.mp3",
            autostart: false,
            onload: () => console.log("AudioManager: Scream Loaded")
        }).toDestination();

        // Load Horror Piano (Loop)
        this.pianoPlayer = new Tone.Player({
            url: "/horror_piano.mp3",
            autostart: true, // Should start when loaded? Or explicit start?
            loop: true,
            onload: () => {
                console.log("AudioManager: Piano Loaded");
                // Ensure it starts if init is called
                if (Tone.context.state === 'running') {
                    this.pianoPlayer?.start();
                }
            }
        }).toDestination();
        this.pianoPlayer.volume.value = -15;

        // Load Door Close SFX (Spatialized)
        // Load Door Close SFX (Spatialized)
        this.doorPanner = new Tone.Panner3D({
            positionX: 0,
            positionY: 0,
            positionZ: 2, // Closer (2m behind)
            refDistance: 1,
            rolloffFactor: 0.5, // Gentler falloff
            distanceModel: "exponential"
        }).toDestination();

        this.doorClosePlayer = new Tone.Player({
            url: "/door_close.mp3",
            autostart: false,
            onload: () => console.log("AudioManager: Door Close Loaded")
        }).connect(this.doorPanner);
        this.doorClosePlayer.volume.value = 0; // Boost volume (was -5)

        // ... existing synth init ...

        // ... existing synth init ...
        // 1. Dread Drone (Binaural Tension)
        // ...

        // Left Ear: Base Freq
        // Right Ear: Base Freq + Detune (Creates beating)
        // Disturbed Sub-Bass
        // 50Hz (Hum) -> 40Hz (Deep dread)
        this.droneL = new Tone.Oscillator(40, "sawtooth").toDestination();
        this.droneR = new Tone.Oscillator(40.5, "sawtooth6").toDestination(); // slightly different timbre

        // Lowpass filter to keep it distinct/dark
        const filter = new Tone.Filter(200, "lowpass").toDestination();
        this.droneL.connect(filter);
        this.droneR.connect(filter);

        this.droneL.volume.value = -40; // Start quiet (subtle)
        this.droneR.volume.value = -40;

        // 2. Scream Synth (FM Synthesis + Noise)
        this.screamSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3,
            modulationIndex: 10,
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 },
            modulation: { type: "square" },
            oscillator: { type: "sawtooth" }
        }).toDestination();
        this.screamSynth.volume.value = -10;

        this.noise = new Tone.Noise("pink").toDestination();
        this.noise.volume.value = -100; // Mute initially

        // 3. Heartbeat (Deep Thud)
        this.heartbeatSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
        }).toDestination();
        this.heartbeatSynth.volume.value = -5; // Prominent but not deafening

        // 4. Glitch/Spark (Electrical)
        this.glitchSynth = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
        }).toDestination();

        // 5. Whispers (Muffled Panned Noise)
        this.whisperSynth = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 1.0, decay: 2.0, sustain: 1.0, release: 3.0 }
        }).connect(new Tone.Filter(800, "bandpass").toDestination());

        this.whisperPanner = new Tone.Panner3D({
            positionX: 2,
            positionY: 0,
            positionZ: 1,
            refDistance: 1,
            rolloffFactor: 1.5, // Faster dropoff
        }).toDestination();
        this.whisperSynth.connect(this.whisperPanner);
        this.whisperSynth.volume.value = -100;

        this.isInitialized = true;
    }

    public triggerScream() {
        console.log("AudioManager: triggerScream called");
        // Priority: File -> Synth
        if (this.screamPlayer && this.screamPlayer.loaded) {
            console.log("AudioManager: Playing Scream File");
            this.screamPlayer.start();
        } else {
            console.warn("AudioManager: Scream File NOT LOADED (or player missing). Using Synth Fallback.");
            console.log("Player State:", this.screamPlayer?.state, "Loaded:", this.screamPlayer?.loaded);

            // Fallback to Synth
            if (this.screamSynth) {
                const now = Tone.now();
                this.screamSynth.triggerAttackRelease(["C5", "F#5", "A5", "C#6"], 0.5, now);
            }
        }

        // Noise Burst (Layering)
        if (this.noise) {
            this.noise.volume.rampTo(-5, 0.01, Tone.now());
            this.noise.volume.rampTo(-100, 1.0, Tone.now() + 0.5);
        }
    }

    public startDrone() {
        if (!this.isInitialized) return;
        this.droneL?.start();
        this.droneR?.start();
        this.noise?.start();
        if (this.pianoPlayer?.loaded && this.pianoPlayer.state === 'stopped') {
            this.pianoPlayer.start();
        }
    }

    public stopDrone() {
        this.droneL?.stop();
        this.droneR?.stop();
        this.noise?.stop();
    }

    public updateDrone(arousal: number, penalty: number = 0) {
        if (!this.droneL || !this.droneR || !this.noise) return;

        // Map Arousal (0-1) to Volume (-40 to -10)
        // High arousal = Louder drone
        // Penalty = Even louder but distorted
        const targetVol = -40 + (arousal * 30) + (penalty * 10);

        this.droneL.volume.rampTo(targetVol, 0.5);
        this.droneR.volume.rampTo(targetVol, 0.5);

        // Pitch Shift Logic (Gaze Punishment)
        // Normal: 40Hz
        // Penalty: Drop to 30Hz or lower (Dread)
        // Detune: Increase beating frequency
        const baseFreq = 40 - (penalty * 15); // Drop to 25Hz at max penalty
        const detuneAmount = 0.5 + (penalty * 5); // Huge detune (5Hz beat) at max

        this.droneL.frequency.rampTo(baseFreq, 0.5);
        this.droneR.frequency.rampTo(baseFreq + detuneAmount, 0.5);

        // Noise
        const noiseVol = -100 + (arousal * 70);
        this.noise.volume.rampTo(noiseVol, 0.1);

        // Background Piano (Ambience)
        if (this.pianoPlayer && this.pianoPlayer.loaded) {
            this.pianoPlayer.volume.rampTo(-15, 1.0);
        }
    }

    // ...

    // Whisper Volume (Only audible via explicit trigger now)




    public triggerWhisper(location: 'left' | 'right' | 'center') {
        if (!this.whisperSynth || !this.whisperPanner) return;

        // 3D Randomization around the head
        // Radius 2m
        const angle = location === 'left' ? -Math.PI / 2 : location === 'right' ? Math.PI / 2 : 0;
        // Add random jitter
        const theta = angle + (Math.random() - 0.5);

        const x = Math.sin(theta) * 2;
        const z = Math.cos(theta) * 2; // Front/Back variation

        this.whisperPanner.positionX.rampTo(x, 0.1);
        this.whisperPanner.positionZ.rampTo(z, 0.1);
        this.whisperPanner.positionY.rampTo(Math.random() - 0.5, 0.1); // Slightly up/down

        // Random duration
        const duration = Math.random() * 0.5 + 0.2;
        this.whisperSynth.volume.rampTo(-10, 0.1);
        this.whisperSynth.triggerAttackRelease("4n", Tone.now());

        this.whisperSynth.volume.rampTo(-100, 0.5, Tone.now() + duration);
    }

    public playBeep(freq: number, duration: number) {
        if (Tone.context.state !== 'running') return;
        const osc = new Tone.Oscillator(freq, "square").toDestination();
        osc.volume.value = -10;
        osc.start();
        osc.stop(Tone.now() + duration);
    }

    public trackDronePitch(multiplier: number) {
        if (!this.droneL || !this.droneR) return;
        // Bend pitch down/up temporarily
        const now = Tone.now();
        // Force cast to number to fix TS error, though .value should work. 
        // Or assume 60Hz base
        const currentFreq = (this.droneL.frequency as any).value || 60;

        this.droneL.frequency.rampTo(currentFreq * multiplier, 0.5, now);
        this.droneR.frequency.rampTo(currentFreq * multiplier, 0.5, now);
    }

    public triggerHeartbeat() {
        if (!this.heartbeatSynth) return;
        this.heartbeatSynth.triggerAttackRelease("C1", "8n");
    }

    public triggerGlitch() {
        if (!this.glitchSynth) return;
        this.glitchSynth.volume.value = -10;
        this.glitchSynth.triggerAttackRelease("16n");
    }

    public triggerDoorClose() {
        if (this.doorClosePlayer && this.doorClosePlayer.loaded) {
            console.log("AudioManager: Playing Door Close");
            // Randomize playback rate slightly for variety
            this.doorClosePlayer.playbackRate = 0.9 + Math.random() * 0.2;
            this.doorClosePlayer.start();
        } else {
            console.warn("AudioManager: Door Close SFX not loaded yet.");
        }
    }
}

export const audioManager = new AudioManager();
