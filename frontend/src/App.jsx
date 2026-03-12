import { Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Interview from "./pages/Interview";
import Report from "./pages/Report";
import ATSChecker from "./pages/ATSChecker";
import { useAuth } from "./context/AuthContext";

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        const token = searchParams.get("token");
        if (token) {
            processedRef.current = true;
            loginWithToken(token);
            setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
        } else {
            navigate("/login", { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF7F0] dark:bg-slate-950">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-surface-400 dark:text-slate-400">Completing authentication...</p>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <div className="min-h-screen bg-[#FFF7F0] dark:bg-slate-950 transition-colors duration-300">
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/interview"
                    element={
                        <ProtectedRoute>
                            <Interview />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/report/:id"
                    element={
                        <ProtectedRoute>
                            <Report />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/ats-checker"
                    element={
                        <ProtectedRoute>
                            <ATSChecker />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
};

export default App;
