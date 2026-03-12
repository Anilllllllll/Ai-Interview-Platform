import { Radar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

/* helper: extract a score from both flat number and {score} object formats */
const getScore = (val) => {
    if (typeof val === "number") return val;
    if (val && typeof val === "object" && typeof val.score === "number") return val.score;
    return 0;
};

const ScoreChart = ({ feedback }) => {
    if (!feedback) return null;

    const scores = [
        getScore(feedback.technicalSkills),
        getScore(feedback.communication ?? feedback.communicationSkills),
        getScore(feedback.problemSolving),
        getScore(feedback.domainKnowledge),
        getScore(feedback.confidenceScore),
        getScore(feedback.professionalPresence),
    ];

    // If confidence & professional presence are both 0, show 4-point chart (old data)
    const hasGestureScores = scores[4] > 0 || scores[5] > 0;
    const labels = hasGestureScores
        ? ["Technical", "Communication", "Problem Solving", "Domain", "Confidence", "Presence"]
        : ["Technical", "Communication", "Problem Solving", "Domain"];
    const dataPoints = hasGestureScores ? scores : scores.slice(0, 4);

    const data = {
        labels,
        datasets: [
            {
                label: "Your Score",
                data: dataPoints,
                backgroundColor: "rgba(255, 107, 0, 0.12)",
                borderColor: "rgba(255, 107, 0, 0.7)",
                borderWidth: 2,
                pointBackgroundColor: [
                    "#FF6B00", "#FB923C", "#f59e0b", "#06b6d4", "#10b981", "#8b5cf6"
                ].slice(0, dataPoints.length),
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: "#FF6B00",
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    stepSize: 20,
                    color: "rgba(102, 102, 102, 0.5)",
                    backdropColor: "transparent",
                    font: { size: 9 },
                },
                grid: {
                    color: "rgba(0, 0, 0, 0.06)",
                    circular: true,
                },
                angleLines: {
                    color: "rgba(0, 0, 0, 0.06)",
                },
                pointLabels: {
                    color: "rgba(51, 51, 51, 0.85)",
                    font: { size: 11, family: "Inter", weight: "500" },
                    padding: 12,
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                titleColor: "#333333",
                bodyColor: "#666666",
                borderColor: "rgba(255, 107, 0, 0.3)",
                borderWidth: 1,
                padding: 14,
                cornerRadius: 10,
                titleFont: { size: 13, weight: "600" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (context) => `Score: ${context.raw}/100`,
                },
            },
        },
        animation: {
            duration: 1500,
            easing: "easeOutQuart",
        },
    };

    return (
        <div>
            <h3 className="text-sm font-semibold text-surface-600 mb-4 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                Performance Radar
            </h3>
            <div className="max-w-[300px] mx-auto">
                <Radar data={data} options={options} />
            </div>
        </div>
    );
};

export default ScoreChart;
