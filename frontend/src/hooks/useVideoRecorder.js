import { useRef, useCallback, useState } from "react";

/**
 * useVideoRecorder — records webcam video using MediaRecorder API.
 *
 * Usage:
 *   const { isRecording, startRecording, stopRecording, getBlob } = useVideoRecorder();
 *   startRecording(webcamVideoElement.srcObject);
 *   ...
 *   const blob = await stopRecording();
 */
export default function useVideoRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const blobRef = useRef(null);

    const startRecording = useCallback((mediaStream) => {
        if (!mediaStream || recorderRef.current) return;

        chunksRef.current = [];
        blobRef.current = null;

        // Pick the best supported codec
        const mimeType = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

        try {
            const recorder = new MediaRecorder(mediaStream, {
                mimeType,
                videoBitsPerSecond: 500_000, // 500kbps — small file size
            });

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
                blobRef.current = blob;
                console.log("[VideoRecorder] Recording saved:", (blob.size / 1024 / 1024).toFixed(1), "MB");
            };

            recorder.start(1000); // Collect data every 1s
            recorderRef.current = recorder;
            setIsRecording(true);
            console.log("[VideoRecorder] Started recording, codec:", mimeType);
        } catch (err) {
            console.warn("[VideoRecorder] Failed to start:", err.message);
        }
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            const recorder = recorderRef.current;
            if (!recorder || recorder.state === "inactive") {
                resolve(blobRef.current);
                return;
            }

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || "video/webm";
                const blob = new Blob(chunksRef.current, { type: mimeType });
                blobRef.current = blob;
                recorderRef.current = null;
                setIsRecording(false);
                console.log("[VideoRecorder] Stopped, size:", (blob.size / 1024 / 1024).toFixed(1), "MB");
                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    const getBlob = useCallback(() => blobRef.current, []);

    return { isRecording, startRecording, stopRecording, getBlob };
}
