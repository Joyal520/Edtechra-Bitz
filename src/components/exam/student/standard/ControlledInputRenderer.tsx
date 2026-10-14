import React, { useState, useEffect } from 'react';
import { Type, CheckCircle2 } from 'lucide-react';

interface ControlledInputRendererProps {
  questionPrompt?: string;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  disabled?: boolean;
}

export const ControlledInputRenderer: React.FC<ControlledInputRendererProps> = ({
  questionPrompt,
  currentAnswer = '',
  onAnswerChange,
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState(currentAnswer || '');

  // Keep in sync with external answer updates (e.g. Next / Prev navigation)
  useEffect(() => {
    setLocalValue(currentAnswer || '');
  }, [currentAnswer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onAnswerChange(val);
  };

  const handleBlur = () => {
    onAnswerChange(localValue.trim());
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Target prompt card */}
      {questionPrompt && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Complete the sentence with the correct form:
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
            {questionPrompt}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-4 h-4 text-indigo-600" />
          <span>Type your answer:</span>
        </label>

        <div className="relative">
          <input
            type="text"
            value={localValue}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Type answer here..."
            className={`w-full py-4 px-4 sm:px-5 rounded-2xl bg-white border-2 text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-2xs transition-all focus:outline-hidden ${
              localValue.trim()
                ? 'border-indigo-600 ring-4 ring-indigo-500/10'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
            } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
          />

          {localValue.trim() && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          Spelling counts. Type only the missing word or phrase.
        </p>
      </div>
    </div>
  );
};
