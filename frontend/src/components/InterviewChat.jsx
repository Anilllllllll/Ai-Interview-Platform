import { useEffect, useRef } from "react";

const InterviewChat = ({ transcript, isLoading }) => {
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 relative">
            {/* Subtle ambient background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-100/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-primary-50/30 rounded-full blur-3xl" />
            </div>

            {transcript.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full space-y-4 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <p className="text-surface-400 text-sm">Your interview will appear here…</p>
                </div>
            )}

            {transcript.map((msg, i) => (
                <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.role === "user" ? "msg-enter-right" : "msg-enter-left"
                        } relative z-10`}
                >
                    <div className="flex items-start gap-3 max-w-[85%]">
                        {/* AI Avatar */}
                        {msg.role === "assistant" && (
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20 mt-1">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                        )}

                        <div className={`${msg.role === "assistant" ? "chat-bubble-ai" : "chat-bubble-user"} p-4`}>
                            {/* Role label */}
                            <div className="flex items-center space-x-1.5 mb-1.5">
                                {msg.role === "assistant" ? (
                                    <>
                                        <span className="text-[10px] font-bold text-primary-600 tracking-wider uppercase">Nexa Interviewer</span>
                                        <svg className="w-3 h-3 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                                        </svg>
                                        <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">You (Voice)</span>
                                    </>
                                )}
                            </div>
                            <p className="text-surface-700 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* User Avatar */}
                        {msg.role === "user" && (
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mt-1">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
                <div className="flex justify-start msg-enter-left relative z-10">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20 mt-1">
                            <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div className="chat-bubble-ai p-4 shimmer">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                                <span className="text-[10px] font-bold text-primary-600 tracking-wider uppercase">AI Interviewer</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-400/60 animate-bounce" style={{ animationDelay: "0s" }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-400/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-400/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
                                </div>
                                <span className="text-surface-500 text-xs">Nexa is Thinking…</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={chatEndRef} />
        </div>
    );
};

export default InterviewChat;
