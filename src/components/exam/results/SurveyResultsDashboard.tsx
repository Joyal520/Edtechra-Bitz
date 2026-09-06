// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: SURVEY RESULTS DASHBOARD
// Analytics, percentage distributions, linear scale averages, and response lists
// ============================================================================

import React from 'react';
import { Users, MessageSquareHeart, BarChart3, RefreshCw, X } from 'lucide-react';
import { CanonicalAssessmentV2 } from '../shared/ExamSchema';

interface SurveyResultsDashboardProps {
  assessment: CanonicalAssessmentV2;
  responses: any[];
  onRefresh: () => void;
  onClose?: () => void;
}

export const SurveyResultsDashboard: React.FC<SurveyResultsDashboardProps> = ({
  assessment,
  responses = [],
  onRefresh,
  onClose
}) => {
  // Extract all questions across sections
  const questions = assessment.sections.flatMap((s: any) => s.questions || []);

  const totalResponses = responses.length;

  // Compute question response statistics
  const questionStats = React.useMemo(() => {
    return questions.map((q: any) => {
      const answersForQ = responses
        .map((r: any) => r.answers?.[q.id] || r.survey_response?.answers?.[q.id] || r.survey_response?.[q.id])
        .filter((ans: any) => ans !== undefined && ans !== null && String(ans).trim().length > 0);

      const responseCount = answersForQ.length;
      const countMap: Record<string, number> = {};

      if (q.type === 'multiple_choice' || q.type === 'dropdown') {
        answersForQ.forEach((ans: any) => {
          const key = String(ans);
          countMap[key] = (countMap[key] || 0) + 1;
        });
      } else if (q.type === 'checkboxes') {
        answersForQ.forEach((ansList: any) => {
          if (Array.isArray(ansList)) {
            ansList.forEach((item: any) => {
              const key = String(item);
              countMap[key] = (countMap[key] || 0) + 1;
            });
          } else if (ansList) {
            const key = String(ansList);
            countMap[key] = (countMap[key] || 0) + 1;
          }
        });
      }

      const textResponses = ['short_answer', 'paragraph', 'linear_scale'].includes(q.type)
        ? answersForQ
        : [];

      return {
        question: q,
        responseCount,
        countMap,
        textResponses
      };
    });
  }, [questions, responses]);

  return (
    <div className="space-y-6 text-white p-4 sm:p-6 bg-[#070e1f] rounded-3xl border border-blue-900/60 max-w-5xl mx-auto shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-blue-900/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-500/30">
              Survey Analytics
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-semibold">{totalResponses} Responses Recorded</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">{assessment.exam.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-blue-900/40 hover:bg-blue-800/60 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Results"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-blue-900/40 hover:bg-blue-800/60 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b142c] border border-blue-800/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Respondents</span>
            <p className="text-lg font-black text-white">{totalResponses}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b142c] border border-blue-800/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Questions</span>
            <p className="text-lg font-black text-white">{questions.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b142c] border border-blue-800/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
            <p className="text-lg font-black text-white">Active Feed</p>
          </div>
        </div>
      </div>

      {/* Question Profiling Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
          Question-by-Question Response Distribution
        </h3>

        <div className="space-y-4">
          {questionStats.map(({ question, responseCount, countMap, textResponses }: any, qIdx: number) => (
            <div
              key={question.id || qIdx}
              className="p-5 sm:p-6 rounded-3xl bg-[#0b142c] border border-blue-800/70 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <span className="text-xs font-black text-white">{question.question}</span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {responseCount} response{responseCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Choices Bar Breakdown */}
              {Object.keys(countMap).length > 0 && (
                <div className="space-y-2.5">
                  {Object.entries(countMap).map(([choiceId, count]: [string, any]) => {
                    const numCount = Number(count) || 0;
                    const percentage = totalResponses > 0 ? Math.round((numCount / totalResponses) * 100) : 0;
                    return (
                      <div key={choiceId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300">{choiceId}</span>
                          <span className="text-teal-300 font-black">{numCount} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-[#040916] rounded-full h-2 overflow-hidden border border-blue-900/60">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text Responses List */}
              {textResponses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400">Latest Student Responses:</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {textResponses.map((resText: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="p-2.5 rounded-xl bg-[#070e1f] border border-blue-900/60 text-xs text-slate-200"
                      >
                        "{String(resText)}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
