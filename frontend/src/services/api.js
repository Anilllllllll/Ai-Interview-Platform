import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            if (currentPath !== "/login" && currentPath !== "/register") {
                localStorage.removeItem("token");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    getProfile: () => api.get("/auth/profile"),
    updateProfile: (data) => api.put("/auth/profile", data),
};

export const interviewAPI = {
    start: (data) => api.post("/interview/start", data),
    answer: (data) => api.post("/interview/answer", data),
    end: (data) => api.post("/interview/end", data),
    getHistory: (page = 1, limit = 10) =>
        api.get(`/interview/history?page=${page}&limit=${limit}`),
    getSession: (id) => api.get(`/interview/${id}`),
    getActive: () => api.get("/interview/active"),
};

export const uploadAPI = {
    uploadResume: (formData) =>
        api.post("/upload/resume", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    uploadAndParseResume: (formData) =>
        api.post("/upload/resume-parse", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000,
        }),
};

export const atsAPI = {
    analyze: (formData) =>
        api.post("/ats/analyze", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000,
        }),
};

export default api;
