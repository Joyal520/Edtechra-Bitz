// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: STUDENT RESULT SCREEN (PHASE 14)
// High-impact result presentation with section breakdowns and conditional review
// ============================================================================

import React, { useState } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExamResultViewProps {
  result: {
    score: number;
    maxScore: number;
    percentage: number;
    grade: string;
    passed: boolean;
    feedback?: string;
    breakdown?: Array<{
      questionId: string;
      questionType: string;
      questionText?: string;
      score: number;
      maxScore: number;
      isCorrect: boolean;
      submittedAnswer: any;
      correctAnswer?: any;
      explanation?: string;
      requiresTeacherReview?: boolean;
    }>;
    sectionBreakdown?: Array<{
      sectionTitle: string;
      score: number;
      total: number;
      percentage: number;
    }>;
    timeTakenSeconds?: number;
    gradingStatus?: string; // 'auto_graded' | 'pending_review' | 'reviewed'
  };
  examTitle: string;
  showMarksImmediately?: boolean;
  showCorrectAnswers?: boolean;
  onReturnToClassroom: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  result,
  examTitle,
  showMarksImmediately = true,
  showCorrectAnswers = true,
  onReturnToClassroom
}) => {
  const [showReview, setShowReview] = useState(false);

  const breakdown = result.breakdown || [];
  const correctCount = breakdown.filter(b => b.isCorrect).length;
  const reviewPendingCount = breakdown.filter(b => b.requiresTeacherReview).length;
  const incorrectCount = breakdown.filter(b => !b.isCorrect && !b.requiresTeacherReview).length;

  return (
    <div className="min-h-screen bg-[#070e1f] text-white p-4 sm:p-8 flex flex-col items-center justify-center animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0b142c] border border-blue-800/80 rounded-3xl shadow-2xl overflow-hidden space-y-6 flex flex-col">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-blue-950/90 p-8 text-center space-y-4 border-b border-blue-800/80">
          <div className="w-16 h-16 rounded-3xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Award className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
              Exam Complete
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{examTitle}</h1>
          </div>

          {/* Score & Percentage Display (if enabled) */}
          {showMarksImmediately ? (
            <div className="space-y-2 pt-2">
              <div className="inline-flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white">{result.score}</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-400">/ {result.maxScore}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-black text-emerald-300">{result.percentage}%</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                  Grade {result.grade || (result.percentage >= 80 ? 'A' : result.percentage >= 60 ? 'B' : 'Pass')}
                </span>
                <span className="text-slate-400">•</span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  result.passed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {result.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#091124] border border-blue-800/80 text-xs text-indigo-200 font-medium">
              Scores are hidden until your teacher completes final grading and releases results.
            </div>
          )}

          {/* Teacher Review Pending Notice */}
          {reviewPendingCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 flex items-center justify-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {reviewPendingCount} subjective question{reviewPendingCount > 1 ? 's' : ''} (Essay/Short Answer) are pending teacher evaluation. Final score will update once reviewed.
              </span>
            </div>
          )}
        </div>

        {/* Breakdown Stats Grid */}
        {showMarksImmediately && (
          <div className="px-6 sm:px-8 grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/80 text-center space-y-0.5">
              <div className="text-lg font-black text-emerald-400">{correctCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/80 text-center space-y-0.5">
              <div className="text-lg font-black text-rose-400">{incorrectCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incorrect</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/80 text-center space-y-0.5">
              <div className="text-lg font-black text-amber-400">{reviewPendingCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Under Review</div>
            </div>
          </div>
        )}

        {/* Section Performance Bars */}
        {result.sectionBreakdown && result.sectionBreakdown.length > 0 && showMarksImmediately && (
          <div className="px-6 sm:px-8 space-y-3">
            <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Performance by Section
            </h3>
            <div className="space-y-2">
              {result.sectionBreakdown.map((sec, sIdx) => (
                <div key={sIdx} className="p-3 rounded-2xl bg-[#091124] border border-blue-900/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">{sec.sectionTitle}</span>
                    <span className="text-indigo-300">{sec.score} / {sec.total} ({sec.percentage}%)</span>
                  </div>
                  <div className="w-full bg-[#040916] rounded-full h-2 overflow-hidden border border-blue-900/60">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, sec.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Question Review Accordion */}
        {showCorrectAnswers && breakdown.length > 0 && (
          <div className="px-6 sm:px-8 space-y-3">
            <button
              type="button"
              onClick={() => setShowReview(prev => !prev)}
              className="w-full p-4 rounded-2xl bg-[#0f1b3d] hover:bg-[#162554] border border-blue-800/80 flex items-center justify-between text-xs font-black text-white cursor-pointer transition-all"
            >
              <span>{showReview ? 'Hide Question Breakdown' : 'View Question Breakdown & Answers'}</span>
              {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showReview && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 animate-fadeIn">
                {breakdown.map((item, bIdx) => (
                  <div
                    key={bIdx}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      item.requiresTeacherReview
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : item.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span className="text-white">Question {bIdx + 1} ({item.questionType || 'Question'})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10">
                        {item.requiresTeacherReview ? 'Pending Review' : `${item.score} / ${item.maxScore} Marks`}
                      </span>
                    </div>

                    {item.questionText && (
                      <p className="text-white/90 font-medium">{item.questionText}</p>
                    )}

                    <div className="text-[11px] font-medium space-y-1">
                      <div>
                        <strong className="text-white">Your answer:</strong>{' '}
                        <span>
                          {typeof item.submittedAnswer === 'object'
                            ? JSON.stringify(item.submittedAnswer)
                            : String(item.submittedAnswer || '(No response)')}
                        </span>
                      </div>

                      {!item.isCorrect && !item.requiresTeacherReview && item.correctAnswer && (
                        <div className="text-emerald-300">
                          <strong className="text-white">Correct answer:</strong>{' '}
                          <span>
                            {typeof item.correctAnswer === 'object'
                              ? JSON.stringify(item.correctAnswer)
                              : String(item.correctAnswer)}
                          </span>
                        </div>
                      )}

                      {item.explanation && (
                        <p className="text-slate-300 italic pt-1">
                          <strong>Explanation:</strong> {item.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-6 sm:p-8 bg-[#091124] border-t border-blue-900/80 flex justify-end">
          <button
            type="button"
            onClick={onReturnToClassroom}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <span>Return to Classroom</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
