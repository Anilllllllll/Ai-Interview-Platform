/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#FFF7F0",
                    100: "#FFEDD5",
                    200: "#FED7AA",
                    300: "#FDBA74",
                    400: "#FB923C",
                    500: "#FF6B00",
                    600: "#EA580C",
                    700: "#C2410C",
                    800: "#9A3412",
                    900: "#7C2D12",
                    950: "#431407",
                },
                surface: {
                    50: "#FFFFFF",
                    100: "#FFF7F0",
                    200: "#F5F0EB",
                    300: "#E8E0D8",
                    400: "#999999",
                    500: "#777777",
                    600: "#666666",
                    700: "#555555",
                    800: "#444444",
                    900: "#333333",
                    950: "#222222",
                },
                accent: {
                    cyan: "#06b6d4",
                    pink: "#ec4899",
                    violet: "#8b5cf6",
                    amber: "#f59e0b",
                    emerald: "#10b981",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                heading: ["Poppins", "Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.5s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "float-delayed": "float 6s ease-in-out 2s infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
                "gradient-x": "gradientX 8s ease infinite",
                "shimmer": "shimmer 2s linear infinite",
                "spin-slow": "spin 8s linear infinite",
                "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInRight: {
                    "0%": { opacity: "0", transform: "translateX(20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 20px rgba(255,107,0,0.3)" },
                    "100%": { boxShadow: "0 0 40px rgba(255,107,0,0.6)" },
                },
                gradientX: {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                bounceSubtle: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "mesh-gradient": "linear-gradient(135deg, #FFF7F0 0%, #FFEDD5 25%, #FFFFFF 50%, #FFF7F0 75%, #FFFFFF 100%)",
            },
        },
    },
    plugins: [],
};
