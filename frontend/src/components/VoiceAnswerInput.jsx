import { useState, useEffect, useRef, useCallback } from "react";

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceAnswerInput = ({
    onSubmit,
    disabled,
    onRecordingChange,
    stopRequested = false,
}) => {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const finalTranscriptRef = useRef("");
    const interimTranscriptRef = useRef("");
    const savedTranscriptRef = useRef(""); // accumulates finalized text across recognition restarts
    const [displayFinal, setDisplayFinal] = useState("");
    const [displayInterim, setDisplayInterim] = useState("");

    const recognitionRef = useRef(null);
    const isStoppingRef = useRef(false);
    const silenceTimerRef = useRef(null);
    const statusRef = useRef("idle");
    const hasSubmittedRef = useRef(false);
    const autoStartTimerRef = useRef(null);
    const disabledRef = useRef(disabled);

    const SILENCE_TIMEOUT = 5000;

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { disabledRef.current = disabled; }, [disabled]);

    useEffect(() => {
        return () => { clearSilenceTimer(); clearAutoStartTimer(); destroyRecognition(); };
    }, []);

    const clearSilenceTimer = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    };
    const clearAutoStartTimer = () => {
        if (autoStartTimerRef.current) { clearTimeout(autoStartTimerRef.current); autoStartTimerRef.current = null; }
    };
    const destroyRecognition = () => {
        isStoppingRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { }
            recognitionRef.current = null;
        }
    };

    /** Build the full transcript from saved + current session text */
    const getFullTranscript = () => {
        return (savedTranscriptRef.current + " " + finalTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    };

    const resetSilenceTimer = () => {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            if (statusRef.current === "listening") {
                const captured = getFullTranscript();
                if (captured) stopAndSubmit();
            }
        }, SILENCE_TIMEOUT);
    };

    const scheduleAutoStart = useCallback((delayMs = 800) => {
        clearAutoStartTimer();
        autoStartTimerRef.current = setTimeout(() => {
            if (!disabledRef.current && statusRef.current === "idle") startListening();
        }, delayMs);
    }, []);

    const startListening = useCallback(() => {
        console.log("[Voice] startListening called, current status:", statusRef.current, "disabled:", disabledRef.current);
        if (statusRef.current === "listening" || statusRef.current === "processing") return;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported. Please use Google Chrome.");
            return;
        }

        setError(null);
        finalTranscriptRef.current = "";
        interimTranscriptRef.current = "";
        savedTranscriptRef.current = "";
        setDisplayFinal("");
        setDisplayInterim("");
        isStoppingRef.current = false;
        hasSubmittedRef.current = false;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log("[Voice] Recognition started");
            setStatus("listening");
            onRecordingChange?.(true);
        };

        recognition.onresult = (event) => {
            let finalText = "";
            let interimText = "";
            for (let i = 0; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) finalText += r[0].transcript;
                else interimText += r[0].transcript;
            }
            finalTranscriptRef.current = finalText;
            interimTranscriptRef.current = interimText;
            // Display includes saved text from previous recognition sessions
            const allFinal = (savedTranscriptRef.current + " " + finalText).trim();
            setDisplayFinal(allFinal);
            setDisplayInterim(interimText);
            console.log("[Voice] onresult — final:", finalText.substring(0, 30), "interim:", interimText.substring(0, 30));
            resetSilenceTimer();
        };

        recognition.onerror = (event) => {
            if (event.error === "aborted" || isStoppingRef.current) return;
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                destroyRecognition();
                setError("Microphone access denied. Please allow mic access and reload.");
                setStatus("idle");
                onRecordingChange?.(false);
            }
        };

        recognition.onend = () => {
            console.log("[Voice] Recognition ended, isStopping:", isStoppingRef.current, "status:", statusRef.current);
            // Save any finalized text from this session before restarting
            if (finalTranscriptRef.current) {
                savedTranscriptRef.current = (savedTranscriptRef.current + " " + finalTranscriptRef.current).trim();
                finalTranscriptRef.current = "";
            }
            if (!isStoppingRef.current && statusRef.current === "listening") {
                try { recognition.start(); return; } catch (_) { }
            }
            if (statusRef.current !== "processing") {
                setStatus("idle");
                onRecordingChange?.(false);
                if (!isStoppingRef.current && !disabledRef.current) scheduleAutoStart(1500);
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (_) {
            setError("Failed to start speech recognition. Tap the orb to retry.");
            setStatus("idle");
        }
    }, [onRecordingChange, scheduleAutoStart]);

    const stopAndSubmit = useCallback(() => {
        console.log("[Voice] stopAndSubmit called, hasSubmitted:", hasSubmittedRef.current);
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;
        clearSilenceTimer();
        clearAutoStartTimer();
        isStoppingRef.current = true;

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { }
            recognitionRef.current = null;
        }

        setStatus("processing");
        onRecordingChange?.(false);

        const answer = getFullTranscript();
        console.log("[Voice] Submitting answer:", answer.substring(0, 50));

        setTimeout(() => {
            if (answer) {
                onSubmit(answer);
            } else {
                hasSubmittedRef.current = false;
                setStatus("idle");
                if (!disabledRef.current) scheduleAutoStart(500);
            }
            finalTranscriptRef.current = "";
            interimTranscriptRef.current = "";
            savedTranscriptRef.current = "";
            setDisplayFinal("");
            setDisplayInterim("");
        }, 600);
    }, [onSubmit, onRecordingChange, scheduleAutoStart]);

    useEffect(() => {
        if (!disabled && !error) scheduleAutoStart(800);
        else clearAutoStartTimer();
        return () => clearAutoStartTimer();
    }, [disabled, error, scheduleAutoStart]);

    // Safety: if disabled becomes true while mic is active, stop it
    useEffect(() => {
        if (disabled && statusRef.current === "listening") {
            console.log("[Voice] Disabled while listening — stopping mic");
            destroyRecognition();
            clearSilenceTimer();
            setStatus("idle");
            onRecordingChange?.(false);
        }
    }, [disabled, onRecordingChange]);

    useEffect(() => {
        if (stopRequested) {
            if (statusRef.current === "listening") stopAndSubmit();
            else { destroyRecognition(); clearSilenceTimer(); clearAutoStartTimer(); }
        }
    }, [stopRequested, stopAndSubmit]);

    const fullTranscript = (displayFinal + " " + displayInterim).trim();

    // ── Determine orb class ──
    const orbClass = status === "listening"
        ? "voice-orb voice-orb-listening"
        : status === "processing"
            ? "voice-orb voice-orb-processing"
            : disabled
                ? "voice-orb voice-orb-disabled"
                : "voice-orb voice-orb-idle";

    if (error) {
        return (
            <div className="glass-panel p-8 relative overflow-hidden">
                <div className="voice-particles">
                    {[...Array(6)].map((_, i) => <div key={i} className="voice-particle" />)}
                </div>
                <div className="flex flex-col items-center space-y-5 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 border border-red-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <p className="text-red-600 text-sm text-center max-w-sm">{error}</p>
                    <button
                        onClick={() => { setError(null); startListening(); }}
                        className="btn-primary text-sm py-2.5 px-6 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Try Again</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 relative overflow-hidden" id="voice-answer-input">
            {/* Background particles */}
            <div className="voice-particles">
                {[...Array(6)].map((_, i) => <div key={i} className="voice-particle" />)}
            </div>

            <div className="flex flex-col items-center space-y-5 relative z-10">
                {/* Status label */}
                <div className="flex items-center space-x-2">
                    {status === "listening" && (
                        <span className="status-badge status-badge-recording">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Listening… speak now
                        </span>
                    )}
                    {status === "processing" && (
                        <span className="status-badge status-badge-evaluating">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Processing…
                        </span>
                    )}
                    {status === "idle" && disabled && (
                        <span className="status-badge status-badge-speaking">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Nexa is speaking…
                        </span>
                    )}
                    {status === "idle" && !disabled && (
                        <span className="status-badge status-badge-ready">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Ready — starting mic…
                        </span>
                    )}
                </div>

                {/* Mic Control Button - Sleeker version */}
                <div className="flex flex-col items-center">
                    <button
                        onClick={status === "listening" ? stopAndSubmit : startListening}
                        disabled={disabled || status === "processing"}
                        className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${status === "listening" ? "bg-red-500 shadow-lg shadow-red-500/30 active:scale-90" : "bg-primary-500 shadow-lg shadow-primary-500/30 active:scale-95 hover:bg-primary-600"}`}
                        id="voice-mic-button"
                    >
                        {status === "listening" ? (
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                        ) : status === "processing" ? (
                            <div className="w-6 h-6 border-3 border-white/80 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Instruction text */}
                <p className="text-xs text-surface-500 tracking-wide">
                    {status === "listening"
                        ? "Tap the orb to stop & submit"
                        : status === "processing"
                            ? "Submitting your answer…"
                            : disabled
                                ? ""
                                : "Tap the orb to start recording"}
                </p>

                {/* Waveform visualization */}
                {status === "listening" && (
                    <div className="flex items-center justify-center space-x-1.5 h-10">
                        {[...Array(9)].map((_, i) => (
                            <div
                                key={i}
                                className="voice-waveform-bar"
                                style={{
                                    animationDelay: `${i * 0.08}s`,
                                    background: `linear-gradient(to top, rgba(239,68,68,0.6), rgba(255,107,0,0.8))`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Live transcript */}
                {fullTranscript && (
                    <div className="w-full transcript-box p-4 mt-2">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-primary-600 tracking-wide uppercase">
                                Live Transcript
                            </span>
                        </div>
                        <p className="text-surface-700 text-sm leading-relaxed">
                            {displayFinal}
                            {displayInterim && (
                                <span className="text-surface-400 italic"> {displayInterim}</span>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceAnswerInput;
