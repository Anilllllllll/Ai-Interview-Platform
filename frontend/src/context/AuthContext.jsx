import { createContext, useContext, useReducer, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const initialState = {
    user: null,
    token: localStorage.getItem("token"),
    isAuthenticated: false,
    loading: true,
    error: null,
};

const authReducer = (state, action) => {
    switch (action.type) {
        case "AUTH_LOADING":
            return { ...state, loading: true, error: null };
        case "AUTH_SUCCESS":
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                loading: false,
                error: null,
            };
        case "AUTH_RESTORE":
            return {
                ...state,
                user: action.payload.user,
                isAuthenticated: true,
                loading: false,
                error: null,
            };
        case "AUTH_ERROR":
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: action.payload,
            };
        case "LOGOUT":
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: null,
            };
        case "UPDATE_USER":
            return { ...state, user: action.payload };
        case "CLEAR_ERROR":
            return { ...state, error: null };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const restoreAuth = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                dispatch({ type: "AUTH_ERROR", payload: null });
                return;
            }
            try {
                const response = await api.get("/auth/profile");
                dispatch({
                    type: "AUTH_RESTORE",
                    payload: { user: response.data.user },
                });
            } catch (error) {
                localStorage.removeItem("token");
                dispatch({
                    type: "AUTH_ERROR",
                    payload: "Session expired. Please login again.",
                });
            }
        };
        restoreAuth();
    }, []);

    const login = async (email, password) => {
        dispatch({ type: "AUTH_LOADING" });
        try {
            const response = await api.post("/auth/login", { email, password });
            const { token, user } = response.data;
            localStorage.setItem("token", token);
            dispatch({ type: "AUTH_SUCCESS", payload: { token, user } });
            return { success: true };
        } catch (error) {
            const message =
                error.response?.data?.message || "Login failed. Please try again.";
            dispatch({ type: "AUTH_ERROR", payload: message });
            return { success: false, message };
        }
    };

    const register = async (userData) => {
        dispatch({ type: "AUTH_LOADING" });
        try {
            const response = await api.post("/auth/register", userData);
            const { token, user } = response.data;
            localStorage.setItem("token", token);
            dispatch({ type: "AUTH_SUCCESS", payload: { token, user } });
            return { success: true };
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Registration failed. Please try again.";
            dispatch({ type: "AUTH_ERROR", payload: message });
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        dispatch({ type: "LOGOUT" });
    };

    const updateUser = (user) => {
        dispatch({ type: "UPDATE_USER", payload: user });
    };

    const clearError = () => {
        dispatch({ type: "CLEAR_ERROR" });
    };

    const loginWithToken = (token) => {
        localStorage.setItem("token", token);
        dispatch({ type: "AUTH_LOADING" });
        api
            .get("/auth/profile")
            .then((res) => {
                dispatch({
                    type: "AUTH_SUCCESS",
                    payload: { token, user: res.data.user },
                });
            })
            .catch(() => {
                localStorage.removeItem("token");
                dispatch({ type: "AUTH_ERROR", payload: "Authentication failed." });
            });
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                logout,
                updateUser,
                clearError,
                loginWithToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;
