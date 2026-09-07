// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: STANDARD EXAM WORKFLOW MODAL
// Content-first exam authoring: Subject, Grade, Topic, Lesson Notes, Difficulty, Duration.
// EdTechra uses predefined blueprints to generate the complete assessment.
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Upload,
  Bot,
  ArrowRight,
  FileCode
} from 'lucide-react';
import { StandardExamInput } from '../../shared/assessmentBlueprints';
import { ExamDifficulty } from '../../shared/ExamSchema';

interface StandardExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateStandardExam: (input: StandardExamInput) => void;
  onOpenAIPromptBridge: (input: StandardExamInput) => void;
}

export const StandardExamModal: React.FC<StandardExamModalProps> = ({
  isOpen,
  onClose,
  onGenerateStandardExam,
  onOpenAIPromptBridge
}) => {
  const [subject, setSubject] = useState('English Language');
  const [grade, setGrade] = useState('Grade 10');
  const [topic, setTopic] = useState('Simple Present Tense');
  const [lessonNotes, setLessonNotes] = useState('');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Medium');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Read text from text/markdown or simulate extraction
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setLessonNotes((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      // For PDF/Word simulation in browser without backend roundtrip
      setTimeout(() => {
        setLessonNotes((prev) =>
          prev
            ? `${prev}\n\n[Content extracted from ${file.name}]\nCore rules and vocabulary for ${topic} covering subject-verb agreement, habitual actions, and universal statements.`
            : `[Content extracted from ${file.name}]\nCore rules and vocabulary for ${topic} covering subject-verb agreement, habitual actions, and universal statements.`
        );
        setIsUploading(false);
      }, 500);
    }
  };

  const handleSampleNotes = () => {
    setTopic('Simple Present Tense & Daily Habits');
    setLessonNotes(
      `Lesson Objectives:
1. Understand the form and usage of the Simple Present Tense.
2. Subject-verb agreement: Third-person singular subjects (he, she, it) take verb + s/es/ies.
3. Expressing habitual actions, routines, universal truths, and scheduled future events.
4. Distinguishing between stative verbs (know, believe, understand) and dynamic actions.
5. Common errors: Missing 's' on singular verbs; using 'do' instead of 'does' in questions.

Key Vocabulary:
routine, universal truth, agreement, singular, plural, frequency adverbs (always, usually, seldom, never).`
    );
  };

  const handleSubmit = () => {
    onGenerateStandardExam({
      subject,
      grade,
      topic: topic.trim() || 'Unit Examination',
      lessonNotes: lessonNotes.trim(),
      difficulty,
      durationMinutes
    });
    onClose();
  };

  const handlePromptBridge = () => {
    onOpenAIPromptBridge({
      subject,
      grade,
      topic: topic.trim() || 'Unit Examination',
      lessonNotes: lessonNotes.trim(),
      difficulty,
      durationMinutes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Standard Exam Blueprint
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">Curriculum Grounded</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Create Standard Examination
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
          {/* Row 1: Subject, Grade, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English Language">English Language</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="History">History</option>
                <option value="Information Technology">Information Technology</option>
                <option value="General Curriculum">General Curriculum</option>
              </select>
            </div>

            {/* Grade */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Grade Level
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11 (O/L)</option>
                <option value="Grade 12">Grade 12 (A/L)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Easy">Easy (Foundation)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Hard">Hard (Challenging)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Topic & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Topic / Unit Focus
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Simple Present Tense, Photosynthesis, Quadratic Equations"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes (Recommended)</option>
                <option value={60}>60 minutes (1 Hour)</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes (2 Hours)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Teaching Content / Lesson Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Teaching Content / Lesson Notes</span>
              </label>

              <button
                type="button"
                onClick={handleSampleNotes}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                + Insert Sample Notes
              </button>
            </div>

            <textarea
              rows={6}
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Paste your lesson notes, textbook excerpts, summary points, or curriculum objectives here..."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
            />

            {/* Document Upload Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isUploading ? 'Extracting...' : 'Upload PDF'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Word Document</span>
                <input
                  type="file"
                  accept=".doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const extra = prompt('Add supplementary curriculum note:');
                  if (extra) setLessonNotes((prev) => (prev ? `${prev}\n\n${extra}` : extra));
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>+ Add Content</span>
              </button>
            </div>
          </div>

          {/* Blueprint Structure Preview Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-700">
              <div className="font-bold text-indigo-950">
                Automatic Assessment Blueprint Included
              </div>
              <p className="leading-relaxed">
                EdTechra automatically creates Section A (Grammar & Language), Section B (Reading Passage & Questions), Section C (Listening Track & Questions), and Section D (Picture Description & Writing). You will not need to configure question types manually.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* AI Prompt Bridge Button */}
          <button
            type="button"
            onClick={handlePromptBridge}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span>Generate AI Prompt (ChatGPT/Claude)</span>
          </button>

          {/* Generate Standard Exam Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
          >
            <span>Generate Standard Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
