import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { interviewAPI } from "../services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Award, CheckCircle, TrendingUp, AlertTriangle,
    MessageSquare, Sparkles, Target, Brain, Users, Eye, Shield,
    ChevronDown, ChevronUp, Star, Video, Download, Play, FileText
} from "lucide-react";
import ScoreChart from "../components/ScoreChart";
import { loadRecording } from "../utils/videoStorage";

/* ── helper: extract a score from either flat number or {score} object ── */
const getScore = (val) => {
    if (typeof val === "number") return val;
    if (val && typeof val === "object" && typeof val.score === "number") return val.score;
    return 0;
};

/* ── Animated circular score ── */
const AnimatedScore = ({ score, size = 160, strokeWidth = 10, label }) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (animatedScore / 100) * circumference;

    useEffect(() => {
        let start = 0;
        const step = Math.max(1, Math.floor(score / 50));
        const id = setInterval(() => {
            start += step;
            if (start >= score) { setAnimatedScore(score); clearInterval(id); }
            else setAnimatedScore(start);
        }, 25);
        return () => clearInterval(id);
    }, [score]);

    const getColor = (s) => s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : s >= 40 ? "#fb923c" : "#ef4444";
    const color = getColor(score);

    return (
        <div className="relative inline-flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center">
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
                    <circle cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke={color} strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 1.5s ease-out", filter: `drop-shadow(0 0 8px ${color}40)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-bold text-surface-900 tabular-nums" style={{ fontSize: size > 100 ? "2.5rem" : "1.25rem" }}>
                        {animatedScore}
                    </span>
                    <span className="text-surface-400 text-[10px] mt-0.5">/ 100</span>
                </div>
            </div>
            {label && <span className="text-xs text-surface-500 mt-2 text-center">{label}</span>}
        </div>
    );
};

/* ── Score card for individual metrics ── */
const ScoreCard = ({ label, score, icon: Icon, color, delay = 0, index }) => {
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        let start = 0;
        const step = Math.max(1, Math.floor(score / 40));
        const timer = setTimeout(() => {
            const id = setInterval(() => {
                start += step;
                if (start >= score) { setAnimatedScore(score); clearInterval(id); }
                else setAnimatedScore(start);
            }, 20);
        }, delay * 1000);
        return () => clearTimeout(timer);
    }, [score, delay]);

    const getGrade = (s) => s >= 90 ? "Excellent" : s >= 70 ? "Strong" : s >= 50 ? "Average" : s >= 30 ? "Weak" : "Poor";
    const getGradeColor = (s) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : s >= 40 ? "text-orange-600" : "text-red-500";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative group"
        >
            <div className="relative p-5 rounded-xl border border-surface-200/80 overflow-hidden transition-all duration-300 hover:border-primary-200 hover:translate-y-[-2px]"
                style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}>

                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />

                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                            <Icon className="w-4.5 h-4.5" style={{ color }} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-surface-800">{label}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${getGradeColor(score)}`}>
                                {getGrade(score)}
                            </span>
                        </div>
                    </div>
                    <span className="text-2xl font-bold tabular-nums text-surface-900">{animatedScore}</span>
                </div>

                <div className="w-full h-2 bg-surface-200/60 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                            background: `linear-gradient(90deg, ${color}88, ${color})`,
                            boxShadow: `0 0 10px ${color}30`,
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

/* ── Performance label for overall score ── */
const getPerformanceLabel = (score) => {
    if (score >= 90) return { text: "Outstanding", emoji: "🏆", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
    if (score >= 75) return { text: "Strong Performance", emoji: "⭐", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
    if (score >= 60) return { text: "Good Progress", emoji: "👍", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
    if (score >= 40) return { text: "Needs Improvement", emoji: "📈", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
    return { text: "Requires Practice", emoji: "💪", color: "text-red-500", bg: "bg-red-50 border-red-200" };
};

const Report = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTranscript, setShowTranscript] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);
    const [showVideo, setShowVideo] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await interviewAPI.getSession(id);
                setSession(response.data.session);
            } catch {
                toast.error("Failed to load interview report");
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        loadRecording(id).then((blob) => {
            if (blob) { const url = URL.createObjectURL(blob); setVideoUrl(url); }
        });
        return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-surface-500 text-sm animate-pulse">Generating your report…</p>
                </div>
            </div>
        );
    }

    if (!session || !session.feedback) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle className="w-10 h-10 text-surface-400" />
                </div>
                <h2 className="text-2xl font-bold text-surface-900 mb-3 font-heading">Report Not Available</h2>
                <p className="text-surface-500 mb-6">This interview has not been completed or the report is missing.</p>
                <Link to="/dashboard" className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25">
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t("report.backToDashboard")}</span>
                </Link>
            </div>
        );
    }

    const { feedback } = session;
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

    const isResumeMode = session.interviewMode === "resume";

    const scores = {
        technical: getScore(feedback.technicalSkills),
        communication: getScore(feedback.communication ?? feedback.communicationSkills),
        problemSolving: getScore(feedback.problemSolving),
        domainKnowledge: getScore(feedback.domainKnowledge),
        confidence: getScore(feedback.confidenceScore),
        professionalPresence: getScore(feedback.professionalPresence),
        ...(isResumeMode && feedback.resumeUnderstanding != null && {
            resumeUnderstanding: getScore(feedback.resumeUnderstanding),
        }),
    };

    const scoreValues = Object.values(scores).filter(v => v > 0);
    const overallScore = feedback.overallScore || (scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : 0);

    const perfLabel = getPerformanceLabel(overallScore);

    const scoreCards = [
        { label: "Technical Skills", score: scores.technical, icon: Brain, color: "#FF6B00" },
        { label: "Communication", score: scores.communication, icon: MessageSquare, color: "#FB923C" },
        { label: "Problem Solving", score: scores.problemSolving, icon: Sparkles, color: "#f59e0b" },
        { label: "Domain Knowledge", score: scores.domainKnowledge, icon: Target, color: "#06b6d4" },
        { label: "Confidence", score: scores.confidence, icon: Shield, color: "#10b981" },
        { label: "Professional Presence", score: scores.professionalPresence, icon: Eye, color: "#8b5cf6" },
        ...(isResumeMode && scores.resumeUnderstanding != null
            ? [{ label: "Resume Understanding", score: scores.resumeUnderstanding, icon: FileText, color: "#ec4899" }]
            : []),
    ];

    const improvements = feedback.improvements || feedback.areasForImprovement || [];

    return (
        <motion.div
            variants={containerVariants} initial="hidden" animate="visible"
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
        >
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary-100/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-100/15 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-2 font-heading">
                        <Star className="w-7 h-7 text-amber-500" />
                        {t("report.title")}
                    </h1>
                    <p className="text-surface-500 mt-1 text-sm flex items-center gap-2">
                        {session.role} · {session.domain} · {session.specialization}
                        {isResumeMode && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[10px] font-bold uppercase tracking-wider text-pink-600">
                                <FileText className="w-3 h-3" /> Resume-Based
                            </span>
                        )}
                    </p>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link to="/dashboard" className="px-4 py-2.5 bg-white hover:bg-surface-100 border border-surface-300 text-surface-600 text-sm font-medium rounded-xl transition-all flex items-center space-x-2 shadow-sm">
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t("report.backToDashboard")}</span>
                    </Link>
                </motion.div>
            </motion.div>

            {/* ── Hero Score Section ── */}
            <motion.div variants={itemVariants}
                className="relative p-8 rounded-2xl border border-primary-100/60 overflow-hidden mb-8"
                style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.04), rgba(16,185,129,0.03), rgba(255,237,213,0.2))", boxShadow: "0 8px 40px rgba(255, 107, 0, 0.06)" }}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="flex-shrink-0"
                    >
                        <AnimatedScore score={overallScore} size={180} strokeWidth={12} />
                    </motion.div>

                    <div className="flex-1 text-center md:text-left">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                            <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border ${perfLabel.bg}`}>
                                <span>{perfLabel.emoji}</span>
                                <span className={perfLabel.color}>{perfLabel.text}</span>
                            </span>
                        </motion.div>

                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                            className="text-surface-500 text-sm mt-4 max-w-md leading-relaxed"
                        >
                            Your performance across {scoreCards.filter(c => c.score > 0).length} evaluated categories.
                            {overallScore >= 70 ? " Great job — keep building on your strengths!" : " Focus on the improvement areas below to level up."}
                        </motion.p>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                            className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start"
                        >
                            {scoreCards.filter(c => c.score > 0).map((card) => (
                                <span key={card.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-surface-200 bg-white shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
                                    <span className="text-surface-500">{card.label.split(" ")[0]}</span>
                                    <span className="text-surface-900 font-bold tabular-nums">{card.score}</span>
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* ── Score Cards Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {scoreCards.filter(c => c.score > 0).map((card, i) => (
                    <ScoreCard key={card.label} {...card} index={i} delay={0.3} />
                ))}
            </div>

            {/* ── Radar Chart + Mini Scores ── */}
            <motion.div variants={itemVariants} className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="relative p-6 rounded-xl border border-surface-200/80 overflow-hidden"
                        style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}>
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                        <ScoreChart feedback={feedback} />
                    </div>

                    <div className="relative p-6 rounded-xl border border-surface-200/80 overflow-hidden flex items-center justify-center"
                        style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}>
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                        <div className="grid grid-cols-3 gap-6">
                            {scoreCards.filter(c => c.score > 0).map((card) => (
                                <AnimatedScore key={card.label} score={card.score} size={80} strokeWidth={6} label={card.label.split(" ")[0]} />
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Strengths & Improvements ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <motion.div variants={itemVariants}
                    className="relative p-6 rounded-xl border border-emerald-200/60 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(255,255,255,0.9))", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.03)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
                    <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold text-emerald-700 font-heading">{t("report.strengths")}</h3>
                    </div>
                    <ul className="space-y-2.5">
                        {(feedback.strengths || []).map((s, i) => (
                            <motion.li key={i}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                                className="flex items-start space-x-2.5 text-surface-600 text-sm"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                <span>{s}</span>
                            </motion.li>
                        ))}
                        {(!feedback.strengths || feedback.strengths.length === 0) && (
                            <p className="text-surface-400 text-sm italic">No strengths identified</p>
                        )}
                    </ul>
                </motion.div>

                <motion.div variants={itemVariants}
                    className="relative p-6 rounded-xl border border-amber-200/60 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(255,255,255,0.9))", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.03)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                    <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-amber-700 font-heading">{t("report.improvements")}</h3>
                    </div>
                    <ul className="space-y-2.5">
                        {improvements.map((a, i) => (
                            <motion.li key={i}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                                className="flex items-start space-x-2.5 text-surface-600 text-sm"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                <span>{a}</span>
                            </motion.li>
                        ))}
                        {improvements.length === 0 && (
                            <p className="text-surface-400 text-sm italic">No improvements identified</p>
                        )}
                    </ul>
                </motion.div>
            </div>

            {/* ── Detailed Feedback ── */}
            {feedback.detailedFeedback && (
                <motion.div variants={itemVariants}
                    className="relative p-6 rounded-xl border border-surface-200/80 mb-8 overflow-hidden"
                    style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
                    <div className="flex items-center space-x-2 mb-4">
                        <Award className="w-5 h-5 text-primary-500" />
                        <h3 className="text-lg font-semibold text-surface-900 font-heading">{t("report.feedback")}</h3>
                    </div>
                    <p className="text-surface-600 text-sm leading-relaxed whitespace-pre-wrap">{feedback.detailedFeedback}</p>
                </motion.div>
            )}

            {/* ── Video Recording Playback ── */}
            {videoUrl && (
                <motion.div variants={itemVariants}
                    className="relative rounded-xl border border-primary-100/60 overflow-hidden mb-8"
                    style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.03), rgba(255,255,255,0.9))", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent" />
                    <button
                        onClick={() => setShowVideo(!showVideo)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-primary-50/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-primary-500" />
                            <h3 className="text-lg font-semibold text-surface-900 font-heading">Your Interview Recording</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                                Available
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={videoUrl}
                                download={`interview-${id}.webm`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 bg-white hover:bg-surface-100 border border-surface-300 rounded-lg transition-colors shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download
                            </a>
                            {showVideo ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                        </div>
                    </button>

                    <AnimatePresence>
                        {showVideo && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="px-5 pb-5 border-t border-surface-200/50 pt-4">
                                    <video
                                        src={videoUrl}
                                        controls
                                        className="w-full max-h-[400px] rounded-lg bg-surface-100 border border-surface-200"
                                        style={{ aspectRatio: "16/9", objectFit: "contain" }}
                                    >
                                        Your browser does not support video playback.
                                    </video>
                                    <p className="text-[11px] text-surface-400 mt-2 text-center">
                                        This recording is stored locally in your browser and will be available until you clear your browser data.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ── Collapsible Transcript ── */}
            {session.transcript && session.transcript.length > 0 && (
                <motion.div variants={itemVariants}
                    className="relative rounded-xl border border-surface-200/80 overflow-hidden"
                    style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-surface-100/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-surface-500" />
                            <h3 className="text-lg font-semibold text-surface-900 font-heading">Interview Transcript</h3>
                            <span className="text-xs text-surface-500 bg-surface-100 px-2 py-0.5 rounded-full">
                                {session.transcript.length} messages
                            </span>
                        </div>
                        {showTranscript ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                    </button>

                    <AnimatePresence>
                        {showTranscript && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="px-5 pb-5 space-y-3 max-h-[500px] overflow-y-auto border-t border-surface-200/50 pt-4">
                                    {session.transcript.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] p-3.5 rounded-xl text-sm ${msg.role === "assistant"
                                                ? "bg-primary-50/60 border border-primary-100 text-surface-700 rounded-bl-sm"
                                                : "bg-emerald-50/60 border border-emerald-100 text-surface-700 rounded-br-sm"
                                                }`}>
                                                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 opacity-60">
                                                    {msg.role === "assistant" ? "Interviewer" : "You"}
                                                </span>
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Report;
