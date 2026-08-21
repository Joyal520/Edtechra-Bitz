import React, { useState, useRef } from 'react';
import {
  BarChart3,
  Sparkles,
  Users,
  Check,
  Loader2
} from 'lucide-react';
import { PollBit, PollVoteResult } from '@/types';
import { pollService } from '@/services/pollService';
import { useAuth } from '@/context/AuthContext';
import { triggerConfetti } from '@/utils/confetti';

interface PollBitCardProps {
  poll: PollBit;
  onVoted?: (result: PollVoteResult) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const PollBitCard: React.FC<PollBitCardProps> = ({ poll, onVoted }) => {
  const { session } = useAuth();
  const cardRef = useRef<HTMLElement>(null);

  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.user_voted_options || []);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [totalVotes, setTotalVotes] = useState<number>(poll.total_votes || 0);
  const [optionVotes, setOptionVotes] = useState<Record<string, number>>(poll.option_votes || {});
  const [optionPercentages, setOptionPercentages] = useState<Record<string, number>>(poll.option_percentages || {});
  const [hasVoted, setHasVoted] = useState<boolean>(Boolean(poll.user_voted_options && poll.user_voted_options.length > 0));

  const handleVote = async (option: string) => {
    if (hasVoted || submitting) return;

    setSubmitting(true);
    try {
      const token = session?.access_token || null;
      const result = await pollService.submitVote(poll.id, option, token);

      setSelectedOptions(result.selected_options || [option]);
      setTotalVotes(result.total_votes);
      setOptionVotes(result.option_votes || {});
      setOptionPercentages(result.option_percentages || {});
      setHasVoted(true);

      // Trigger celebratory burst on poll vote
      triggerConfetti(cardRef.current);

      if (onVoted) {
        onVoted(result);
      }
    } catch (err: any) {
      console.error('[PollBitCard] Vote submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article
      ref={cardRef}
      className="w-full bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all"
    >
      {/* 1. Accent Header Strip */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs">
            📊
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            Community Poll
          </span>
        </div>

        <div className="flex items-center gap-2">
          {poll.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold text-white">
              {poll.category}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold flex items-center gap-1">
            <Users className="w-3 h-3 text-purple-200" />
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>

      {/* 2. Poll Body */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Question Text */}
        <h3 className="text-sm sm:text-base font-black text-[#0f233a] leading-snug">
          {poll.question}
        </h3>

        {/* 3. Options / Results List */}
        <div className="space-y-2.5 pt-1">
          {poll.options.map((option, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const isSelected = selectedOptions.includes(option);
            const percent = optionPercentages[option] || 0;
            const voteCount = optionVotes[option] || 0;

            if (hasVoted) {
              // Results Display Mode
              return (
                <div
                  key={index}
                  className={`relative p-3 sm:p-3.5 rounded-2xl border overflow-hidden transition-all ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50/70 shadow-2xs font-black'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  {/* Animated Background Progress Bar */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-2xl ${
                      isSelected
                        ? 'bg-purple-200/60'
                        : 'bg-slate-200/50'
                    }`}
                    style={{ width: `${percent}%` }}
                  />

                  {/* Option Content Foreground */}
                  <div className="relative z-10 flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : letter}
                      </div>
                      <span className={`truncate break-words ${isSelected ? 'text-purple-950 font-black' : 'text-slate-800 font-semibold'}`}>
                        {option}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className={`font-black text-xs sm:text-sm ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Voting Action Mode
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleVote(option)}
                disabled={submitting}
                className="w-full min-h-[48px] sm:min-h-[50px] p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-purple-50/80 hover:border-purple-300 text-slate-800 font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2.5 active:scale-[0.99] cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 group-hover:bg-purple-600 group-hover:text-white text-slate-700 flex items-center justify-center text-xs font-black shrink-0 transition-colors">
                    {letter}
                  </div>
                  <span className="truncate break-words group-hover:text-purple-950">
                    {option}
                  </span>
                </div>

                {submitting && isSelected && (
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Footer Note */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {hasVoted ? '✨ Your vote has been recorded!' : 'Tap an option to vote and see live results'}
            </span>
          </div>

          {hasVoted && (
            <span className="text-purple-600 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Results Live</span>
            </span>
          )}
        </div>

      </div>
    </article>
  );
};
