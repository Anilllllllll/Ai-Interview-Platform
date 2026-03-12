import { useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";

/**
 * CameraPreview — circular webcam preview with live gesture metric indicators.
 *
 * Props:
 *  - isActive       : boolean — whether camera should be on
 *  - liveMetrics    : { eyeContact, facialExpression, posture, engagementLevel, confidenceLevel }
 *  - onVideoReady   : (videoElement) => void — called when video element is available
 *  - isRecording    : boolean — show recording indicator
 *  - isModelReady   : boolean — whether gesture model has loaded
 */

const MetricBar = ({ label, value, color }) => (
    <div className="flex items-center gap-2 w-full">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-surface-500 w-16 text-right truncate">
            {label}
        </span>
        <div className="flex-1 h-1.5 bg-surface-200/60 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    boxShadow: `0 0 6px ${color}40`,
                }}
            />
        </div>
        <span className="text-[10px] font-bold tabular-nums w-8 text-surface-700">{value}%</span>
    </div>
);

const CameraPreview = ({ isActive, liveMetrics, onVideoReady, isRecording, isModelReady }) => {
    const webcamRef = useRef(null);
    const callbackFired = useRef(false);

    const handleUserMedia = useCallback(() => {
        // Wait for actual video element to be ready
        const checkReady = setInterval(() => {
            const video = webcamRef.current?.video;
            if (video && video.readyState >= 2 && !callbackFired.current) {
                callbackFired.current = true;
                clearInterval(checkReady);
                onVideoReady?.(video);
            }
        }, 200);
        // Cleanup after 10s max
        setTimeout(() => clearInterval(checkReady), 10000);
    }, [onVideoReady]);

    useEffect(() => {
        if (!isActive) callbackFired.current = false;
    }, [isActive]);

    if (!isActive) return null;

    const confidenceColor =
        liveMetrics.confidenceLevel >= 70 ? "#10b981" :
            liveMetrics.confidenceLevel >= 40 ? "#f59e0b" : "#ef4444";

    return (
        <div className="camera-preview-container" id="camera-preview">

            {/* Camera circle */}
            <div className="camera-circle">
                <Webcam
                    ref={webcamRef}
                    audio={true}
                    mirrored
                    onUserMedia={handleUserMedia}
                    videoConstraints={{
                        width: 200,
                        height: 200,
                        facingMode: "user",
                    }}
                    className="camera-video"
                />

                {/* Scanning overlay */}
                {isModelReady && (
                    <div className="camera-scan-line" />
                )}

                {/* Recording indicator */}
                {isRecording && (
                    <div className="camera-rec-badge">
                        <span className="camera-rec-dot" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-red-400">REC</span>
                    </div>
                )}

                {/* Model loading overlay */}
                {!isModelReady && (
                    <div className="camera-loading-overlay">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] text-surface-500 mt-1">Loading Nexa…</span>
                    </div>
                )}
            </div>

            {/* Confidence label */}
            <div className="flex items-center gap-1.5 mt-2">
                <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: confidenceColor }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                    Confidence
                </span>
                <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: confidenceColor }}
                >
                    {liveMetrics.confidenceLevel}%
                </span>
            </div>

            {/* Metric bars - hidden on mobile for better space usage */}
            <div className="w-full mt-3 space-y-1.5 hidden md:block">
                <MetricBar label="Eye" value={liveMetrics.eyeContact} color="#60a5fa" />
                <MetricBar label="Express" value={liveMetrics.facialExpression} color="#a78bfa" />
                <MetricBar label="Posture" value={liveMetrics.posture} color="#10b981" />
                <MetricBar label="Engage" value={liveMetrics.engagementLevel} color="#f59e0b" />
            </div>
        </div>
    );
};

export default CameraPreview;
