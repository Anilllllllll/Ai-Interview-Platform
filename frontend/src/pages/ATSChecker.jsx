import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { atsAPI } from "../services/api";
import {
    UploadCloud, FileText, CheckCircle, XCircle, AlertCircle,
    TrendingUp, Sparkles, Target, Zap, Award, ChevronRight,
    RefreshCw, FileSearch, BarChart3, AlertTriangle, File
} from "lucide-react";

/* ─── Circular Score Gauge ──────────────────────────────────── */
const ScoreGauge = ({ score, size = 180, strokeWidth = 14 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
    const getLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Needs Work";
    const color = getColor(score);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200 dark:text-slate-700" />
                    <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: "easeOut" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span className="text-4xl font-bold font-heading" style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>{score}</motion.span>
                    <span className="text-xs text-surface-500 dark:text-slate-400 font-medium">/ 100</span>
                </div>
            </div>
            <motion.span className="mt-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ background: color + "20", color }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>{getLabel(score)}</motion.span>
        </div>
    );
};

/* ─── Mini Score Bar ────────────────────────────────────────── */
const ScoreBar = ({ label, score, delay = 0 }) => {
    const getColor = (s) => s >= 80 ? "bg-green-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="font-medium text-surface-700 dark:text-slate-300">{label}</span>
                <span className="font-bold text-surface-900 dark:text-slate-100">{score}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div className={`h-full rounded-full ${getColor(score)}`} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, delay, ease: "easeOut" }} />
            </div>
        </div>
    );
};

/* ─── Section Check ─────────────────────────────────────────── */
const SectionCheck = ({ label, detected }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${detected ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"}`}>
        {detected ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
        {label}
    </div>
);

/* ─── Main ATS Checker Page ─────────────────────────────────── */
const ATSChecker = () => {
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFile = (f) => {
        if (!f) return;
        const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        if (!allowed.includes(f.type)) {
            setError("Please upload a PDF or DOCX file.");
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            setError("File size must be under 5MB.");
            return;
        }
        setFile(f);
        if (f.type === "application/pdf") {
            setFileUrl(URL.createObjectURL(f));
        } else {
            setFileUrl(null); // No direct preview for DOCX in browser without special library
        }
        setError(null);
        setResult(null);
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        handleFile(f);
    }, []);

    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    const analyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("resume", file);
            const res = await atsAPI.analyze(formData);
            setResult(res.data.analysis);
        } catch (err) {
            setError(err.response?.data?.message || "Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
        setResult(null);
        setError(null);
    };

    const sectionLabels = {
        hasContactInfo: "Contact Info",
        hasObjective: "Summary / Objective",
        hasExperience: "Work Experience",
        hasEducation: "Education",
        hasSkills: "Skills Section",
        hasProjects: "Projects",
        hasCertifications: "Certifications",
    };

    return (
        <div className="min-h-screen bg-[#FFF7F0] dark:bg-slate-950 py-10 px-4">
            <div className={`max-w-${result ? "7xl" : "5xl"} mx-auto transition-all duration-500`}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-500/10 rounded-full text-primary-600 dark:text-primary-400 text-sm font-semibold mb-4">
                        <FileSearch className="w-4 h-4" />
                        AI-Powered Analysis
                    </div>
                    <h1 className="text-4xl font-bold font-heading bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-3">
                        ATS Resume Checker
                    </h1>
                    <p className="text-surface-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
                        Upload your resume and instantly get an ATS compatibility score with detailed insights to land more interviews.
                    </p>
                </motion.div>

                {/* Upload Card */}
                {!result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-lg p-8 mb-6">
                        <div
                            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={() => document.getElementById("resume-upload-input").click()}
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${dragging ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 scale-[1.01]" : file ? "border-green-400 bg-green-50 dark:bg-green-500/10" : "border-surface-300 dark:border-slate-600 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-500/5"}`}
                        >
                            <input id="resume-upload-input" type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                            <AnimatePresence mode="wait">
                                {file ? (
                                    <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-2xl flex items-center justify-center">
                                            <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-surface-800 dark:text-slate-200 text-lg">{file.name}</p>
                                            <p className="text-sm text-surface-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                                        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 bg-primary-50 dark:bg-primary-500/15 rounded-2xl flex items-center justify-center">
                                            <UploadCloud className="w-8 h-8 text-primary-500" />
                                        </motion.div>
                                        <div>
                                            <p className="text-lg font-semibold text-surface-700 dark:text-slate-200">Drop your resume here</p>
                                            <p className="text-sm text-surface-400 dark:text-slate-500 mt-1">Supports <span className="font-semibold text-primary-500">PDF</span> and <span className="font-semibold text-primary-500">DOCX</span> · Max 5MB</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-6 flex justify-center">
                            <motion.button whileHover={{ scale: file && !loading ? 1.03 : 1 }} whileTap={{ scale: file && !loading ? 0.97 : 1 }} onClick={analyze} disabled={!file || loading}
                                className={`px-8 py-3.5 rounded-xl font-semibold text-white flex items-center gap-3 shadow-lg transition-all duration-300 ${file && !loading ? "bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 shadow-primary-500/30 hover:shadow-primary-500/50" : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none"}`}>
                                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing Resume...</> : <><Sparkles className="w-5 h-5" />Analyze with AI</>}
                            </motion.button>
                        </div>

                        <AnimatePresence>
                            {loading && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-8 overflow-hidden">
                                    <div className="space-y-3">
                                        {["Extracting resume text...", "Analyzing keywords & skills...", "Calculating ATS score..."].map((step, i) => (
                                            <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.8 }} className="flex items-center gap-3 text-sm text-surface-600 dark:text-slate-400">
                                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: i * 0.3 }} className="w-4 h-4 border-2 border-primary-300 border-t-primary-500 rounded-full" />{step}
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Results Layout: 2 Columns */}
                <AnimatePresence>
                    {result && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-6">
                            
                            {/* Left Col: Resume Preview */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/3 flex flex-col gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-lg p-5 flex flex-col h-full min-h-[600px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <File className="w-5 h-5 text-primary-500" />
                                            <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Resume Preview</h3>
                                        </div>
                                        <span className="text-xs text-surface-400 max-w-[150px] truncate" title={file?.name}>{file?.name}</span>
                                    </div>
                                    <div className="flex-1 bg-surface-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-surface-200 dark:border-slate-800 relative">
                                        {fileUrl ? (
                                            <iframe src={`${fileUrl}#toolbar=0`} className="absolute inset-0 w-full h-full" title="Resume Preview" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-400 dark:text-slate-500 p-6 text-center">
                                                <FileText className="w-12 h-12 mb-3 opacity-50" />
                                                <p className="text-sm font-medium">Preview not available for DOCX files.</p>
                                                <p className="text-xs mt-1">Please use a PDF for inline preview.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={reset} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-100 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 rounded-xl text-surface-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700 transition-all font-medium text-sm">
                                        <RefreshCw className="w-4 h-4" /> Analyze Another
                                    </button>
                                </div>
                            </motion.div>

                            {/* Right Col: Score + Feedback */}
                            <div className="w-full lg:w-2/3 space-y-6">
                                {/* Score Header */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-lg p-8">
                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="flex-shrink-0">
                                            <ScoreGauge score={result.overallScore} />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-2 mb-1">
                                                <BarChart3 className="w-5 h-5 text-primary-500" />
                                                <h2 className="text-xl font-bold font-heading text-surface-900 dark:text-slate-100">Detailed Section Analysis</h2>
                                            </div>
                                            {result.summary && <p className="text-surface-600 dark:text-slate-400 text-sm mb-5">{result.summary}</p>}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                                <ScoreBar label="Skills Match" score={result.skillsMatch ?? 0} delay={0.1} />
                                                <ScoreBar label="Keywords Optimization" score={result.keywordsOptimization ?? 0} delay={0.2} />
                                                <ScoreBar label="Work Experience Quality" score={result.workExperience ?? 0} delay={0.3} />
                                                <ScoreBar label="Project Descriptions" score={result.projectDescriptions ?? 0} delay={0.4} />
                                                <ScoreBar label="Formatting" score={result.formatting ?? 0} delay={0.5} />
                                                <ScoreBar label="Section Completeness" score={result.sectionCompleteness ?? 0} delay={0.6} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Strengths & Issues */}
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-md p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/15 flex items-center justify-center"><Award className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                                            <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Strengths</h3>
                                        </div>
                                        <ul className="space-y-2.5">
                                            {(result.strengths || []).map((s, i) => (
                                                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-2.5 text-sm text-surface-700 dark:text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{s}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-md p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
                                            <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Issues Found</h3>
                                        </div>
                                        <ul className="space-y-2.5">
                                            {result.issuesFound?.length > 0 ? result.issuesFound.map((s, i) => (
                                                <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-2.5 text-sm text-surface-700 dark:text-slate-300">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />{s}
                                                </motion.li>
                                            )) : <p className="text-sm text-surface-400">No major issues found.</p>}
                                        </ul>
                                    </motion.div>
                                </div>

                                {/* Suggestions */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-md p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
                                        <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Actionable Suggestions</h3>
                                    </div>
                                    <ul className="grid sm:grid-cols-2 gap-3">
                                        {(result.suggestions || []).map((s, i) => (
                                            <motion.li key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-start gap-2.5 text-sm text-surface-700 dark:text-slate-300 bg-surface-50 dark:bg-slate-800/50 p-3 rounded-xl border border-surface-100 dark:border-slate-700">
                                                <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />{s}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </motion.div>

                                {/* Sections & Top Skills */}
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-md p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/15 flex items-center justify-center"><Target className="w-4 h-4 text-primary-500" /></div>
                                            <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Resume Sections</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {result.detectedSections && Object.entries(result.detectedSections).map(([key, val]) => (
                                                <SectionCheck key={key} label={sectionLabels[key] || key} detected={val} />
                                            ))}
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-md p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center"><Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
                                            <h3 className="font-bold font-heading text-surface-900 dark:text-slate-100">Top Skills Detected</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(result.topSkillsDetected || []).length > 0 ? result.topSkillsDetected.map((skill, i) => (
                                                <motion.span key={i} className="px-3 py-1.5 text-sm font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/20 rounded-full">{skill}</motion.span>
                                            )) : <p className="text-sm text-surface-400">No specific skills detected</p>}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ATSChecker;
