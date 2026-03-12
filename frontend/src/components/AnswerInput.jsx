import { useState } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";

const AnswerInput = ({ onSubmit, disabled }) => {
    const [answer, setAnswer] = useState("");
    const [useEditor, setUseEditor] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!answer.trim() || disabled) return;
        onSubmit(answer.trim());
        setAnswer("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey && !useEditor) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-surface-400">Your Response</span>
                <button
                    type="button"
                    onClick={() => setUseEditor(!useEditor)}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center space-x-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>{useEditor ? t("interview.useText") : t("interview.useEditor")}</span>
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {useEditor ? (
                    <div className="rounded-lg overflow-hidden border border-surface-600 mb-3">
                        <Editor
                            height="200px"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={answer}
                            onChange={(value) => setAnswer(value || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 12 },
                                wordWrap: "on",
                            }}
                        />
                    </div>
                ) : (
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("interview.answerPlaceholder")}
                        disabled={disabled}
                        className="input-field resize-none h-32 mb-3 font-sans"
                        rows={4}
                    />
                )}

                <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-500">
                        {useEditor ? "Write your code above" : "Shift+Enter for new line • Enter to submit"}
                    </span>
                    <button
                        type="submit"
                        disabled={!answer.trim() || disabled}
                        className="btn-primary text-sm py-2.5 px-5 flex items-center space-x-2"
                    >
                        <span>{t("interview.submit")}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AnswerInput;
