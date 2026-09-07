// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: O/L STYLE EXAM WORKFLOW MODAL
// Specialized national curriculum practice simulator (Grammar, Vocabulary, Reading,
// Picture Description, Guided Writing, Listening).
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  FileText,
  Upload,
  Bot,
  ArrowRight,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { StandardExamInput } from '../../shared/assessmentBlueprints';
import { ExamDifficulty } from '../../shared/ExamSchema';

interface OLStyleExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateOLExam: (input: StandardExamInput) => void;
  onOpenAIPromptBridge: (input: StandardExamInput) => void;
}

export const OLStyleExamModal: React.FC<OLStyleExamModalProps> = ({
  isOpen,
  onClose,
  onGenerateOLExam,
  onOpenAIPromptBridge
}) => {
  const [subject, setSubject] = useState('English Language');
  const [grade, setGrade] = useState('Grade 10');
  const [topic, setTopic] = useState('Grammar Mechanics & Functional Writing');
  const [lessonNotes, setLessonNotes] = useState('');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Medium');
  const [durationMinutes, setDurationMinutes] = useState(60);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setLessonNotes((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
    };
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      setLessonNotes((prev) =>
        prev
          ? `${prev}\n\n[Uploaded O/L Syllabus Document: ${file.name}]`
          : `[Uploaded O/L Syllabus Document: ${file.name}]`
      );
    }
  };

  const handleSampleOLNotes = () => {
    setTopic('O/L English Revision: Prepositions, Passive Voice & Formal Notices');
    setLessonNotes(
      `Syllabus Coverage for G.C.E. O/L English Practice:
- Test 1: Appropriate prepositions in authentic contexts (at, on, in, through, for).
- Test 2: Matching daily situations with polite spoken responses.
- Test 3: Subject-verb concord and auxiliary verbs.
- Test 4: Transformation into passive voice.
- Test 5: Reading comprehension on Sri Lanka's historical/environmental heritage.
- Test 6: Picture description with standard 4-trait rubric (Content, Vocabulary, Grammar, Organization).
- Test 7: Guided formal notice writing for school associations.
- Test 8: Public announcement listening comprehension.`
    );
  };

  const handleSubmit = () => {
    onGenerateOLExam({
      subject,
      grade,
      topic: topic.trim() || 'O/L English Practice Test',
      lessonNotes: lessonNotes.trim(),
      difficulty,
      durationMinutes,
      totalMarks: 60
    });
    onClose();
  };

  const handlePromptBridge = () => {
    onOpenAIPromptBridge({
      subject,
      grade,
      topic: topic.trim() || 'O/L English Practice Test',
      lessonNotes: lessonNotes.trim(),
      difficulty,
      durationMinutes,
      totalMarks: 60
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Curriculum Practice
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">O/L Style Examination</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Create O/L Style Exam
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar space-y-5 bg-white">
          {/* Official Disclaimer Alert */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-700">
              <div className="font-bold text-amber-950">
                O/L Practice Examination Standard
              </div>
              <p className="leading-relaxed">
                This examination structure is curated as an <strong>O/L Style Practice Paper</strong>. It models official Sri Lankan examination formats (Grammar, Vocabulary, Reading, Picture Description, Guided Writing, and Listening) to prepare students thoroughly for national assessments.
              </p>
            </div>
          </div>

          {/* Row 1: Subject, Grade, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="English Language">English Language</option>
                <option value="Science">Science (O/L Style)</option>
                <option value="Mathematics">Mathematics (O/L Style)</option>
                <option value="History">History (O/L Style)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Target Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Grade 10">Grade 10 (Foundation)</option>
                <option value="Grade 11">Grade 11 (O/L Examination Year)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Target Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Easy">Foundation (Pass Level)</option>
                <option value="Medium">Standard O/L Exam Level</option>
                <option value="Hard">Advanced / Distinction (A) Level</option>
              </select>
            </div>
          </div>

          {/* Row 2: Topic & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Syllabus Topic / Unit
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Grammar Mechanics & Functional Writing"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 Hour — Standard)</option>
                <option value={90}>90 minutes (Full Paper 1 & 2)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Notes / Syllabus content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Syllabus Notes / Reference Material</span>
              </label>

              <button
                type="button"
                onClick={handleSampleOLNotes}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                + Insert O/L Syllabus Blueprint
              </button>
            </div>

            <textarea
              rows={5}
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Paste specific vocabulary lists, reading topics, or grammar focus points for this O/L practice exam..."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-y"
            />

            <div className="flex items-center gap-2 pt-1">
              <label className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload Syllabus PDF</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload Word Document</span>
                <input
                  type="file"
                  accept=".doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePromptBridge}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span>Generate O/L AI Prompt</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
          >
            <span>Generate O/L Style Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
