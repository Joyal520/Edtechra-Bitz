// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: EXAM BLUEPRINT SPECIFICATION MODAL
// Define curriculum metadata, question distribution matrix, and skill weighting
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
  BookOpen,
  PieChart
} from 'lucide-react';
import { ExamBlueprintConfig, ExamDifficulty } from '../../shared/ExamSchema';

interface ExamBlueprintModalProps {
  isOpen: boolean;
  initialBlueprint?: Partial<ExamBlueprintConfig>;
  onClose: () => void;
  onGenerateExam: (blueprint: ExamBlueprintConfig) => void;
}

export const ExamBlueprintModal: React.FC<ExamBlueprintModalProps> = ({
  isOpen,
  initialBlueprint,
  onClose,
  onGenerateExam
}) => {
  // Form State
  const [subject, setSubject] = useState(initialBlueprint?.subject || 'English Language');
  const [grade, setGrade] = useState(initialBlueprint?.grade || 'Grade 10');
  const [topic, setTopic] = useState(initialBlueprint?.topic || 'Unit 4: Environment & Global Citizenship');
  const [examType, setExamType] = useState(initialBlueprint?.examType || 'Unit Test');
  const [totalMarks, setTotalMarks] = useState(initialBlueprint?.totalMarks || 50);
  const [durationMinutes, setDurationMinutes] = useState(initialBlueprint?.durationMinutes || 60);
  const [passPercentage, setPassPercentage] = useState(initialBlueprint?.passPercentage || 50);
  const [difficulty, setDifficulty] = useState<ExamDifficulty>(initialBlueprint?.difficulty || 'Medium');
  const [sourceContent, setSourceContent] = useState(initialBlueprint?.sourceContent || '');

  // Question Distribution (Counts)
  const [distribution, setDistribution] = useState(
    initialBlueprint?.questionDistribution || {
      multipleChoice: 6,
      trueFalse: 4,
      fillInBlank: 4,
      shortAnswer: 3,
      reading: 1, // 1 reading passage activity (usually 3-5 subquestions)
      listening: 1, // 1 listening activity
      writing: 1, // 1 writing task
      pictureDescription: 0
    }
  );

  // Skill Weighting (%)
  const [skills, setSkills] = useState(
    initialBlueprint?.skillWeighting || {
      recall: 25,
      comprehension: 35,
      application: 25,
      analysis: 15
    }
  );

  const totalSkillPercent = useMemo(() => {
    return (
      (Number(skills.recall) || 0) +
      (Number(skills.comprehension) || 0) +
      (Number(skills.application) || 0) +
      (Number(skills.analysis) || 0)
    );
  }, [skills]);

  const totalCalculatedItems = useMemo(() => {
    return (
      (Number(distribution.multipleChoice) || 0) +
      (Number(distribution.trueFalse) || 0) +
      (Number(distribution.fillInBlank) || 0) +
      (Number(distribution.shortAnswer) || 0) +
      (Number(distribution.reading) || 0) +
      (Number(distribution.listening) || 0) +
      (Number(distribution.writing) || 0) +
      (Number(distribution.pictureDescription) || 0)
    );
  }, [distribution]);

  const handleUpdateDist = (key: keyof typeof distribution, val: number) => {
    setDistribution((prev) => ({
      ...prev,
      [key]: Math.max(0, val)
    }));
  };

  const handleUpdateSkill = (key: keyof typeof skills, val: number) => {
    setSkills((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, val))
    }));
  };

  const handleGenerate = () => {
    const config: ExamBlueprintConfig = {
      subject,
      grade,
      topic,
      examType,
      totalQuestions: totalCalculatedItems,
      totalMarks,
      durationMinutes,
      passPercentage,
      difficulty,
      questionDistribution: distribution,
      skillWeighting: skills,
      sourceContent: sourceContent.trim() || undefined
    };
    onGenerateExam(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Assessment Architecture
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Rigorous Blueprint Matrix</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Define Exam Blueprint & Question Distribution
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 bg-slate-50/30">
          {/* 1. General Exam Specifications */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>1. General Assessment Specification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. English Language"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Grade Level</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 (O/L)', 'A/L', 'General'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {['Unit Test', 'Mid Term', 'Final Exam', 'Term Test', 'Practice Test', 'O/L Practice', 'Diagnostic'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Easy">Easy (Foundation)</option>
                  <option value="Medium">Medium (Standard)</option>
                  <option value="Hard">Hard (Advanced)</option>
                  <option value="Mixed">Mixed (Balanced)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Topic / Syllabus Focus</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Grammar, Tenses & Reading Comprehension"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(5, parseInt(e.target.value) || 60))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Pass Mark Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={30}
                    max={80}
                    step={5}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 min-w-[50px] text-center">
                    {passPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Question & Activity Distribution Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Question & Activity Distribution Matrix</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Total Planned Items: <strong className="text-indigo-600">{totalCalculatedItems}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-700 block">Multiple Choice</label>
                <span className="text-[10px] text-slate-400 block mb-1.5">Objective 4-options</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={distribution.multipleChoice}
                  onChange={(e) => handleUpdateDist('multipleChoice', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-700 block">True / False</label>
                <span className="text-[10px] text-slate-400 block mb-1.5">Binary verification</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={distribution.trueFalse}
                  onChange={(e) => handleUpdateDist('trueFalse', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-700 block">Fill in the Blank</label>
                <span className="text-[10px] text-slate-400 block mb-1.5">Vocabulary gaps</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={distribution.fillInBlank}
                  onChange={(e) => handleUpdateDist('fillInBlank', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-700 block">Short Answer</label>
                <span className="text-[10px] text-slate-400 block mb-1.5">Sentences / definitions</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={distribution.shortAnswer}
                  onChange={(e) => handleUpdateDist('shortAnswer', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                />
              </div>

              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                <label className="text-[11px] font-bold text-teal-800 block">Reading Activities</label>
                <span className="text-[10px] text-teal-600 block mb-1.5">Passage + 4-5 Qs each</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={distribution.reading}
                  onChange={(e) => handleUpdateDist('reading', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-bold text-teal-900 text-center"
                />
              </div>

              <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100">
                <label className="text-[11px] font-bold text-violet-800 block">Listening Activities</label>
                <span className="text-[10px] text-violet-600 block mb-1.5">Audio + transcript + Qs</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={distribution.listening}
                  onChange={(e) => handleUpdateDist('listening', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-bold text-violet-900 text-center"
                />
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <label className="text-[11px] font-bold text-rose-800 block">Writing Tasks</label>
                <span className="text-[10px] text-rose-600 block mb-1.5">Letter / Essay / Notice</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={distribution.writing}
                  onChange={(e) => handleUpdateDist('writing', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-900 text-center"
                />
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <label className="text-[11px] font-bold text-amber-800 block">Picture Description</label>
                <span className="text-[10px] text-amber-600 block mb-1.5">Visual stimulus + Rubric</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={distribution.pictureDescription || 0}
                  onChange={(e) => handleUpdateDist('pictureDescription', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-900 text-center"
                />
              </div>
            </div>
          </div>

          {/* 3. Skill & Cognitive Weighting (Bloom's Taxonomy) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>3. Bloom's Taxonomy & Skill Weighting</span>
              </h3>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  totalSkillPercent === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                Total: {totalSkillPercent}% {totalSkillPercent === 100 ? '✓' : '(Should equal 100%)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Recall / Facts</span>
                  <span className="text-indigo-600">{skills.recall}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={skills.recall}
                  onChange={(e) => handleUpdateSkill('recall', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Definitions, terms, direct facts</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Comprehension</span>
                  <span className="text-indigo-600">{skills.comprehension}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={skills.comprehension}
                  onChange={(e) => handleUpdateSkill('comprehension', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Understanding passages & context</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Application</span>
                  <span className="text-indigo-600">{skills.application}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={skills.application}
                  onChange={(e) => handleUpdateSkill('application', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Sentence building & rules</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Analysis / Synthesis</span>
                  <span className="text-indigo-600">{skills.analysis}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={skills.analysis}
                  onChange={(e) => handleUpdateSkill('analysis', parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Inference & original writing</span>
              </div>
            </div>
          </div>

          {/* 4. Optional Teacher Context / Source Material */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              4. Source Material / Teacher Context Notes (Optional)
            </h3>
            <textarea
              rows={3}
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder="Paste lesson notes, textbook chapter excerpts, vocabulary lists, or curriculum standards to ground the questions in your exact course material..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Generate Examination from Blueprint</span>
          </button>
        </div>
      </div>
    </div>
  );
};
