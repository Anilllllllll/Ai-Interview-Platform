import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, useInView, useAnimation } from "framer-motion";
import {
    Sparkles, Brain, Mic, FileText, BarChart3, Globe, MessageSquare,
    ArrowRight, Upload, Play, Award, Star, CheckCircle2,
    Zap, Shield, Clock, Users, ChevronRight, Github, Twitter, Linkedin,
    TrendingUp, Target, BookOpen
} from "lucide-react";

/* ───────────────── Scroll-triggered section wrapper ───────────────── */
const AnimatedSection = ({ children, className = "", delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

/* ───────────────── Animated counter ───────────────────────────────── */
const CountUp = ({ end, suffix = "", duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [isInView, end, duration]);

    return <span ref={ref} className="counter-text">{count.toLocaleString()}{suffix}</span>;
};

/* ───────────────── Floating particle ──────────────────────────────── */
const FloatingParticle = ({ size, color, top, left, delay: d }) => (
    <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: size, height: size, background: color, top, left, filter: "blur(1px)" }}
        animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, delay: d, ease: "easeInOut" }}
    />
);

/* ═══════════════════════════════════════════════════════════════════ */
/*                           HOME COMPONENT                          */
/* ═══════════════════════════════════════════════════════════════════ */
const Home = () => {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && isAuthenticated) navigate("/dashboard", { replace: true });
    }, [isAuthenticated, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const features = [
        { icon: Brain, title: "AI-Powered Questions", desc: "Smart questions tailored to your domain, experience level, and resume content.", color: "from-violet-500 to-purple-600" },
        { icon: Mic, title: "Voice Analysis", desc: "Real-time voice recognition with confidence and communication scoring.", color: "from-pink-500 to-rose-600" },
        { icon: FileText, title: "Resume-Based Mode", desc: "Upload your resume and get questions specifically about your projects and skills.", color: "from-blue-500 to-indigo-600" },
        { icon: MessageSquare, title: "Instant AI Feedback", desc: "Detailed evaluation across 6 categories with actionable improvement tips.", color: "from-emerald-500 to-teal-600" },
        { icon: BarChart3, title: "Score & Reports", desc: "Beautiful visual reports with radar charts, breakdowns, and progress tracking.", color: "from-amber-500 to-orange-600" },
        { icon: Globe, title: "Multi-Language", desc: "Practice interviews in English or Hindi with seamless language switching.", color: "from-cyan-500 to-sky-600" },
    ];

    const steps = [
        { icon: Upload, num: "01", title: "Upload Resume", desc: "Optionally upload your resume for personalized questions, or pick a domain.", color: "from-primary-500 to-primary-400" },
        { icon: Play, num: "02", title: "Practice Interview", desc: "Answer AI-generated questions via voice or text with real-time camera analysis.", color: "from-accent-emerald to-teal-500" },
        { icon: Award, num: "03", title: "Get Detailed Feedback", desc: "Receive comprehensive scoring, insights, and actionable tips to improve.", color: "from-accent-violet to-purple-500" },
    ];

    const testimonials = [
        { name: "Priya Sharma", role: "Software Engineer at Google", quote: "InterviewAI helped me prepare for my FAANG interviews. The AI feedback was incredibly detailed and the resume-based questions were spot on!", rating: 5, initials: "PS" },
        { name: "Rahul Verma", role: "Data Scientist at Microsoft", quote: "The voice analysis feature is a game-changer. It helped me improve my communication skills and build confidence before my actual interviews.", rating: 5, initials: "RV" },
        { name: "Ananya Patel", role: "Full Stack Developer", quote: "I love how it generates questions from my resume. The detailed reports with radar charts helped me identify my weak areas and improve.", rating: 5, initials: "AP" },
    ];

    const stats = [
        { value: 10000, suffix: "+", label: "Interviews Completed", icon: TrendingUp },
        { value: 95, suffix: "%", label: "User Satisfaction", icon: Target },
        { value: 50, suffix: "+", label: "Domains Covered", icon: BookOpen },
        { value: 24, suffix: "/7", label: "AI Availability", icon: Clock },
    ];

    return (
        <div className="overflow-hidden">

            {/* ═══════════════ HERO SECTION ═══════════════ */}
            <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] bg-primary-200/25 rounded-full blur-[120px] animate-float" />
                    <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[100px] animate-float-delayed" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-50/40 rounded-full blur-[90px]" />
                    <FloatingParticle size={8} color="rgba(255,107,0,0.3)" top="20%" left="10%" delay={0} />
                    <FloatingParticle size={6} color="rgba(251,146,60,0.4)" top="30%" left="85%" delay={1} />
                    <FloatingParticle size={10} color="rgba(255,107,0,0.2)" top="60%" left="15%" delay={2} />
                    <FloatingParticle size={7} color="rgba(234,88,12,0.25)" top="70%" left="80%" delay={0.5} />
                    <FloatingParticle size={5} color="rgba(255,133,52,0.35)" top="45%" left="50%" delay={1.5} />
                    <FloatingParticle size={9} color="rgba(255,107,0,0.15)" top="15%" left="65%" delay={3} />
                </div>

                <div className="max-w-7xl mx-auto w-full relative z-10 py-16 lg:py-24">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left — Text */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200/60 mb-8"
                            >
                                <Sparkles className="w-4 h-4 text-primary-500" />
                                <span className="text-sm font-medium text-primary-600">AI-Powered Interview Platform</span>
                            </motion.div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading leading-[1.1] mb-6">
                                <span className="text-surface-900">Ace Your Next</span>
                                <br />
                                <span className="hero-gradient-text">Interview</span>
                                <br />
                                <span className="text-surface-900">With AI</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-surface-500 max-w-xl mb-10 leading-relaxed">
                                Practice with intelligent AI that adapts to your resume, analyzes your voice,
                                and gives detailed feedback to help you land your dream job.
                            </p>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        to="/register"
                                        id="hero-cta-primary"
                                        className="relative inline-flex items-center space-x-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-400 rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 overflow-hidden group"
                                    >
                                        <span className="relative z-10">Get Started Free</span>
                                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        to="/login"
                                        id="hero-cta-secondary"
                                        className="inline-flex items-center space-x-2 px-8 py-4 text-base font-semibold text-surface-700 bg-white hover:bg-surface-100 border border-surface-300 hover:border-primary-300 rounded-2xl transition-all duration-300 shadow-sm"
                                    >
                                        <Play className="w-5 h-5 text-primary-500" />
                                        <span>Sign In</span>
                                    </Link>
                                </motion.div>
                            </div>

                            {/* Social proof mini */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="flex items-center space-x-4 mt-10"
                            >
                                <div className="flex -space-x-2">
                                    {["PS", "RV", "AP", "SK"].map((init, i) => (
                                        <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md">
                                            {init}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-sm text-surface-500">
                                    <span className="font-semibold text-surface-700">10,000+</span> interviews practiced
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Right — Floating UI mockup card */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotateY: -10 }}
                            animate={{ opacity: 1, x: 0, rotateY: 0 }}
                            transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="relative hidden lg:block"
                        >
                            {/* Main mockup card */}
                            <div className="relative z-10 p-6 rounded-3xl border border-primary-100/60 overflow-hidden"
                                style={{
                                    background: "rgba(255,255,255,0.92)",
                                    backdropFilter: "blur(24px)",
                                    boxShadow: "0 24px 80px rgba(255,107,0,0.12), 0 0 0 1px rgba(255,107,0,0.05)"
                                }}
                            >
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

                                {/* Mock interview UI */}
                                <div className="flex items-center space-x-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-surface-900">AI Interviewer</p>
                                        <p className="text-xs text-surface-400">Frontend Development</p>
                                    </div>
                                    <div className="ml-auto flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs font-medium text-emerald-600">Live</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-50/80 to-primary-100/40 border border-primary-100/60">
                                        <p className="text-sm text-surface-700 leading-relaxed">
                                            "Can you explain the difference between <span className="font-semibold text-primary-600">useEffect</span> and <span className="font-semibold text-primary-600">useLayoutEffect</span> in React? When would you use one over the other?"
                                        </p>
                                    </div>
                                </div>

                                {/* Score preview bars */}
                                <div className="space-y-3">
                                    {[
                                        { label: "Technical Skills", score: 92, color: "bg-primary-500" },
                                        { label: "Communication", score: 88, color: "bg-emerald-500" },
                                        { label: "Problem Solving", score: 85, color: "bg-violet-500" },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-surface-600 font-medium">{item.label}</span>
                                                <span className="text-surface-900 font-bold">{item.score}%</span>
                                            </div>
                                            <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.score}%` }}
                                                    transition={{ duration: 1.5, delay: 0.8 + i * 0.2, ease: "easeOut" }}
                                                    className={`h-full ${item.color} rounded-full`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Floating accent cards */}
                            <motion.div
                                animate={{ y: [0, -12, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-6 -right-6 p-4 rounded-2xl bg-white border border-primary-100/60 shadow-xl shadow-primary-500/10 z-20"
                            >
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-surface-900">Score: 92/100</p>
                                        <p className="text-[10px] text-surface-400">Excellent!</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-4 -left-6 p-4 rounded-2xl bg-white border border-primary-100/60 shadow-xl shadow-primary-500/10 z-20"
                            >
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-surface-900">AI Analysis</p>
                                        <p className="text-[10px] text-surface-400">Real-time feedback</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ STATS SECTION ═══════════════ */}
            <section className="relative py-16 sm:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="relative text-center p-6 sm:p-8 rounded-2xl border border-primary-100/50 group hover:border-primary-200 transition-all duration-300"
                                    style={{
                                        background: "rgba(255,255,255,0.7)",
                                        backdropFilter: "blur(12px)",
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-400/10 flex items-center justify-center mx-auto mb-4 group-hover:from-primary-500/20 group-hover:to-primary-400/20 transition-all">
                                        <stat.icon className="w-6 h-6 text-primary-500" />
                                    </div>
                                    <div className="text-3xl sm:text-4xl font-bold text-surface-900 mb-1">
                                        <CountUp end={stat.value} suffix={stat.suffix} />
                                    </div>
                                    <p className="text-sm text-surface-500 font-medium">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ═══════════════ FEATURES SECTION ═══════════════ */}
            <section className="relative py-20 sm:py-28" id="features">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-16">
                        <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200/60 mb-6">
                            <Zap className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-medium text-primary-600">Powerful Features</span>
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-surface-900 mb-5">
                            Everything You Need to{" "}
                            <span className="bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">Succeed</span>
                        </h2>
                        <p className="text-lg text-surface-500 max-w-2xl mx-auto">
                            Our AI-powered platform provides comprehensive tools to prepare, practice, and perfect your interview skills.
                        </p>
                    </AnimatedSection>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                whileHover={{ y: -6 }}
                                className="relative p-6 sm:p-8 rounded-2xl border border-primary-100/40 group cursor-default transition-all duration-300 hover:border-primary-200/60"
                                style={{
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
                                }}
                            >
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>

                                <h3 className="text-xl font-bold text-surface-900 mb-3 font-heading">{feature.title}</h3>
                                <p className="text-surface-500 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-primary-50/30 to-transparent" id="how-it-works">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-16">
                        <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200/60 mb-6">
                            <Target className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-medium text-primary-600">Simple Process</span>
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-surface-900 mb-5">
                            How{" "}
                            <span className="bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">InterviewAI</span>
                            {" "}Works
                        </h2>
                        <p className="text-lg text-surface-500 max-w-2xl mx-auto">
                            Get started in three simple steps. No complex setup required.
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
                        {/* Connecting line — desktop only */}
                        <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200" />

                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2, duration: 0.6 }}
                                className="relative text-center"
                            >
                                <div className="relative z-10 mx-auto mb-6">
                                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto shadow-xl transition-transform duration-300 hover:scale-110`}>
                                        <step.icon className="w-9 h-9 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-primary-200 flex items-center justify-center shadow-md">
                                        <span className="text-xs font-bold text-primary-600">{step.num}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-surface-900 mb-3 font-heading">{step.title}</h3>
                                <p className="text-surface-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ TESTIMONIALS ═══════════════ */}
            <section className="relative py-20 sm:py-28" id="testimonials">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-16">
                        <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200/60 mb-6">
                            <Users className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-medium text-primary-600">Testimonials</span>
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-surface-900 mb-5">
                            Loved by{" "}
                            <span className="bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">Thousands</span>
                        </h2>
                        <p className="text-lg text-surface-500 max-w-2xl mx-auto">
                            See why professionals and students trust InterviewAI for their interview preparation.
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {testimonials.map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15, duration: 0.5 }}
                                whileHover={{ y: -4 }}
                                className="relative p-6 sm:p-8 rounded-2xl border border-primary-100/40 transition-all duration-300 hover:border-primary-200/60"
                                style={{
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
                                }}
                            >
                                {/* Stars */}
                                <div className="flex items-center space-x-1 mb-4">
                                    {Array.from({ length: t.rating }).map((_, s) => (
                                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>

                                <p className="text-surface-600 leading-relaxed mb-6 italic">"{t.quote}"</p>

                                <div className="flex items-center space-x-3">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                        {t.initials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-surface-900">{t.name}</p>
                                        <p className="text-xs text-surface-400">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA BANNER ═══════════════ */}
            <section className="relative py-20 sm:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center"
                            style={{
                                background: "linear-gradient(135deg, #FF6B00, #FB923C, #FF8534)",
                                boxShadow: "0 24px 80px rgba(255,107,0,0.25)",
                            }}
                        >
                            {/* Decorative elements */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                                <FloatingParticle size={6} color="rgba(255,255,255,0.3)" top="20%" left="10%" delay={0} />
                                <FloatingParticle size={8} color="rgba(255,255,255,0.2)" top="60%" left="80%" delay={1} />
                                <FloatingParticle size={5} color="rgba(255,255,255,0.25)" top="40%" left="50%" delay={2} />
                            </div>

                            <div className="relative z-10">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-white mb-5">
                                        Ready to Ace Your Next Interview?
                                    </h2>
                                    <p className="text-lg text-white/85 max-w-2xl mx-auto mb-10">
                                        Join thousands of professionals who have transformed their interview skills with AI-powered practice and feedback.
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Link
                                                to="/register"
                                                id="cta-banner-signup"
                                                className="inline-flex items-center space-x-2 px-8 py-4 text-base font-bold text-primary-600 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                                            >
                                                <span>Start Practicing for Free</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Link
                                                to="/login"
                                                className="inline-flex items-center space-x-2 px-8 py-4 text-base font-semibold text-white border-2 border-white/30 hover:border-white/60 rounded-2xl transition-all duration-300"
                                            >
                                                <span>Sign In</span>
                                                <ChevronRight className="w-5 h-5" />
                                            </Link>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <footer className="relative border-t border-primary-100/50 py-16 sm:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
                        {/* Brand */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <Link to="/" className="flex items-center space-x-3 mb-4 group">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img 
                                        src="/logo.png" 
                                        alt="InterviewAI Logo" 
                                        className="w-10 h-10 object-contain mix-blend-multiply dark:invert dark:mix-blend-screen" 
                                        onError={(e) => {
                                            e.target.onerror = null; 
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    {/* Fallback if logo.png is not yet uploaded */}
                                    <div className="hidden w-full h-full rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 items-center justify-center shadow-lg shadow-primary-500/25">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <span className="text-xl font-bold font-heading bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                                    InterviewAI
                                </span>
                            </Link>
                            <p className="text-sm text-surface-500 leading-relaxed max-w-xs">
                                AI-powered interview preparation platform that helps you practice, improve, and land your dream job.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Platform</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: "Features", href: "#features" },
                                    { label: "How It Works", href: "#how-it-works" },
                                    { label: "Testimonials", href: "#testimonials" },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <a href={link.href} className="text-sm text-surface-500 hover:text-primary-500 transition-colors">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Account */}
                        <div>
                            <h4 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Account</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: "Sign In", to: "/login" },
                                    { label: "Create Account", to: "/register" },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <Link to={link.to} className="text-sm text-surface-500 hover:text-primary-500 transition-colors">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Resources */}
                        <div>
                            <h4 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Connect</h4>
                            <div className="flex items-center space-x-3">
                                {[
                                    { icon: Github, href: "https://github.com/Anilllllllll" },
                                    { icon: Twitter, href: "#" },
                                    { icon: Linkedin, href: "https://www.linkedin.com/in/anil-kumar110/" },
                                ].map((social, i) => (
                                    <a
                                        key={i}
                                        href={social.href}
                                        className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-primary-50 border border-surface-200 hover:border-primary-200 flex items-center justify-center text-surface-500 hover:text-primary-500 transition-all duration-300"
                                    >
                                        <social.icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="pt-8 border-t border-surface-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-surface-400">
                            &copy; {new Date().getFullYear()} InterviewAI. All rights reserved.
                        </p>
                        <div className="flex items-center space-x-6">
                            <a href="#" className="text-xs text-surface-400 hover:text-primary-500 transition-colors">Privacy Policy</a>
                            <a href="#" className="text-xs text-surface-400 hover:text-primary-500 transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
