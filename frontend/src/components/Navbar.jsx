import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, LayoutDashboard, Mic, User, LogOut,
    Menu, X, Globe, Sun, Moon, FileSearch,
} from "lucide-react";

const NavLink = ({ to, children, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 group ${isActive
                ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-500/10"
                : "text-surface-600 hover:text-primary-600 hover:bg-primary-50/60 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10"
                }`}
        >
            {children}
            {isActive && (
                <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </Link>
    );
};

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === "en" ? "hi" : "en");
    };

    return (
        <nav
            className="sticky top-0 z-50 border-b border-primary-100/60 dark:border-slate-700/60"
            style={{
                background: theme === "dark"
                    ? "rgba(15, 23, 42, 0.85)"
                    : "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative w-10 h-10 flex items-center justify-center"
                        >
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
                            <div className="hidden w-full h-full rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 items-center justify-center shadow-lg">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                        </motion.div>
                        <span className="text-xl font-bold font-heading bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent hidden sm:block">
                            InterviewAI
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-1">
                        {isAuthenticated ? (
                            <>
                                <NavLink to="/dashboard">
                                    <span className="flex items-center space-x-2">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>{t("nav.dashboard")}</span>
                                    </span>
                                </NavLink>
                                <NavLink to="/interview">
                                    <span className="flex items-center space-x-2">
                                        <Mic className="w-4 h-4" />
                                        <span>{t("nav.interview")}</span>
                                    </span>
                                </NavLink>
                                <NavLink to="/ats-checker">
                                    <span className="flex items-center space-x-2">
                                        <FileSearch className="w-4 h-4" />
                                        <span>ATS Checker</span>
                                    </span>
                                </NavLink>
                                <NavLink to="/profile">
                                    <span className="flex items-center space-x-2">
                                        <User className="w-4 h-4" />
                                        <span>{t("nav.profile")}</span>
                                    </span>
                                </NavLink>

                                <div className="w-px h-6 bg-surface-300/50 dark:bg-slate-600/50 mx-2" />

                                {/* Dark Mode Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={toggleTheme}
                                    className="p-2 rounded-xl text-surface-500 hover:text-primary-500 hover:bg-primary-50/60 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-primary-500/10 transition-all"
                                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                >
                                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleLanguage}
                                    className="px-3 py-1.5 text-xs font-semibold text-surface-500 border border-surface-300 rounded-lg hover:border-primary-400 hover:text-primary-500 transition-all flex items-center space-x-1.5 dark:text-slate-400 dark:border-slate-600 dark:hover:border-primary-400 dark:hover:text-primary-400"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>{i18n.language === "en" ? "हिंदी" : "EN"}</span>
                                </motion.button>

                                <div className="flex items-center space-x-3 ml-1">
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-white text-sm font-bold cursor-pointer ring-2 ring-primary-200 ring-offset-2 ring-offset-white dark:ring-primary-500/30 dark:ring-offset-slate-900"
                                    >
                                        {user?.name?.[0]?.toUpperCase() || "U"}
                                    </motion.div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleLogout}
                                        className="px-3 py-2 text-sm text-surface-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center space-x-1.5 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>{t("nav.logout")}</span>
                                    </motion.button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Dark Mode Toggle (logged out) */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={toggleTheme}
                                    className="p-2 rounded-xl text-surface-500 hover:text-primary-500 hover:bg-primary-50/60 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-primary-500/10 transition-all mr-1"
                                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                >
                                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleLanguage}
                                    className="px-3 py-1.5 text-xs font-semibold text-surface-500 border border-surface-300 rounded-lg hover:border-primary-400 hover:text-primary-500 transition-all mr-2 flex items-center space-x-1.5 dark:text-slate-400 dark:border-slate-600 dark:hover:border-primary-400"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>{i18n.language === "en" ? "हिंदी" : "EN"}</span>
                                </motion.button>
                                <Link to="/login" className="px-4 py-2 text-sm text-surface-600 hover:text-primary-600 hover:bg-primary-50/60 rounded-xl transition-all dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                    {t("nav.login")}
                                </Link>
                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link to="/register" className="relative px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-400 rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow overflow-hidden group">
                                        <span className="relative z-10">{t("nav.register")}</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Mobile: theme toggle + hamburger */}
                    <div className="md:hidden flex items-center space-x-1">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleTheme}
                            className="p-2 text-surface-600 hover:text-primary-500 rounded-lg hover:bg-primary-50 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-primary-500/10"
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-surface-600 hover:text-primary-500 rounded-lg hover:bg-primary-50 dark:text-slate-400 dark:hover:text-primary-400"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </motion.button>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden overflow-hidden pb-4"
                        >
                            {isAuthenticated ? (
                                <div className="flex flex-col space-y-1 pt-2">
                                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl flex items-center space-x-3 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>{t("nav.dashboard")}</span>
                                    </Link>
                                    <Link to="/interview" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl flex items-center space-x-3 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        <Mic className="w-4 h-4" />
                                        <span>{t("nav.interview")}</span>
                                    </Link>
                                    <Link to="/ats-checker" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl flex items-center space-x-3 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        <FileSearch className="w-4 h-4" />
                                        <span>ATS Checker</span>
                                    </Link>
                                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl flex items-center space-x-3 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        <User className="w-4 h-4" />
                                        <span>{t("nav.profile")}</span>
                                    </Link>
                                    <button onClick={toggleLanguage} className="px-4 py-3 text-left text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl flex items-center space-x-3 dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        <Globe className="w-4 h-4" />
                                        <span>{i18n.language === "en" ? "हिंदी" : "English"}</span>
                                    </button>
                                    <button onClick={handleLogout} className="px-4 py-3 text-left text-red-500 hover:bg-red-50 rounded-xl flex items-center space-x-3 dark:hover:bg-red-500/10">
                                        <LogOut className="w-4 h-4" />
                                        <span>{t("nav.logout")}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-1 pt-2">
                                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        {t("nav.login")}
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl dark:text-slate-300 dark:hover:text-primary-400 dark:hover:bg-primary-500/10">
                                        {t("nav.register")}
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
};

export default Navbar;
