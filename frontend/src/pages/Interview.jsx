import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { interviewAPI, uploadAPI } from "../services/api";
import InterviewChat from "../components/InterviewChat";
import VoiceAnswerInput from "../components/VoiceAnswerInput";
import CameraPreview from "../components/CameraPreview";
import useGestureAnalysis from "../hooks/useGestureAnalysis";
import useVideoRecorder from "../hooks/useVideoRecorder";
import { saveRecording } from "../utils/videoStorage";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload, FileText, X, CheckCircle2, Brain, Code2, Briefcase,
    GraduationCap, Sparkles, AlertCircle, Mic, Target
} from "lucide-react";

const DOMAINS = [
    "Technology", "Data Science", "Finance", "Healthcare",
    "Marketing", "Product Management", "Cybersecurity", "Consulting", "Other",
];
const SPECIALIZATIONS = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer",
    "Data Scientist", "ML Engineer", "Product Manager",
    "DevOps Engineer", "Mobile Developer", "QA Engineer", "Other",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const INTERVIEW_TYPES = ["Technical", "Behavioral", "System Design", "Mixed"];

const Interview = () => {
    const { user, token } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ── core state ─────────────────────────────────────────────────
    const [socket, setSocket] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [transcript, setTranscript] = useState([]);
    const [isStarted, setIsStarted] = useState(false);
    const [checkingActive, setCheckingActive] = useState(true);

    // ── voice-flow state ───────────────────────────────────────────
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [stopMicRequested, setStopMicRequested] = useState(false);

    const [questionCount, setQuestionCount] = useState(0);
    const socketRef = useRef(null);
    const sessionIdRef = useRef(null);

    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

    const [config, setConfig] = useState({
        role: "",
        domain: user?.domain || "Technology",
        specialization: user?.specialization || "Full Stack Developer",
        difficulty: "Medium",
        interviewType: "Mixed",
    });

    // ── resume mode state ──────────────────────────────────────────
    const [interviewMode, setInterviewMode] = useState("domain"); // "domain" | "resume"
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeUploading, setResumeUploading] = useState(false);
    const [resumeAnalysis, setResumeAnalysis] = useState(null);
    const [resumeText, setResumeText] = useState(null);
    const [resumeError, setResumeError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // ── check for active session on mount ──────────────────────────
    useEffect(() => {
        const checkActiveSession = async () => {
            try {
                const response = await interviewAPI.getActive();
                if (response.data.session) {
                    const session = response.data.session;
                    setSessionId(session._id);
                    setTranscript(session.transcript || []);
                    setIsStarted(true);
                    setConfig({
                        role: session.role,
                        domain: session.domain,
                        specialization: session.specialization,
                        difficulty: session.difficulty,
                        interviewType: session.interviewType,
                    });
                }
            } catch (error) {
                console.error("Error checking active session:", error);
            } finally {
                setCheckingActive(false);
            }
        };
        checkActiveSession();
    }, []);

    // ── manage focused interview mode ──────────────────────────────
    useEffect(() => {
        if (isStarted) {
            document.body.classList.add("interview-active");
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = "You are currently in an active interview session. If you leave, your interview will be lost.";
                return e.returnValue;
            };
            window.addEventListener("beforeunload", handleBeforeUnload);
            return () => {
                document.body.classList.remove("interview-active");
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        } else {
            document.body.classList.remove("interview-active");
        }
    }, [isStarted]);


    // ── Text-to-Speech ─────────────────────────────────────────────
    const ttsTimerRef = useRef(null);
    const ttsResumeIntervalRef = useRef(null);

    const speakQuestion = useCallback((text) => {
        if (ttsTimerRef.current) { clearTimeout(ttsTimerRef.current); ttsTimerRef.current = null; }
        if (ttsResumeIntervalRef.current) { clearInterval(ttsResumeIntervalRef.current); ttsResumeIntervalRef.current = null; }

        if (!window.speechSynthesis) {
            console.warn("[TTS] speechSynthesis not available, skipping TTS");
            return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        const cleanup = () => {
            if (ttsTimerRef.current) { clearTimeout(ttsTimerRef.current); ttsTimerRef.current = null; }
            if (ttsResumeIntervalRef.current) { clearInterval(ttsResumeIntervalRef.current); ttsResumeIntervalRef.current = null; }
            setIsSpeaking(false);
        };

        utterance.onstart = () => {
            console.log("[TTS] Started speaking");
            ttsResumeIntervalRef.current = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);
        };

        utterance.onend = () => {
            console.log("[TTS] Finished speaking");
            cleanup();
        };

        utterance.onerror = (e) => {
            console.warn("[TTS] Error:", e.error);
            cleanup();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        const estimatedMs = Math.max(text.length * 80, 5000) + 3000;
        ttsTimerRef.current = setTimeout(() => {
            if (window.speechSynthesis.speaking) {
                console.warn("[TTS] Safety timeout — cancelling stuck TTS");
                window.speechSynthesis.cancel();
            }
            cleanup();
        }, estimatedMs);
    }, []);

    // ── Socket.IO setup ────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        newSocket.on("connect", () => { console.log("Socket connected"); });
        newSocket.on("connect_error", (err) => { console.error("Socket connection error:", err.message); });

        newSocket.on("interview:question", (data) => {
            setIsProcessingAnswer(false);
            setStopMicRequested(false);

            if (data.resumed && data.transcript) {
                setTranscript(data.transcript);
            } else if (data.transcript) {
                setTranscript(data.transcript);
            } else {
                setTranscript((prev) => [...prev, { role: "assistant", content: data.question }]);
            }
            setSessionId(data.sessionId);
            setIsStarted(true);

            if (data.question) {
                setQuestionCount((c) => c + 1);
                speakQuestion(data.question);
            }
        });

        newSocket.on("interview:end", (data) => {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
            setIsEnding(false);
            setIsStarted(false);
            setIsProcessingAnswer(false);
            toast.success("Interview completed! Redirecting to report...");
            navigate(`/report/${data.session._id}`);
        });

        newSocket.on("interview:error", (data) => {
            setIsProcessingAnswer(false);
            setIsEnding(false);
            toast.error(data.message);
        });

        setSocket(newSocket);

        return () => {
            window.speechSynthesis?.cancel();
            if (ttsTimerRef.current) clearTimeout(ttsTimerRef.current);
            if (ttsResumeIntervalRef.current) clearInterval(ttsResumeIntervalRef.current);
            newSocket.disconnect();
        };
    }, [token, navigate, speakQuestion]);

    // ── Resume upload handler ──────────────────────────────────────
    const handleResumeUpload = useCallback(async (file) => {
        if (!file) return;
        const validTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!validTypes.includes(file.type)) {
            setResumeError("Only PDF and DOCX files are supported.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setResumeError("File size must be under 5MB.");
            return;
        }

        setResumeFile(file);
        setResumeError(null);
        setResumeUploading(true);
        setResumeAnalysis(null);
        setResumeText(null);

        try {
            const formData = new FormData();
            formData.append("resume", file);
            const response = await uploadAPI.uploadAndParseResume(formData);
            setResumeText(response.data.resumeText);
            setResumeAnalysis(response.data.resumeAnalysis);
            toast.success("Resume analyzed successfully!");
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to analyze resume. Please try again.";
            setResumeError(msg);
            setResumeFile(null);
            toast.error(msg);
        } finally {
            setResumeUploading(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleResumeUpload(file);
    }, [handleResumeUpload]);

    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
    const handleDragLeave = useCallback(() => { setIsDragOver(false); }, []);

    const clearResume = useCallback(() => {
        setResumeFile(null);
        setResumeAnalysis(null);
        setResumeText(null);
        setResumeError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    // ── handlers ───────────────────────────────────────────────────
    const handleStart = useCallback(() => {
        if (!config.role.trim()) { toast.error("Please enter the job role"); return; }
        if (!socket) { toast.error("Connection not established. Please refresh."); return; }
        if (interviewMode === "resume" && !resumeAnalysis) {
            toast.error("Please upload and analyze your resume first.");
            return;
        }
        setIsProcessingAnswer(true);
        socket.emit("interview:start", {
            ...config,
            interviewMode,
            resumeData: interviewMode === "resume" ? { resumeText, resumeAnalysis } : null,
        });
    }, [socket, config, interviewMode, resumeText, resumeAnalysis]);

    const handleAnswer = useCallback(
        (answer) => {
            if (!socketRef.current || !sessionIdRef.current) return;
            if (!answer.trim()) return;
            console.log("[Interview] Answer received:", answer.substring(0, 50) + "...");
            setTranscript((prev) => [...prev, { role: "user", content: answer }]);
            setIsProcessingAnswer(true);
            socketRef.current.emit("interview:answer", { sessionId: sessionIdRef.current, answer });
        },
        []
    );

    // ── Camera / Gesture analysis ──────────────────────────────────
    const { isReady: isGestureReady, liveMetrics, startAnalysis, stopAnalysis, getAverageMetrics, reset: resetGesture } = useGestureAnalysis();
    const { startRecording, stopRecording: stopVideoRecording } = useVideoRecorder();
    const [cameraActive, setCameraActive] = useState(false);

    const handleCameraReady = useCallback((videoEl) => {
        console.log("[Camera] Video ready, starting gesture analysis & recording");
        startAnalysis(videoEl);
        if (videoEl.srcObject) { startRecording(videoEl.srcObject); }
    }, [startAnalysis, startRecording]);

    useEffect(() => {
        if (isStarted && !cameraActive) setCameraActive(true);
        if (!isStarted && cameraActive) { setCameraActive(false); stopAnalysis(); }
    }, [isStarted, cameraActive, stopAnalysis]);

    const handleEnd = useCallback(async () => {
        if (!socketRef.current || !sessionIdRef.current) return;
        if (isProcessingAnswer) { toast.info("Please wait for the current answer to be processed."); return; }

        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setStopMicRequested(true);
        stopAnalysis();
        const gestureAnalysis = getAverageMetrics();
        console.log("[Camera] Final gesture data:", gestureAnalysis);

        try {
            const videoBlob = await stopVideoRecording();
            if (videoBlob && sessionIdRef.current) {
                await saveRecording(sessionIdRef.current, videoBlob);
                console.log("[Video] Recording saved to IndexedDB");
            }
        } catch (err) {
            console.warn("[Video] Failed to save recording:", err.message);
        }

        setIsEnding(true);
        socketRef.current.emit("interview:end", { sessionId: sessionIdRef.current, gestureAnalysis });
    }, [isProcessingAnswer, stopAnalysis, getAverageMetrics, stopVideoRecording]);

    const handleRecordingChange = useCallback((recording) => { setIsRecording(recording); }, []);

    const voiceDisabled = isSpeaking || isProcessingAnswer || isEnding;

    // ── render: loading ────────────────────────────────────────────
    if (checkingActive) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-surface-500 text-sm">Checking for active sessions...</p>
                </div>
            </div>
        );
    }

    // ── render: config screen ──────────────────────────────────────
    if (!isStarted) {
        const canStart = config.role.trim() && (interviewMode === "domain" || resumeAnalysis);

        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 -left-32 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[100px] animate-float" />
                    <div className="absolute bottom-20 -right-32 w-[500px] h-[500px] bg-primary-50/40 rounded-full blur-[100px] animate-float-delayed" />
                </div>

                <div className="text-center mb-8 relative z-10 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-500/30 animate-bounce-subtle">
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-surface-900 font-heading">{t("interview.startTitle")}</h1>
                    <p className="text-surface-500 mt-2">Configure your AI-powered voice interview</p>
                </div>

                <div className="relative rounded-2xl border border-primary-100/60 p-8 animate-slide-up overflow-hidden"
                    style={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(24px) saturate(150%)", boxShadow: "0 8px 40px rgba(255, 107, 0, 0.08)" }}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

                    <div className="space-y-6 relative z-10">

                        {/* ── Interview Mode Toggle ── */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-2">Interview Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { mode: "domain", icon: Target, label: "Domain-Based", desc: "Questions from selected domain" },
                                    { mode: "resume", icon: FileText, label: "Resume-Based", desc: "Questions from your resume" },
                                ].map(({ mode, icon: Icon, label, desc }) => (
                                    <motion.button
                                        key={mode}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => { setInterviewMode(mode); if (mode === "domain") clearResume(); }}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 overflow-hidden ${
                                            interviewMode === mode
                                                ? "border-primary-500 bg-primary-50/50"
                                                : "border-surface-200 bg-white hover:border-primary-200"
                                        }`}
                                    >
                                        {interviewMode === mode && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <Icon className={`w-6 h-6 mb-2 ${interviewMode === mode ? "text-primary-500" : "text-surface-400"}`} />
                                        <p className={`text-sm font-semibold ${interviewMode === mode ? "text-primary-700" : "text-surface-700"}`}>{label}</p>
                                        <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* ── Resume Upload Area (shown only in resume mode) ── */}
                        <AnimatePresence mode="wait">
                            {interviewMode === "resume" && (
                                <motion.div
                                    key="resume-upload"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {!resumeAnalysis && !resumeUploading && (
                                        <div
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                                                isDragOver
                                                    ? "border-primary-500 bg-primary-50/60 scale-[1.01]"
                                                    : resumeError
                                                        ? "border-red-300 bg-red-50/30"
                                                        : "border-surface-300 bg-surface-50/50 hover:border-primary-300 hover:bg-primary-50/30"
                                            }`}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => handleResumeUpload(e.target.files?.[0])}
                                                className="hidden"
                                            />
                                            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? "text-primary-500" : "text-surface-400"}`} />
                                            <p className="text-sm font-medium text-surface-700">
                                                {isDragOver ? "Drop your resume here" : "Drag & drop your resume or click to browse"}
                                            </p>
                                            <p className="text-xs text-surface-400 mt-1">Supports PDF and DOCX (max 5MB)</p>

                                            {resumeError && (
                                                <div className="flex items-center justify-center space-x-1.5 mt-3 text-red-500">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{resumeError}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Uploading / Analyzing animation */}
                                    {resumeUploading && (
                                        <div className="relative border-2 border-primary-200 rounded-xl p-8 text-center bg-primary-50/40">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-xl shadow-primary-500/30 animate-pulse">
                                                        <Brain className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div className="absolute -inset-2 rounded-3xl border-2 border-primary-300 animate-ping opacity-30" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-primary-700">Analyzing your resume...</p>
                                                    <p className="text-xs text-surface-400 mt-1">Extracting skills, projects, and experience</p>
                                                </div>
                                                <div className="w-48 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full shimmer" style={{ width: "70%", backgroundSize: "200% 100%" }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resume analyzed successfully */}
                                    {resumeAnalysis && !resumeUploading && (
                                        <div className="relative border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-emerald-700">Resume Analyzed Successfully</p>
                                                        <p className="text-xs text-surface-400 flex items-center space-x-1">
                                                            <FileText className="w-3 h-3" />
                                                            <span>{resumeFile?.name}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={clearResume}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors"
                                                    title="Remove resume"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Analysis preview */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {resumeAnalysis.primarySkills?.length > 0 && (
                                                    <div className="p-3 rounded-lg bg-white/70 border border-emerald-100">
                                                        <div className="flex items-center space-x-1.5 mb-2">
                                                            <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-semibold text-surface-700">Skills</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {resumeAnalysis.primarySkills.slice(0, 6).map((skill, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-medium text-emerald-700">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {resumeAnalysis.primarySkills.length > 6 && (
                                                                <span className="px-2 py-0.5 rounded-full bg-surface-100 text-[10px] font-medium text-surface-500">
                                                                    +{resumeAnalysis.primarySkills.length - 6} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {resumeAnalysis.projects?.length > 0 && (
                                                    <div className="p-3 rounded-lg bg-white/70 border border-emerald-100">
                                                        <div className="flex items-center space-x-1.5 mb-2">
                                                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-semibold text-surface-700">Projects</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {resumeAnalysis.projects.slice(0, 3).map((proj, i) => (
                                                                <p key={i} className="text-[11px] text-surface-600 truncate">• {proj.name}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {resumeAnalysis.techStack?.length > 0 && (
                                                    <div className="p-3 rounded-lg bg-white/70 border border-emerald-100">
                                                        <div className="flex items-center space-x-1.5 mb-2">
                                                            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-semibold text-surface-700">Tech Stack</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {resumeAnalysis.techStack.slice(0, 5).map((tech, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-medium text-blue-700">
                                                                    {tech}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {resumeAnalysis.experienceLevel && (
                                                    <div className="p-3 rounded-lg bg-white/70 border border-emerald-100">
                                                        <div className="flex items-center space-x-1.5 mb-2">
                                                            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-semibold text-surface-700">Experience</span>
                                                        </div>
                                                        <p className="text-xs text-surface-600">{resumeAnalysis.experienceLevel}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Config fields ── */}
                        <div>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5" htmlFor="iv-role">{t("interview.role")}</label>
                            <input id="iv-role" type="text" value={config.role}
                                onChange={(e) => setConfig({ ...config, role: e.target.value })}
                                className="input-field" placeholder={t("interview.rolePlaceholder")} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5" htmlFor="iv-domain">{t("interview.domain")}</label>
                                <select id="iv-domain" value={config.domain} onChange={(e) => setConfig({ ...config, domain: e.target.value })} className="select-field">
                                    {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5" htmlFor="iv-spec">{t("interview.specialization")}</label>
                                <select id="iv-spec" value={config.specialization} onChange={(e) => setConfig({ ...config, specialization: e.target.value })} className="select-field">
                                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5" htmlFor="iv-diff">{t("interview.difficulty")}</label>
                                <select id="iv-diff" value={config.difficulty} onChange={(e) => setConfig({ ...config, difficulty: e.target.value })} className="select-field">
                                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5" htmlFor="iv-type">{t("interview.type")}</label>
                                <select id="iv-type" value={config.interviewType} onChange={(e) => setConfig({ ...config, interviewType: e.target.value })} className="select-field">
                                    {INTERVIEW_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={handleStart} disabled={isProcessingAnswer || !canStart}
                            className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white font-semibold rounded-xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative">
                            <span className="relative z-10 flex items-center space-x-2.5">
                                {isProcessingAnswer ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{t("interview.thinking")}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{interviewMode === "resume" ? "Start Resume Interview" : t("interview.start")}</span>
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── render: interview session ──────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 glass-panel rounded-none border-x-0 border-t-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50/30 via-transparent to-primary-50/30" />

                <div className="flex items-center space-x-4 min-w-0 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-surface-900 truncate">{config.role}</h2>
                        <p className="text-xs text-surface-500 truncate">
                            {config.domain} · {config.specialization} · {config.difficulty}
                        </p>
                    </div>

                    {isSpeaking && (
                        <span className="status-badge status-badge-speaking ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            AI Speaking
                        </span>
                    )}
                    {!isSpeaking && isRecording && (
                        <span className="status-badge status-badge-recording ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Recording
                        </span>
                    )}
                    {!isSpeaking && !isRecording && isProcessingAnswer && (
                        <span className="status-badge status-badge-evaluating ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Evaluating
                        </span>
                    )}
                    {!isSpeaking && !isRecording && !isProcessingAnswer && (
                        <span className="status-badge status-badge-ready ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready
                        </span>
                    )}
                </div>

                <button
                    onClick={handleEnd}
                    disabled={isEnding || isProcessingAnswer}
                    className="btn-danger text-sm py-2 px-4 flex items-center space-x-2 relative z-10"
                >
                    {isEnding ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{t("interview.ending")}</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            <span>{t("interview.end")}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <InterviewChat transcript={transcript} isLoading={isProcessingAnswer} />
                </div>

                {cameraActive && (
                    <div className="hidden md:flex flex-col items-center px-4 py-6 border-l border-surface-200/60 bg-white/50">
                        <CameraPreview
                            isActive={cameraActive}
                            liveMetrics={liveMetrics}
                            onVideoReady={handleCameraReady}
                            isRecording={isRecording}
                            isModelReady={isGestureReady}
                        />
                    </div>
                )}
            </div>

            {/* Voice input */}
            <div className="p-4">
                <VoiceAnswerInput
                    key={questionCount}
                    onSubmit={handleAnswer}
                    disabled={voiceDisabled}
                    onRecordingChange={handleRecordingChange}
                    stopRequested={stopMicRequested}
                />
            </div>
        </div>
    );
};

export default Interview;
