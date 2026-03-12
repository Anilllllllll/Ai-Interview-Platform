import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { authAPI, uploadAPI } from "../services/api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Briefcase, Code, BarChart3, Upload, CheckCircle, Save, Edit3, X } from "lucide-react";

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

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        domain: user?.domain || "Technology",
        specialization: user?.specialization || "Full Stack Developer",
        experienceLevel: user?.experienceLevel || "Mid",
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await authAPI.updateProfile(formData);
            updateUser(response.data.user);
            setEditing(false);
            toast.success(t("profile.updated"));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("resume", file);
        setUploading(true);
        try {
            const response = await uploadAPI.uploadResume(fd);
            updateUser({ ...user, resumeUrl: response.data.resumeUrl });
            toast.success("Resume uploaded successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to upload resume");
        } finally {
            setUploading(false);
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

    return (
        <motion.div
            variants={containerVariants} initial="hidden" animate="visible"
            className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
        >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 -right-32 w-[400px] h-[400px] bg-primary-100/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 -left-32 w-[400px] h-[400px] bg-primary-50/20 rounded-full blur-[100px]" />
            </div>

            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-surface-900 mb-8 font-heading">{t("profile.title")}</h1>
            </motion.div>

            {/* Profile card */}
            <motion.div variants={itemVariants}
                className="relative rounded-2xl border border-primary-100/60 overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(24px) saturate(150%)", boxShadow: "0 8px 40px rgba(255, 107, 0, 0.06)" }}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

                {/* Avatar header */}
                <div className="relative p-8 border-b border-surface-200/60"
                    style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.04), rgba(255,133,52,0.03))" }}>
                    <div className="flex items-center space-x-6">
                        <motion.div whileHover={{ scale: 1.05 }}
                            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary-500/30 ring-4 ring-primary-200 ring-offset-4 ring-offset-white"
                        >
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </motion.div>
                        <div>
                            <h2 className="text-xl font-bold text-surface-900">{user?.name}</h2>
                            <div className="flex items-center space-x-2 mt-1">
                                <Mail className="w-3.5 h-3.5 text-surface-400" />
                                <p className="text-surface-500 text-sm">{user?.email}</p>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-surface-400" />
                                <p className="text-surface-400 text-xs">
                                    Member since {new Date(user?.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="p-8">
                    <div className="space-y-5">
                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5 flex items-center space-x-2">
                                <User className="w-4 h-4 text-surface-400" />
                                <span>{t("auth.name")}</span>
                            </label>
                            {editing ? (
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" />
                            ) : (
                                <p className="text-surface-900 py-3 px-4 bg-surface-100/60 border border-surface-200 rounded-xl text-sm">{user?.name}</p>
                            )}
                        </motion.div>

                        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5 flex items-center space-x-2">
                                    <Briefcase className="w-4 h-4 text-surface-400" />
                                    <span>{t("profile.domain")}</span>
                                </label>
                                {editing ? (
                                    <select name="domain" value={formData.domain} onChange={handleChange} className="select-field">
                                        {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-surface-900 py-3 px-4 bg-surface-100/60 border border-surface-200 rounded-xl text-sm">{user?.domain}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-600 mb-1.5 flex items-center space-x-2">
                                    <Code className="w-4 h-4 text-surface-400" />
                                    <span>{t("profile.specialization")}</span>
                                </label>
                                {editing ? (
                                    <select name="specialization" value={formData.specialization} onChange={handleChange} className="select-field">
                                        {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-surface-900 py-3 px-4 bg-surface-100/60 border border-surface-200 rounded-xl text-sm">{user?.specialization}</p>
                                )}
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-surface-600 mb-1.5 flex items-center space-x-2">
                                <BarChart3 className="w-4 h-4 text-surface-400" />
                                <span>{t("profile.experienceLevel")}</span>
                            </label>
                            {editing ? (
                                <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="select-field">
                                    {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                                </select>
                            ) : (
                                <p className="text-surface-900 py-3 px-4 bg-surface-100/60 border border-surface-200 rounded-xl text-sm">{user?.experienceLevel}</p>
                            )}
                        </motion.div>

                        {/* Resume upload */}
                        <motion.div variants={itemVariants} className="pt-5 border-t border-surface-200/60">
                            <label className="block text-sm font-medium text-surface-600 mb-3 flex items-center space-x-2">
                                <Upload className="w-4 h-4 text-surface-400" />
                                <span>{t("profile.uploadResume")}</span>
                            </label>
                            <div className="flex items-center space-x-4">
                                <motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="px-5 py-2.5 bg-white hover:bg-surface-100 border border-surface-300 hover:border-primary-300 text-surface-600 text-sm font-medium rounded-xl cursor-pointer transition-all flex items-center space-x-2 shadow-sm">
                                    <Upload className="w-4 h-4" />
                                    <span>{uploading ? "Uploading..." : "Choose File"}</span>
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploading} />
                                </motion.label>
                                {user?.resumeUrl && (
                                    <span className="text-sm text-emerald-600 flex items-center space-x-1.5">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Resume uploaded</span>
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Action buttons */}
                    <motion.div variants={itemVariants} className="flex justify-end space-x-3 mt-8 pt-6 border-t border-surface-200/60">
                        {editing ? (
                            <>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => setEditing(false)}
                                    className="px-5 py-2.5 bg-white hover:bg-surface-100 border border-surface-300 text-surface-600 text-sm font-medium rounded-xl transition-all flex items-center space-x-2 shadow-sm">
                                    <X className="w-4 h-4" />
                                    <span>{t("common.cancel")}</span>
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleSave} disabled={saving}
                                    className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center space-x-2 disabled:opacity-50">
                                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>{t("profile.save")}</span>
                                </motion.button>
                            </>
                        ) : (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => setEditing(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center space-x-2">
                                <Edit3 className="w-4 h-4" />
                                <span>{t("profile.editProfile")}</span>
                            </motion.button>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Profile;
