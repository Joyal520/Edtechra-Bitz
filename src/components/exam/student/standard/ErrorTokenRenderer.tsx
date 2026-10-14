import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface ErrorTokenRendererProps {
  sentence: string;
  tokens?: string[];
  // Selected token text or index
  selectedAnswer: any;
  onSelectToken: (token: string, tokenIndex: number) => void;
  disabled?: boolean;
}

export const ErrorTokenRenderer: React.FC<ErrorTokenRendererProps> = ({
  sentence,
  tokens,
  selectedAnswer,
  onSelectToken,
  disabled = false
}) => {
  // If tokens array not provided, split sentence by whitespace
  const tokenList: string[] = React.useMemo(() => {
    if (Array.isArray(tokens) && tokens.length > 0) {
      return tokens;
    }
    if (!sentence) return [];
    return sentence.trim().split(/\s+/).filter(Boolean);
  }, [sentence, tokens]);

  // Selected token string / index
  const isTokenSelected = (tok: string, idx: number): boolean => {
    if (selectedAnswer === undefined || selectedAnswer === null) return false;
    if (typeof selectedAnswer === 'object') {
      if (selectedAnswer.tokenIndex !== undefined && selectedAnswer.tokenIndex === idx) return true;
      if (selectedAnswer.incorrectToken && selectedAnswer.incorrectToken.toLowerCase() === tok.toLowerCase()) return true;
      if (selectedAnswer.token && selectedAnswer.token.toLowerCase() === tok.toLowerCase()) return true;
    }
    if (typeof selectedAnswer === 'number' && selectedAnswer === idx) return true;
    if (typeof selectedAnswer === 'string') {
      const cleanSel = selectedAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
      const cleanTok = tok.trim().toLowerCase().replace(/[.,!?;:]/g, '');
      return cleanSel === cleanTok;
    }
    return false;
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Banner Instruction */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-950">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-amber-900">
            Tap the single word that contains a mistake:
          </div>
          <div className="text-[11px] text-amber-800/90 font-medium leading-relaxed">
            There is exactly one grammatical mistake in the sentence below. Tap the incorrect word to select it.
          </div>
        </div>
      </div>

      {/* Sentence Word Chips Area */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white border-2 border-slate-200 shadow-2xs space-y-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Sentence Tokens
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center">
          {tokenList.map((token, idx) => {
            const isSelected = isTokenSelected(token, idx);

            return (
              <button
                key={`${token}-${idx}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectToken(token, idx)}
                className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border-2 font-bold text-sm sm:text-base cursor-pointer transition-all duration-150 touch-manipulation active:scale-95 shadow-2xs ${
                  isSelected
                    ? 'bg-rose-500 text-white border-rose-500 ring-4 ring-rose-200 shadow-md scale-105 font-black'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span>{token}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation feedback card */}
      {selectedAnswer !== undefined && selectedAnswer !== null && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-950 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-rose-600" />
            <span>
              Selected incorrect word:{' '}
              <span className="font-black underline">
                {typeof selectedAnswer === 'object'
                  ? selectedAnswer.incorrectToken || selectedAnswer.token
                  : String(selectedAnswer)}
              </span>
            </span>
          </div>
          <span className="text-[11px] font-semibold text-rose-600">Tap another word to change</span>
        </div>
      )}
    </div>
  );
};
