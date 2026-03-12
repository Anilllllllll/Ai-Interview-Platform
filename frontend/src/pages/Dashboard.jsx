import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { interviewAPI } from "../services/api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
    Mic, TrendingUp, Trophy, ClipboardList, ChevronRight,
    Sparkles, Zap, ArrowRight, Clock, Target, FileText, BarChart2
} from "lucide-react";

/* ─── animated counter ─── */
const AnimatedNumber = ({ value, suffix = "" }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const num = parseInt(value) || 0;
        if (num === 0) { setDisplay(0); return; }
        let start = 0;
        const step = Math.max(1, Math.floor(num / 40));
        const id = setInterval(() => {
            start += step;
            if (start >= num) { setDisplay(num); clearInterval(id); }
            else setDisplay(start);
        }, 30);
        return () => clearInterval(id);
    }, [value]);
    return <>{display}{suffix}</>;
};

/* ─── Score Trend Chart (premium inline SVG) ─── */
const ScoreTrendChart = ({ sessions }) => {
    const completed = sessions
        .filter((s) => s.status === "completed" && s.overallScore)
        .slice(-10);

    if (completed.length === 0) return null;

    const W = 600, H = 200, PAD_L = 48, PAD_R = 20, PAD_T = 24, PAD_B = 48;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const scores = completed.map((s) => s.overallScore);
    const minScore = Math.max(0, Math.min(...scores) - 10);
    const maxScore = Math.min(100, Math.max(...scores) + 10);

    const xPos = (i) => PAD_L + (i / Math.max(completed.length - 1, 1)) * chartW;
    const yPos = (v) => PAD_T + (1 - (v - minScore) / (maxScore - minScore)) * chartH;

    // Build smooth polyline path
    const points = completed.map((s, i) => `${xPos(i)},${yPos(s.overallScore)}`);
    const linePath = `M ${points.join(" L ")}`;

    // Filled area under line
    const areaPath = `M ${xPos(0)},${PAD_T + chartH} L ${points.join(" L ")} L ${xPos(completed.length - 1)},${PAD_T + chartH} Z`;

    // Y-axis grid labels
    const yLabels = [0, 25, 50, 75, 100].filter((v) => v >= minScore && v <= maxScore);

    const getColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
    const latestScore = scores[scores.length - 1];

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.01" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Grid lines */}
                {yLabels.map((v) => (
                    <g key={v}>
                        <line
                            x1={PAD_L} y1={yPos(v)} x2={W - PAD_R} y2={yPos(v)}
                            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
                            strokeDasharray="4,4" className="text-slate-400"
                        />
                        <text x={PAD_L - 6} y={yPos(v) + 4} textAnchor="end"
                            className="text-slate-400 dark:text-slate-500"
                            fill="currentColor" fontSize="10" opacity="0.6"
                        >
                            {v}
                        </text>
                    </g>
                ))}

                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke="#FF6B00" strokeWidth="2.5"
                    strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />

                {/* Data points + tooltips */}
                {completed.map((s, i) => (
                    <g key={s._id}>
                        {/* X-axis label */}
                        <text
                            x={xPos(i)} y={H - 10} textAnchor="middle"
                            fontSize="9" fill="currentColor" opacity="0.5"
                            className="text-slate-400"
                        >
                            #{i + 1}
                        </text>
                        {/* Circle dot */}
                        <circle cx={xPos(i)} cy={yPos(s.overallScore)} r="5"
                            fill={getColor(s.overallScore)} stroke="white" strokeWidth="2"
                        />
                        {/* Score label above dot */}
                        <text
                            x={xPos(i)} y={yPos(s.overallScore) - 10}
                            textAnchor="middle" fontSize="9" fontWeight="700"
                            fill={getColor(s.overallScore)}
                        >
                            {s.overallScore}%
                        </text>
                    </g>
                ))}
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-2 px-1">
                {completed.map((s, i) => (
                    <div key={s._id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: getColor(s.overallScore) }} />
                        <span className="text-xs text-surface-500 dark:text-slate-400 truncate max-w-[100px]" title={s.role}>
                            #{i + 1} {s.role}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, avgScore: 0, bestScore: 0 });

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        try {
            const response = await interviewAPI.getHistory(1, 20);
            const data = response.data.sessions || [];
            setSessions(data);
            const completed = data.filter((s) => s.status === "completed" && s.overallScore);
            const avgScore = completed.length
                ? Math.round(completed.reduce((a, s) => a + s.overallScore, 0) / completed.length) : 0;
            const bestScore = completed.length ? Math.max(...completed.map((s) => s.overallScore)) : 0;
            setStats({ total: data.length, avgScore, bestScore });
        } catch {
            toast.error("Failed to load interview history");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (s) => s >= 80 ? "text-emerald-600 dark:text-emerald-400" : s >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400";

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-surface-500 dark:text-slate-400 text-sm animate-pulse">Loading your dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants} initial="hidden" animate="visible"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
        >
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-100/20 dark:bg-primary-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-primary-50/30 dark:bg-primary-500/3 rounded-full blur-[100px]" />
            </div>

            {/* ─── Hero welcome card ─── */}
            <motion.div variants={itemVariants}
                className="relative mb-8 p-8 rounded-2xl border border-primary-100/60 dark:border-primary-500/20 overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.06), rgba(255,133,52,0.04), rgba(255,237,213,0.3))", boxShadow: "0 8px 40px rgba(255, 107, 0, 0.06)" }}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-200/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary-100/20 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-primary-500/10 border border-primary-100"
                            >
                                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                            </motion.div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-slate-100 font-heading">
                                {t("dashboard.welcome")}, <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">{user?.name?.split(" ")[0]}</span>
                            </h1>
                            <p className="text-surface-500 dark:text-slate-400 mt-1 text-sm sm:text-base">Track your progress and ace your next interview</p>
                        </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link to="/interview"
                            className="relative px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold rounded-xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all flex items-center space-x-2.5 overflow-hidden group"
                        >
                            <Mic className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">{t("dashboard.startNew")}</span>
                            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            {/* ─── Stats row ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: t("dashboard.totalInterviews"), value: stats.total, suffix: "", icon: ClipboardList, gradient: "from-primary-500 to-primary-400", shadow: "shadow-primary-500/20" },
                    { label: t("dashboard.avgScore"), value: stats.avgScore, suffix: "%", icon: Target, gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
                    { label: t("dashboard.bestScore"), value: stats.bestScore, suffix: "%", icon: Trophy, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
                ].map((stat, i) => (
                    <motion.div key={i} variants={itemVariants}
                        className="relative p-6 rounded-xl border border-surface-200/80 dark:border-slate-700/60 overflow-hidden group hover:border-primary-200 dark:hover:border-primary-500/30 transition-all duration-300"
                        style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}
                    >
                        <div className="dark:absolute dark:inset-0 dark:bg-slate-900/80 dark:rounded-xl" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-surface-500 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold text-surface-900 dark:text-slate-100 mt-1.5">
                                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ─── Score Trend Chart (premium SVG) ─── */}
            {sessions.filter((s) => s.status === "completed" && s.overallScore).length > 0 && (
                <motion.div variants={itemVariants}
                    className="relative p-6 rounded-2xl border border-surface-200/80 dark:border-slate-700/60 mb-8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
                >
                    <div className="dark:absolute dark:inset-0 dark:bg-slate-900/80 dark:rounded-2xl" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
                    <div className="relative">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/15 flex items-center justify-center">
                                    <BarChart2 className="w-4 h-4 text-primary-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-surface-900 dark:text-slate-100 font-heading">Score Trend</h2>
                                    <p className="text-xs text-surface-400 dark:text-slate-500">Last {Math.min(10, sessions.filter(s => s.status === "completed" && s.overallScore).length)} interviews</p>
                                </div>
                            </div>
                            {/* Mini stat badges */}
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">≥80 Excellent</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">≥60 Good</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">&lt;60 Needs work</span>
                                </div>
                            </div>
                        </div>

                        <ScoreTrendChart sessions={sessions} />
                    </div>
                </motion.div>
            )}

            {/* ─── Recent sessions ─── */}
            <motion.div variants={itemVariants}
                className="relative rounded-2xl border border-surface-200/80 dark:border-slate-700/60 overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)" }}
            >
                <div className="dark:absolute dark:inset-0 dark:bg-slate-900/80" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                <div className="relative p-6 border-b border-surface-200/60 dark:border-slate-700/60 flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-slate-100 font-heading">{t("dashboard.recentSessions")}</h2>
                </div>

                {sessions.length === 0 ? (
                    <div className="relative p-16 text-center">
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-500/5 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center mx-auto mb-5"
                        >
                            <Mic className="w-10 h-10 text-primary-500" />
                        </motion.div>
                        <p className="text-surface-700 dark:text-slate-300 font-medium text-lg mb-1">No interviews yet</p>
                        <p className="text-surface-400 dark:text-slate-500 text-sm mb-6">{t("dashboard.noHistory")}</p>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link to="/interview" className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25">
                                <Zap className="w-4 h-4" />
                                <span>{t("dashboard.startNew")}</span>
                            </Link>
                        </motion.div>
                    </div>
                ) : (
                    <div className="relative divide-y divide-surface-200/50 dark:divide-slate-700/50">
                        {sessions.map((session, i) => (
                            <motion.div
                                key={session._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-4 sm:p-5 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 transition-all cursor-pointer flex items-center justify-between group"
                                onClick={() => session.status === "completed" ? navigate(`/report/${session._id}`) : navigate("/interview")}
                            >
                                <div className="flex items-center space-x-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.status === "active"
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                                        : "bg-surface-100 dark:bg-slate-800 border border-surface-200 dark:border-slate-700"
                                        }`}>
                                        {session.status === "active" ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        ) : (
                                            <ClipboardList className="w-4 h-4 text-surface-500 dark:text-slate-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-surface-900 dark:text-slate-200 font-medium truncate">{session.role}</p>
                                            {session.interviewMode === "resume" && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-[9px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex-shrink-0">
                                                    <FileText className="w-2.5 h-2.5" /> Resume
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-surface-400 dark:text-slate-500 text-xs mt-0.5 truncate">
                                            {session.domain} · {session.specialization} · {new Date(session.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 flex-shrink-0">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${session.status === "active"
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                        : "bg-surface-100 dark:bg-slate-800 text-surface-600 dark:text-slate-400 border border-surface-200 dark:border-slate-700"
                                        }`}>
                                        {session.status === "active" ? t("dashboard.active") : t("dashboard.completed")}
                                    </span>
                                    {session.overallScore != null && (
                                        <span className={`text-lg font-bold tabular-nums ${getScoreColor(session.overallScore)}`}>
                                            {session.overallScore}%
                                        </span>
                                    )}
                                    <ChevronRight className="w-5 h-5 text-surface-400 dark:text-slate-500 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;
