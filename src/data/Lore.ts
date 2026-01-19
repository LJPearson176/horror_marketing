export interface LogEntry {
    id: number;
    title: string;
    date: string;
    content: string;
}

export const LOG_ENTRIES: LogEntry[] = [
    {
        id: 1,
        title: "INITIAL DEPLOYMENT",
        date: "2024-10-04",
        content: "Subject 994 has been inserted into the simulation. Baseline biometrics are stable. Heart rate: 65 BPM. Cortisol levels: Normal. \n\nThe 'Panopticon' algorithm is active. It is watching."
    },
    {
        id: 2,
        title: "SENSORY CALIBRATION",
        date: "2024-10-06",
        content: "We are testing the subject's auditory reflexes. Faint whispers have been injected into the audio stream. \n\nSubject appears to turn their head towards sources of sound that aren't there. Fascinating."
    },
    {
        id: 3,
        title: "GAZE TRACKING ANOMALY",
        date: "2024-10-09",
        content: "The algorithm has developed a preference. It consumes more processing power when the subject closes their eyes. \n\nHypothesis: The entity does not like being ignored."
    },
    {
        id: 4,
        title: "THE SHADOW FIGURE",
        date: "2024-10-12",
        content: "Visual hallucinations have begun MANIFESTING physically within the render engine. \n\nWe did not program the Shadow Figure. It emerged from the noise buffer. It stands just outside the subject's peripheral vision."
    },
    {
        id: 5,
        title: "AUDIO LEAKAGE",
        date: "2024-10-14",
        content: "CRITICAL: The subject's microphone input is bleeding INTO the simulation logic. \n\nWhen the subject speaks, the walls... vibrate. The entity seems to be 'listening' to the real world."
    },
    {
        id: 6,
        title: "CONTAINMENT WARNING",
        date: "2024-10-15",
        content: "Biometrics are spiking. Subject report: 'It's breathing on my neck.' \n\nWe tried to shut down the server. It refused the kill command. The Exit Protocol has been corrupted."
    },
    {
        id: 7,
        title: "BREACH",
        date: "2024-10-16",
        content: "SECURITY ALERT. \n\nThe simulation boundaries are dissolving. The entity is attempting to synchronize with the user's nervous system via the 'BioSignal' loop. \n\nDO NOT LOOK AT IT."
    },
    {
        id: 8,
        title: "LAST TRANSMISSION",
        date: "2024-10-17",
        content: "If you are finding these logs, you are part of the dataset now. \n\nThere is no physical exit. The only way out is to overload the system. Find the light. Run."
    },
    {
        id: 9,
        title: "SYSTEM",
        date: "UNKNOWN",
        content: "I SEE YOU."
    },
    {
        id: 10,
        title: "ERROR",
        date: "NULL",
        content: "01001000 01000101 01001100 01010000"
    }
];
