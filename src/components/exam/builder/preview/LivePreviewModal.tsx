// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: MODERN DIGITAL EXAM STUDENT PREVIEW (LIGHT)
// Real modern online examination platform: Colorful section tabs, timer,
// question palette (1..N grid), flag for review, student utilities & audio/video
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  Clock,
  CheckCircle2,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Headphones,
  Image as ImageIcon,
  KeyRound,
  FileEdit,
  Type
} from 'lucide-react';
import {
  CanonicalAssessmentV2,
  MultipleChoiceQuestion
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import { flattenExamQuestions, FlattenedExamQuestion } from '../../shared/scoringUtilities';

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
  onClose
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, any>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showNotepad, setShowNotepad] = useState(false);
  const [notepadText, setNotepadText] = useState('');
  const [showStudentTranscript, setShowStudentTranscript] = useState(false);

  // Flatten questions across all sections and activities
  const flattenedQuestions: FlattenedExamQuestion[] = useMemo(() => {
    return flattenExamQuestions(assessment.sections);
  }, [assessment.sections]);

  const currentQItem = flattenedQuestions[currentIndex] || flattenedQuestions[0];
  const totalQuestions = flattenedQuestions.length;

  const handleSelectAnswer = (qId: string, value: any) => {
    setMockAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleToggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Sections navigation tabs
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [{ id: 'sec-1', title: 'Section 1', questions: [] }];

  const answeredCount = Object.keys(mockAnswers).filter(
    (k) => mockAnswers[k] !== undefined && mockAnswers[k] !== ''
  ).length;

  if (!isOpen) return null;

  const deviceWidthClass =
    device === 'mobile'
      ? 'max-w-[420px]'
      : device === 'tablet'
      ? 'max-w-3xl'
      : 'max-w-6xl';

  const fontClass =
    fontSize === 'xlarge'
      ? 'text-lg leading-relaxed'
      : fontSize === 'large'
      ? 'text-base leading-relaxed'
      : 'text-sm leading-relaxed';

  // Section Color Themes for colorful tabs
  const sectionColors = [
    { bg: 'bg-blue-600', text: 'text-white', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { bg: 'bg-purple-600', text: 'text-white', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bg: 'bg-amber-600', text: 'text-white', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { bg: 'bg-rose-600', text: 'text-white', badge: 'bg-rose-50 text-rose-700 border-rose-200' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md select-none overflow-hidden animate-fadeIn">
      {/* Top Device & Control Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shadow-2xs">
        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'desktop'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'tablet'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'mobile'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Center: Indicator & Answer Key Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 hidden md:inline">
            Interactive Online Examination Experience
          </span>

          <button
            type="button"
            onClick={() => setShowAnswerKeys(!showAnswerKeys)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
              showAnswerKeys
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{showAnswerKeys ? 'Hide Answer Key' : 'Reveal Answer Key'}</span>
          </button>
        </div>

        {/* Exit Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Exit Student Preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Student Examination Viewport */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center custom-scrollbar bg-slate-100/70">
        <div
          className={`w-full transition-all duration-300 rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col my-auto ${deviceWidthClass}`}
        >
          {/* 1. Top Online Examination Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                E
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {assessment.exam.title || 'Official Digital Examination'}
                </h1>
                <span className="text-xs font-semibold text-slate-500">
                  {assessment.exam.subject} • {assessment.exam.grade}
                </span>
              </div>
            </div>

            {/* Candidate Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Candidate:</span>
              <span className="font-bold text-slate-800">Student View (Preview)</span>
            </div>
          </div>

          {/* 2. Colorful Section Navigation Tabs */}
          <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {sections.map((sec, sIdx) => {
              const color = sectionColors[sIdx % sectionColors.length];
              const isSecCurrent = currentQItem?.sectionId === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    const firstQIdx = flattenedQuestions.findIndex((q) => q.sectionId === sec.id);
                    if (firstQIdx !== -1) setCurrentIndex(firstQIdx);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isSecCurrent
                      ? `${color.bg} text-white shadow-xs`
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{sec.title || `Section ${sIdx + 1}`}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Main Examination Workspace: Left Question Area + Right Dashboard Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left Question Area (Col span 3) */}
            <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white min-h-[480px]">
              {totalQuestions === 0 ? (
                <div className="text-center py-20 text-slate-400 text-sm">
                  No questions currently added to this assessment.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Question Header: Number & Marks */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        Question {currentIndex + 1} of {totalQuestions}
                      </span>
                      <span className="text-xs font-bold text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {currentQItem.question.marks || 1} {Number(currentQItem.question.marks) === 1 ? 'Mark' : 'Marks'}
                      </span>
                    </div>

                    {/* Review Flag button */}
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQItem.question.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        flaggedIds.has(currentQItem.question.id)
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${flaggedIds.has(currentQItem.question.id) ? 'fill-current' : ''}`} />
                      <span>{flaggedIds.has(currentQItem.question.id) ? 'Marked for Review' : 'Flag for Review'}</span>
                    </button>
                  </div>

                  {/* Context Stimulus (Reading Passage, Audio Track, Video Player, Picture) */}
                  {currentQItem.parentPassage && (
                    <div className="p-5 rounded-2xl bg-teal-50/40 border border-teal-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block mb-1 font-sans">
                        Reading Passage: {currentQItem.parentPassageTitle || ''}
                      </span>
                      <p>{currentQItem.parentPassage}</p>
                    </div>
                  )}

                  {currentQItem.parentAudioUrl && (
                    <div className="p-4 rounded-2xl bg-violet-50/40 border border-violet-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-violet-600" />
                          <span>Listening Activity: {currentQItem.parentActivityTitle || 'Audio Track'}</span>
                        </span>

                        {currentQItem.showTranscriptToStudents && (
                          <button
                            type="button"
                            onClick={() => setShowStudentTranscript(!showStudentTranscript)}
                            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                          >
                            {showStudentTranscript ? 'Hide Transcript' : 'Show Transcript'}
                          </button>
                        )}
                      </div>

                      <audio controls className="w-full h-10 rounded-lg">
                        <source src={currentQItem.parentAudioUrl} />
                        Your browser does not support the audio element.
                      </audio>

                      {showStudentTranscript && currentQItem.parentTranscript && (
                        <div className="p-3 bg-white rounded-xl border border-violet-200 text-xs text-slate-700 leading-relaxed animate-fadeIn">
                          {currentQItem.parentTranscript}
                        </div>
                      )}
                    </div>
                  )}

                  {currentQItem.parentImageUrl && (
                    <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>Picture Stimulus: {currentQItem.parentActivityTitle || 'Visual Task'}</span>
                      </span>
                      <div className="w-full max-h-64 rounded-xl overflow-hidden border border-amber-200 bg-white flex items-center justify-center">
                        <img
                          src={currentQItem.parentImageUrl}
                          alt="Picture stimulus"
                          className="max-h-64 w-auto object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Question Prompt */}
                  <div className="space-y-3">
                    <h3 className={`font-bold text-slate-900 ${fontClass}`}>
                      {currentQItem.question.question}
                    </h3>

                    {/* Answer Options Rendering */}
                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(currentQItem.question.type) && (
                      <div className="space-y-2.5 pt-2">
                        {((currentQItem.question as MultipleChoiceQuestion).options || []).map((opt) => {
                          const isSelected = mockAnswers[currentQItem.question.id] === opt.id;
                          const isCorrectAnswer = Array.isArray((currentQItem.question as any).correctAnswer)
                            ? (currentQItem.question as any).correctAnswer.includes(opt.id)
                            : (currentQItem.question as any).correctAnswer === opt.id;

                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleSelectAnswer(currentQItem.question.id, opt.id)}
                              className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              } ${showAnswerKeys && isCorrectAnswer ? 'bg-emerald-50 border-emerald-500' : ''}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-slate-300 bg-white text-slate-500'
                                }`}
                              >
                                {opt.id.toUpperCase()}
                              </div>

                              <span className="flex-1 text-xs sm:text-sm font-medium">
                                {opt.text}
                              </span>

                              {showAnswerKeys && isCorrectAnswer && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Correct Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False Binary Selection */}
                    {currentQItem.question.type === 'true_false' && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[true, false].map((tfVal) => {
                          const isSelected = mockAnswers[currentQItem.question.id] === tfVal;
                          return (
                            <button
                              key={String(tfVal)}
                              type="button"
                              onClick={() => handleSelectAnswer(currentQItem.question.id, tfVal)}
                              className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{tfVal ? 'TRUE' : 'FALSE'}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Textarea for written responses */}
                    {['short_answer', 'paragraph', 'essay'].includes(currentQItem.question.type) && (
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={currentQItem.question.type === 'paragraph' ? 6 : 3}
                          value={mockAnswers[currentQItem.question.id] || ''}
                          onChange={(e) => handleSelectAnswer(currentQItem.question.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Navigation Buttons: Previous / Next */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex >= totalQuestions - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Sticky Examination Sidebar (Col span 1) */}
            <div className="lg:col-span-1 p-6 space-y-5 bg-slate-50/50 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Countdown Timer Box */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Time Remaining
                  </span>
                  <div className="flex items-center gap-2 text-indigo-900 font-black text-xl">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span>{assessment.exam.durationMinutes || 60}:00</span>
                  </div>
                </div>

                {/* Progress Bar Box */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Progress</span>
                    <span className="font-black text-indigo-600">
                      {answeredCount} / {totalQuestions}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{
                        width: totalQuestions > 0 ? `${(answeredCount / totalQuestions) * 100}%` : '0%'
                      }}
                    />
                  </div>
                </div>

                {/* Question Status Legend */}
                <div className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <span>Marked for Review ({flaggedIds.size})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                    <span>Not Answered ({totalQuestions - answeredCount})</span>
                  </div>
                </div>

                {/* Question Palette Grid (1..N clickable) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Question Navigator
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {flattenedQuestions.map((q, idx) => {
                      const isCurrent = currentIndex === idx;
                      const isAnswered = mockAnswers[q.question.id] !== undefined && mockAnswers[q.question.id] !== '';
                      const isFlagged = flaggedIds.has(q.question.id);

                      let bgClass = 'bg-white text-slate-700 border-slate-200 hover:border-slate-300';
                      if (isFlagged) {
                        bgClass = 'bg-amber-500 text-white border-amber-500 shadow-xs';
                      } else if (isAnswered) {
                        bgClass = 'bg-emerald-500 text-white border-emerald-500 shadow-xs';
                      }

                      return (
                        <button
                          key={q.question.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold border flex items-center justify-center transition-all ${bgClass} ${
                            isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Student Tools: Font size & Notepad */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-slate-400" />
                      <span>Text Size:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFontSize('normal')}
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          fontSize === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize('large')}
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          fontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotepad(!showNotepad)}
                    className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                    <span>{showNotepad ? 'Hide Scratchpad' : 'Open Scratchpad'}</span>
                  </button>

                  {showNotepad && (
                    <textarea
                      rows={3}
                      value={notepadText}
                      onChange={(e) => setNotepadText(e.target.value)}
                      placeholder="Rough scratch notes for this exam..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 resize-none leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
                    />
                  )}
                </div>
              </div>

              {/* Submit Exam Button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => alert(`Exam Submitted in Preview Mode! ${answeredCount} of ${totalQuestions} questions answered.`)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
