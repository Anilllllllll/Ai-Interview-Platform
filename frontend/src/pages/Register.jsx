import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, Eye, EyeOff, User, ArrowRight, Briefcase } from "lucide-react";

const DOMAINS = [
    "Technology", "Data Science", "Finance", "Healthcare",
    "Marketing", "Product Management", "Cybersecurity", "Consulting", "Other",
];
const SPECIALIZATIONS = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer",
    "Data Scientist", "ML Engineer", "Product Manager",
    "DevOps Engineer", "Mobile Developer", "QA Engineer", "Other",
];
const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Principal"];

const Register = () => {
    const [formData, setFormData] = useState({
        name: "", email: "", password: "", confirmPassword: "",
        domain: "Technology", specialization: "Full Stack Developer", experienceLevel: "Mid",
    });
    const [showPassword, setShowPassword] = useState(false);
    const { register, isAuthenticated, loading, error, clearError } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => { if (isAuthenticated) navigate("/dashboard"); }, [isAuthenticated, navigate]);
    useEffect(() => { if (error) { toast.error(error); clearError(); } }, [error, clearError]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
        if (formData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        const { confirmPassword, ...submitData } = formData;
        submitData.password = formData.password;
        const result = await register(submitData);
        if (result.success) { toast.success("Account created!"); navigate("/dashboard"); }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-primary-200/5 rounded-full blur-[140px] animate-float" />
                <div className="absolute bottom-1/3 -left-32 w-[500px] h-[500px] bg-primary-100/5 rounded-full blur-[140px] animate-float-delayed" />
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-lg relative z-10">
                <div className="relative p-6 sm:p-8 rounded-2xl border border-primary-100/60 overflow-hidden shadow-2xl"
                    style={{ background: "rgba(255, 255, 255, 0.94)", backdropFilter: "blur(24px) saturate(150%)" }}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

                    <motion.div variants={itemVariants} className="text-center mb-8">
                        <motion.div whileHover={{ scale: 1.05, rotate: -5 }}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-500/30">
                            <UserPlus className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-surface-900 font-heading">{t("auth.registerTitle")}</h1>
                        <p className="text-surface-500 mt-2 text-sm">{t("auth.registerSubtitle")}</p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("auth.name")}</label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                <input name="name" type="text" value={formData.name} onChange={handleChange} className="input-field pl-11" placeholder="John Doe" required />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("auth.email")}</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                <input name="email" type="email" value={formData.email} onChange={handleChange} className="input-field pl-11" placeholder="you@example.com" required />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("auth.password")}</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} className="input-field pl-11 pr-11" placeholder="••••••••" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input-field pl-11" placeholder="••••••••" required />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("profile.domain")}</label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                                    <select name="domain" value={formData.domain} onChange={handleChange} className="select-field pl-11">
                                        {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("profile.specialization")}</label>
                                <select name="specialization" value={formData.specialization} onChange={handleChange} className="select-field">
                                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5">{t("profile.experienceLevel")}</label>
                            <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="select-field">
                                {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><span>{t("auth.registerBtn")}</span><ArrowRight className="w-4 h-4" /></>
                                )}
                            </motion.button>
                        </motion.div>
                    </form>

                    <motion.p variants={itemVariants} className="text-center text-sm text-surface-500 mt-6">
                        {t("auth.hasAccount")}{" "}
                        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold transition-colors">{t("auth.signIn")}</Link>
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
