import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { login, isAuthenticated, loading, error, clearError } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate("/dashboard");
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (error) { toast.error(error); clearError(); }
    }, [error, clearError]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { toast.error("Please fill in all fields"); return; }
        const result = await login(email, password);
        if (result.success) { toast.success("Welcome back!"); navigate("/dashboard"); }
    };

    const handleGoogleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        window.location.href = `${apiUrl}/api/auth/google`;
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-200/5 rounded-full blur-[140px] animate-float" />
                <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-primary-100/5 rounded-full blur-[140px] animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-50/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-md relative z-10"
            >
                    <div className="relative p-6 sm:p-8 rounded-2xl border border-primary-100/60 overflow-hidden shadow-2xl"
                        style={{
                            background: "rgba(255, 255, 255, 0.94)",
                            backdropFilter: "blur(24px) saturate(150%)",
                        }}
                    >
                    {/* Top gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

                    {/* Logo */}
                    <motion.div variants={itemVariants} className="text-center mb-8">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-500/30"
                        >
                            <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-surface-900 font-heading">{t("auth.loginTitle")}</h1>
                        <p className="text-surface-500 mt-2 text-sm">{t("auth.loginSubtitle")}</p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("auth.email")}</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                <input id="login-email" type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-11"
                                    placeholder="you@example.com" required />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("auth.password")}</label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                <input id="login-password" type={showPassword ? "text" : "password"} value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-11 pr-11"
                                    placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors">
                                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" disabled={loading}
                                className="w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{t("auth.loginBtn")}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    </form>

                    <motion.div variants={itemVariants} className="my-6 flex items-center">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-surface-300/50" />
                        <span className="px-4 text-xs text-surface-400 uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-surface-300/50" />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGoogleLogin}
                            className="w-full py-3 px-6 bg-white hover:bg-surface-100 border border-surface-300 hover:border-surface-400 text-surface-700 font-medium rounded-xl transition-all flex items-center justify-center space-x-3 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>{t("auth.googleBtn")}</span>
                        </motion.button>
                    </motion.div>

                    <motion.p variants={itemVariants} className="text-center text-sm text-surface-500 mt-6">
                        {t("auth.noAccount")}{" "}
                        <Link to="/register" className="text-primary-500 hover:text-primary-600 font-semibold transition-colors">
                            {t("auth.signUp")}
                        </Link>
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
