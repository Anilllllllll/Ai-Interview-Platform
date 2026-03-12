const QuestionCard = ({ question, questionNumber }) => {
    return (
        <div className="chat-bubble-ai p-5 max-w-[85%] animate-slide-up">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    {questionNumber && (
                        <span className="text-xs font-medium text-primary-400 mb-1 flex items-center space-x-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75a.75.75 0 01-.75-.75v-4.94l-1.72 1.72a.75.75 0 01-1.06-1.06l3-3a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06L13.25 13.06V18a.75.75 0 01-.75.75z" />
                            </svg>
                            <span>Question {questionNumber} · AI Voice</span>
                        </span>
                    )}
                    <p className="text-surface-100 leading-relaxed whitespace-pre-wrap">
                        {question}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QuestionCard;
