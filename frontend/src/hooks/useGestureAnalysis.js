import { useState, useRef, useCallback, useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * Custom hook for real-time gesture analysis using MediaPipe FaceLandmarker.
 * Runs entirely client-side — no video is sent to the server.
 *
 * Returns:
 *  - liveMetrics   : real-time metrics object (updates every analysis frame)
 *  - averageMetrics: accumulated averages for final submission
 *  - isReady       : whether the model has loaded
 *  - analyzeFrame  : call with a video element to run one analysis
 *  - reset         : reset all accumulated data
 */

const ANALYSIS_INTERVAL = 500; // ms between analysis frames
const EMA_ALPHA = 0.3;         // smoothing factor: 0.3 = 30% new data, 70% previous
const DECAY_RATE = 3;          // points per failed frame to decay toward baseline
const DECAY_BASELINE = 40;     // target value when face not detected
const MAX_MISS_FRAMES = 6;     // after this many misses, fully decayed

// ── Helper: clamp a value between 0 and 100 ──
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

// ── Helper: exponential moving average ──
const ema = (prev, curr, alpha = EMA_ALPHA) => prev + alpha * (curr - prev);

// ── Helper: smoothly apply EMA to all metric keys ──
const smoothMetrics = (prev, curr) => ({
    eyeContact: clamp(ema(prev.eyeContact, curr.eyeContact)),
    facialExpression: clamp(ema(prev.facialExpression, curr.facialExpression)),
    posture: clamp(ema(prev.posture, curr.posture)),
    engagementLevel: clamp(ema(prev.engagementLevel, curr.engagementLevel)),
    confidenceLevel: clamp(ema(prev.confidenceLevel, curr.confidenceLevel)),
});

const DEFAULT_METRICS = {
    eyeContact: 50,
    facialExpression: 50,
    posture: 50,
    engagementLevel: 50,
    confidenceLevel: 50,
};

export default function useGestureAnalysis() {
    const [isReady, setIsReady] = useState(false);
    const [liveMetrics, setLiveMetrics] = useState({ ...DEFAULT_METRICS });

    const landmarkerRef = useRef(null);
    const samplesRef = useRef([]);
    const intervalRef = useRef(null);
    const videoRef = useRef(null);
    const smoothedRef = useRef({ ...DEFAULT_METRICS }); // EMA state
    const missCountRef = useRef(0); // consecutive face-not-found count

    // ── Initialize FaceLandmarker ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    outputFaceBlendshapes: true,
                });
                if (!cancelled) {
                    landmarkerRef.current = landmarker;
                    setIsReady(true);
                    console.log("[Gesture] FaceLandmarker ready");
                }
            } catch (err) {
                console.warn("[Gesture] Failed to init FaceLandmarker:", err.message);
                // Still mark as ready so the app doesn't block
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => {
            cancelled = true;
            if (landmarkerRef.current) {
                landmarkerRef.current.close();
                landmarkerRef.current = null;
            }
        };
    }, []);

    // ── Analyze a single video frame ──
    const analyzeFrame = useCallback((videoEl) => {
        if (!landmarkerRef.current || !videoEl || videoEl.readyState < 2) return null;

        try {
            const result = landmarkerRef.current.detectForVideo(videoEl, performance.now());

            // ── Handle face-not-found: decay gracefully ──
            if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
                missCountRef.current += 1;
                if (missCountRef.current <= MAX_MISS_FRAMES) {
                    // Gradually decay toward baseline
                    const prev = smoothedRef.current;
                    const decayed = {
                        eyeContact: Math.max(DECAY_BASELINE, prev.eyeContact - DECAY_RATE),
                        facialExpression: Math.max(DECAY_BASELINE, prev.facialExpression - DECAY_RATE),
                        posture: Math.max(DECAY_BASELINE, prev.posture - DECAY_RATE),
                        engagementLevel: Math.max(DECAY_BASELINE, prev.engagementLevel - DECAY_RATE),
                        confidenceLevel: Math.max(DECAY_BASELINE, prev.confidenceLevel - DECAY_RATE),
                    };
                    smoothedRef.current = decayed;
                    setLiveMetrics({ ...decayed });
                }
                return null;
            }

            // Face found — reset miss counter
            missCountRef.current = 0;

            const landmarks = result.faceLandmarks[0];
            const blendshapes = result.faceBlendshapes?.[0]?.categories || [];

            // ── Build a map of blendshape scores ──
            const bs = {};
            blendshapes.forEach((b) => { bs[b.categoryName] = b.score; });

            // ═══════════════════════════════════════════════════════════
            // 1. EYE CONTACT (0–100)
            //    - Face position in frame (nose tip deviation from center)
            //    - Gaze direction via look-away blendshapes (averaged, not summed)
            //    - Baseline boost: webcam users naturally look near the camera
            // ═══════════════════════════════════════════════════════════
            const noseTip = landmarks[1];
            const xOffset = Math.abs(noseTip.x - 0.5) * 2; // 0 = centered, 1 = edge
            const yOffset = Math.abs(noseTip.y - 0.5) * 2;

            // Average the 6 look-away blendshapes → 0 to 1 (not 0 to 6)
            const lookAwayValues = [
                bs.eyeLookDownLeft || 0, bs.eyeLookDownRight || 0,
                bs.eyeLookUpLeft || 0, bs.eyeLookUpRight || 0,
                bs.eyeLookOutLeft || 0, bs.eyeLookOutRight || 0,
            ];
            const lookAwayAvg = lookAwayValues.reduce((a, b) => a + b, 0) / lookAwayValues.length;

            // Looking-in blendshapes indicate looking toward center (at screen)
            const lookInAvg = ((bs.eyeLookInLeft || 0) + (bs.eyeLookInRight || 0)) / 2;

            const rawEyeContact = clamp(
                85                          // baseline: webcam user is generally looking at screen
                - xOffset * 20              // face off-center penalty (mild)
                - yOffset * 15              // face off-center vertically (milder)
                - lookAwayAvg * 60          // looking away penalty (normalized 0–1)
                + lookInAvg * 15            // looking toward screen bonus
            );

            // ═══════════════════════════════════════════════════════════
            // 2. FACIAL EXPRESSION (0–100)
            //    - Smile, brow raise, mouth openness → positive
            //    - Frown → negative
            //    - All inputs normalized to 0–1 before weighting
            // ═══════════════════════════════════════════════════════════
            const smileNorm = ((bs.mouthSmileLeft || 0) + (bs.mouthSmileRight || 0)) / 2;   // 0–1
            const browUpNorm = ((bs.browInnerUp || 0) + (bs.browOuterUpLeft || 0) + (bs.browOuterUpRight || 0)) / 3; // 0–1
            const jawOpen = bs.jawOpen || 0; // already 0–1
            const frownNorm = ((bs.mouthFrownLeft || 0) + (bs.mouthFrownRight || 0)) / 2;   // 0–1
            const mouthPress = ((bs.mouthPressLeft || 0) + (bs.mouthPressRight || 0)) / 2;   // 0–1 tension

            const rawFacialExpression = clamp(
                50                          // neutral baseline
                + smileNorm * 40            // smiling is strongly positive
                + browUpNorm * 15           // raised brows = engaged/interested
                + jawOpen * 10              // speaking / animated
                - frownNorm * 25            // frowning is negative
                - mouthPress * 10           // pressed lips = tension
            );

            // ═══════════════════════════════════════════════════════════
            // 3. POSTURE (0–100)
            //    - Roll: difference in Y between left ear (234) and right ear (454)
            //    - Pitch: ratio of forehead-to-nose vs nose-to-chin distance
            //    - Yaw: nose tip X deviation from inter-pupil midpoint
            //    - Centering: face position in frame
            // ═══════════════════════════════════════════════════════════
            // Roll detection (head tilt)
            const earDiffY = Math.abs((landmarks[234].y || 0) - (landmarks[454].y || 0));
            const rollScore = clamp(100 - earDiffY * 500); // penalize tilt

            // Pitch detection (nodding up/down)
            const foreheadToNose = Math.abs(landmarks[10].y - landmarks[1].y);
            const noseToChin = Math.abs(landmarks[1].y - landmarks[152].y);
            const pitchRatio = foreheadToNose / (noseToChin + 0.001); // ~1.0 when upright
            const pitchDeviation = Math.abs(pitchRatio - 1.0);
            const pitchScore = clamp(100 - pitchDeviation * 100);

            // Yaw detection (turning left/right)
            const leftEyeX = landmarks[33].x;
            const rightEyeX = landmarks[263].x;
            const eyeMidX = (leftEyeX + rightEyeX) / 2;
            const noseDeviationFromEyes = Math.abs(noseTip.x - eyeMidX);
            const yawScore = clamp(100 - noseDeviationFromEyes * 600);

            // Face centering (mild contribution)
            const centerScore = clamp(100 - (xOffset * 25 + yOffset * 20));

            const rawPosture = clamp(
                rollScore * 0.30 +
                pitchScore * 0.25 +
                yawScore * 0.25 +
                centerScore * 0.20
            );

            // ═══════════════════════════════════════════════════════════
            // 4. ENGAGEMENT (0–100)
            //    - All inputs normalized to 0–100 before combining
            //    - Eye openness normalized: (0–1) → (0–100)
            //    - Composite of attention, expression, and stability
            // ═══════════════════════════════════════════════════════════
            const eyeOpenL = bs.eyeBlinkLeft ? 1 - bs.eyeBlinkLeft : 0.85;
            const eyeOpenR = bs.eyeBlinkRight ? 1 - bs.eyeBlinkRight : 0.85;
            const eyeOpennessNorm = clamp(((eyeOpenL + eyeOpenR) / 2) * 100); // normalized to 0–100

            // Head nodding detection (slight nodding = engaged)
            const browActivity = browUpNorm * 100; // normalized to 0–100

            const rawEngagement = clamp(
                rawEyeContact * 0.25 +          // looking at camera
                rawFacialExpression * 0.20 +     // animated/expressive
                eyeOpennessNorm * 0.25 +         // eyes open (not drowsy)
                rawPosture * 0.15 +              // upright posture
                browActivity * 0.15              // active facial muscle movement
            );

            // ═══════════════════════════════════════════════════════════
            // 5. CONFIDENCE (0–100)
            //    - Composite of stable, assertive signals
            // ═══════════════════════════════════════════════════════════
            const rawConfidence = clamp(
                rawEyeContact * 0.30 +           // steady gaze
                rawPosture * 0.25 +              // upright posture
                (100 - lookAwayAvg * 80) * 0.20 + // not looking away
                rawFacialExpression * 0.15 +     // positive expression
                rawEngagement * 0.10             // overall engagement
            );

            // ── Apply EMA smoothing ──
            const rawMetrics = {
                eyeContact: rawEyeContact,
                facialExpression: rawFacialExpression,
                posture: rawPosture,
                engagementLevel: rawEngagement,
                confidenceLevel: rawConfidence,
            };

            const smoothed = smoothMetrics(smoothedRef.current, rawMetrics);
            smoothedRef.current = smoothed;

            // Accumulate samples (use smoothed values for stable averages)
            samplesRef.current.push({ ...smoothed });

            setLiveMetrics({ ...smoothed });
            return smoothed;
        } catch (err) {
            // Silently handle analysis errors
            console.warn("[Gesture] Analysis error:", err.message);
            return null;
        }
    }, []);

    // ── Start continuous analysis on a video element ──
    const startAnalysis = useCallback((videoEl) => {
        videoRef.current = videoEl;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (videoRef.current) analyzeFrame(videoRef.current);
        }, ANALYSIS_INTERVAL);
    }, [analyzeFrame]);

    // ── Stop continuous analysis ──
    const stopAnalysis = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // ── Get accumulated average metrics ──
    const getAverageMetrics = useCallback(() => {
        const samples = samplesRef.current;
        if (samples.length === 0) {
            return { ...DEFAULT_METRICS };
        }
        const avg = (key) => Math.round(samples.reduce((s, m) => s + m[key], 0) / samples.length);
        return {
            eyeContact: avg("eyeContact"),
            facialExpression: avg("facialExpression"),
            posture: avg("posture"),
            engagementLevel: avg("engagementLevel"),
            confidenceLevel: avg("confidenceLevel"),
        };
    }, []);

    // ── Reset ──
    const reset = useCallback(() => {
        samplesRef.current = [];
        missCountRef.current = 0;
        smoothedRef.current = { ...DEFAULT_METRICS };
        setLiveMetrics({ ...DEFAULT_METRICS });
    }, []);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return { isReady, liveMetrics, analyzeFrame, startAnalysis, stopAnalysis, getAverageMetrics, reset };
}
