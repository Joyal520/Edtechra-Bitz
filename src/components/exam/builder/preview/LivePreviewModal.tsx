// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: LIVE PREVIEW MODAL
// Multi-device responsive interactive student preview with branching simulation
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  Clock,
  Layers,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import {
  CanonicalAssessmentV2,
  MultipleChoiceQuestion
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';

interface LivePreviewModalProps {
  isOpen: boolean;
  assessment: CanonicalAssessmentV2;
  theme: AssessmentThemeConfig;
  onClose: () => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  isOpen,
  assessment,
  theme,
  onClose
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, any>>({});

  if (!isOpen) return null;

  const isSurvey = assessment.assessmentType === 'survey';
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [{ id: 'sec-1', title: 'Section 1', questions: [] }];

  const currentSection = sections[activeSectionIndex] || sections[0];
  const questions = currentSection.questions || [];

  const handleSelectAnswer = (qId: string, value: any) => {
    setMockAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleNextSection = () => {
    // Check if section or any question has skipToSectionId
    const jumpTarget = currentSection.skipToSectionId;
    if (jumpTarget && jumpTarget !== 'SUBMIT_FORM') {
      const targetIdx = sections.findIndex((s) => s.id === jumpTarget);
      if (targetIdx !== -1) {
        setActiveSectionIndex(targetIdx);
        return;
      }
    }

    if (activeSectionIndex < sections.length - 1) {
      setActiveSectionIndex(activeSectionIndex + 1);
    }
  };

  const deviceWidthClass =
    device === 'mobile'
      ? 'max-w-[420px]'
      : device === 'tablet'
      ? 'max-w-2xl'
      : 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md select-none">
      {/* Top Device & Control Bar */}
      <div className="h-14 bg-[#070e1e] border-b border-blue-900/60 px-4 flex items-center justify-between z-20">
        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-[#050b18] p-1 rounded-xl border border-blue-900/60">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              device === 'desktop'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              device === 'tablet'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              device === 'mobile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Center: Mode Indicator & Answer Key Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden md:inline">
            Interactive Student Preview
          </span>

          {!isSurvey && (
            <button
              type="button"
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                showAnswerKeys
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 border-blue-900/60 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showAnswerKeys ? 'Hide Answer Key' : 'Reveal Answer Key'}</span>
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Exit Preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center custom-scrollbar">
        <div
          className={`w-full transition-all duration-300 rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto ${deviceWidthClass}`}
          style={{
            backgroundColor: theme.pageBg || theme.canvasBg || theme.background,
            borderColor: theme.cardBorder
          }}
        >
          {/* Mock Exam Timer or Survey Header */}
          <div
            className="px-6 py-3 border-b flex items-center justify-between text-xs font-bold"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder
            }}
          >
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>
                Section {activeSectionIndex + 1} of {sections.length}: {currentSection.title || 'Untitled'}
              </span>
            </div>

            {!isSurvey ? (
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>{assessment.exam.durationMinutes || 60}:00 Remaining</span>
              </div>
            ) : (
              <div className="text-slate-400 font-medium">
                {Math.round(((activeSectionIndex + 1) / sections.length) * 100)}% Completed
              </div>
            )}
          </div>

          {/* Assessment Content Body */}
          <div className="p-6 sm:p-8 space-y-6 flex-1">
            {/* Header Title & Description (if section 1) */}
            {activeSectionIndex === 0 && (
              <div
                className="p-6 rounded-2xl border shadow-sm space-y-2"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder
                }}
              >
                <div
                  className="h-2 -mx-6 -mt-6 mb-4 rounded-t-2xl"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {assessment.exam.title || 'Untitled Assessment'}
                </h1>
                {assessment.exam.description && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {assessment.exam.description}
                  </p>
                )}
                {assessment.exam.instructions && (
                  <div className="pt-2 text-xs text-slate-400 border-t border-blue-900/40">
                    <span className="font-bold text-slate-300">Instructions: </span>
                    {assessment.exam.instructions}
                  </div>
                )}
              </div>
            )}

            {/* Reading Passage if section has one */}
            {currentSection.passage && (
              <div
                className="p-5 rounded-2xl border bg-blue-950/20 border-blue-800/40 text-xs sm:text-sm text-slate-200 leading-relaxed"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                  Reading Passage
                </span>
                {currentSection.passage}
              </div>
            )}

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No questions in this section.
              </div>
            ) : (
              questions.map((q, qIdx) => {
                const isSelectedAnswer = mockAnswers[q.id];
                const choiceQ = q as MultipleChoiceQuestion;
                const options = choiceQ.options || [];

                return (
                  <div
                    key={q.id}
                    className="p-5 sm:p-6 rounded-2xl border space-y-3.5 shadow-sm"
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-white">
                            {q.question || 'Untitled Question'}
                          </p>
                          {q.required && (
                            <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">
                              * Required
                            </span>
                          )}
                        </div>
                      </div>

                      {!isSurvey && q.marks !== undefined && (
                        <span className="text-xs font-bold text-indigo-300 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-500/30 flex-shrink-0">
                          {q.marks} pts
                        </span>
                      )}
                    </div>

                    {/* Media if present */}
                    {q.mediaUrl && (
                      <div className="rounded-xl overflow-hidden max-h-60 bg-black/40 border border-blue-900/60">
                        <img
                          src={q.mediaUrl}
                          alt="Question media"
                          className="w-full h-auto object-contain max-h-60"
                        />
                      </div>
                    )}

                    {/* Choice Options */}
                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && (
                      <div className="space-y-2 pt-1">
                        {options.map((opt) => {
                          const isPicked = isSelectedAnswer === opt.id;
                          const isCorrectKey =
                            showAnswerKeys &&
                            (Array.isArray(choiceQ.correctAnswer)
                              ? choiceQ.correctAnswer.includes(opt.id)
                              : choiceQ.correctAnswer === opt.id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, opt.id)}
                              className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3 ${
                                isCorrectKey
                                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                                  : isPicked
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                  : 'bg-[#070e1f] border-blue-900/60 text-slate-300 hover:border-blue-700'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isPicked
                                    ? 'border-indigo-400 bg-indigo-600'
                                    : 'border-slate-500'
                                }`}
                              >
                                {isPicked && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="flex-1">{opt.text}</span>
                              {isCorrectKey && (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-900/50 px-2 py-0.5 rounded">
                                  Correct Key
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer / Paragraph Text Box */}
                    {['short_answer', 'paragraph'].includes(q.type) && (
                      <div className="pt-1">
                        <textarea
                          rows={q.type === 'paragraph' ? 4 : 2}
                          value={isSelectedAnswer || ''}
                          onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Type your response here..."
                          className="w-full bg-[#070e1f] border border-blue-900/60 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Navigation Footer */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={activeSectionIndex === 0}
                onClick={() => setActiveSectionIndex(activeSectionIndex - 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
              >
                Previous Section
              </button>

              {activeSectionIndex < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextSection}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <span>Next Section</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => alert('Mock submission successful in preview mode!')}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
