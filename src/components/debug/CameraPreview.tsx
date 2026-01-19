import { useEffect, useRef } from 'react';
import { bioVisionManager } from '../../systems/perception/BioVisionManager';
import { useBioSignalStore } from '../../systems/perception/BioSignalStore';

export const CameraPreview = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { faceLandmarks } = useBioSignalStore();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Poll for stream availability
        const checkStream = setInterval(() => {
            const stream = bioVisionManager.getStream();
            if (stream) {
                video.srcObject = stream;
                video.play().catch(console.error);
                clearInterval(checkStream);
            }
        }, 1000);

        return () => clearInterval(checkStream);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !faceLandmarks) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Landmarks
        ctx.fillStyle = '#00FF00';
        for (const pt of faceLandmarks) {
            const x = pt.x * canvas.width;
            const y = pt.y * canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }

    }, [faceLandmarks]);

    return (
        <div className="fixed bottom-4 left-4 z-50 w-48 border-2 border-green-500/50 rounded overflow-hidden pointer-events-none bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>
    );
};
