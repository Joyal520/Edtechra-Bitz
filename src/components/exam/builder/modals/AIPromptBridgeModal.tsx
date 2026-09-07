// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: AI PROMPT BRIDGE MODAL
// Generates high-fidelity external prompts for ChatGPT/Gemini/Claude and
// parses AI JSON responses back into live examination structures.
// Architected for direct replacement with native EdTechra AI generation.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  Bot,
  Copy,
  Check,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { StandardExamInput } from '../../shared/assessmentBlueprints';
import { ExamSection } from '../../shared/ExamSchema';
import { validateExamJSON, ValidationResult } from '../../teacher/JSONValidator';

interface AIPromptBridgeModalProps {
  isOpen: boolean;
  input: StandardExamInput;
  onClose: () => void;
  onImportExam: (sections: ExamSection[], updatedExamMeta?: any) => void;
}

export const AIPromptBridgeModal: React.FC<AIPromptBridgeModalProps> = ({
  isOpen,
  input,
  onClose,
  onImportExam
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'paste'>('prompt');
  const [pasteText, setPasteText] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const generatedPrompt = useMemo(() => {
    const {
      subject = 'English Language',
      grade = 'Grade 10',
      topic = 'Simple Present Tense',
      lessonNotes = '',
      difficulty = 'Medium',
      durationMinutes = 45
    } = input;

    return `You are an expert educational assessment psychometrician and curriculum developer.

Your mission is to generate a comprehensive, pedagogically sound, and valid digital examination following EdTechra's Standard Assessment Blueprint.

================================================================================
ASSESSMENT PARAMETERS
================================================================================
- Subject: ${subject}
- Grade Level: ${grade}
- Topic: ${topic}
- Overall Difficulty: ${difficulty}
- Target Duration: ${durationMinutes} minutes
- Standard Pass Threshold: 50%

================================================================================
TEACHING CONTENT / SOURCE GROUNDING
================================================================================
${lessonNotes.trim() ? `"""\n${lessonNotes.trim()}\n"""` : 'Ground questions thoroughly in the standard curriculum guidelines for this topic and grade level.'}

================================================================================
REQUIRED ASSESSMENT BLUEPRINT & QUESTION DISTRIBUTION
================================================================================
You MUST construct a multi-section examination containing the following exact sections:

1. SECTION A: GRAMMAR & CORE LANGUAGE (8 to 10 Questions, 1 Mark each)
   - Multiple Choice (MCQ)
   - True / False
   - Fill in the Blank (with '[blank]' marker and accepted synonyms)
   - Sentence Completion
   - Error Correction (Identify and fix syntax/agreement errors)
   - Sentence Transformation (Rewrite without changing meaning)
   - Matching Pairs (3 distinct pairs)
   - Reorder / Sequence (Logical progression or scrambled sentence)

2. SECTION B: READING COMPREHENSION ACTIVITY (1 Passage, 4 Questions, 10 Marks total)
   - Passage: 150–200 words directly linked to the topic or provided notes.
   - Questions:
     * Q1: Direct factual retrieval (Multiple Choice, 2 marks)
     * Q2: Vocabulary in context (Short Answer, 2 marks)
     * Q3: Analytical inference (Multiple Choice, 3 marks)
     * Q4: Critical understanding (Short Answer, 3 marks)

3. SECTION C: LISTENING ACTIVITY (1 Audio Stimulus, 3 Questions, 10 Marks total)
   - Provide an authentic dialogue or monologue transcript between teacher and students.
   - Include 3 comprehension questions (MCQ, Fill in Blank, Short Answer) grounded in the transcript.

4. SECTION D: PICTURE DESCRIPTION & GUIDED WRITING (1 Writing Task, 10-15 Marks)
   - Provide a clear situational prompt describing a visual scene.
   - Writing task: 80–100 words applying the grammar concepts.
   - Assessment Rubric: Content (4), Vocabulary (4), Grammar (4), Organization (3).

================================================================================
OUTPUT FORMAT REQUIREMENTS (CRITICAL)
================================================================================
You MUST output ONLY a valid JSON object matching the EdTechra Canonical Assessment Schema (v2.0) below.
DO NOT wrap the response in conversational pleasantries. Output ONLY the JSON block.

\`\`\`json
{
  "schemaVersion": "2.0",
  "assessmentType": "exam",
  "exam": {
    "title": "${subject}: ${topic} Examination",
    "subject": "${subject}",
    "grade": "${grade}",
    "examType": "Standard Exam",
    "difficulty": "${difficulty}",
    "topic": "${topic}",
    "description": "Standard curriculum assessment covering Core Language, Reading, Listening, and Writing.",
    "instructions": "Attempt all questions. Review your answers before submitting.",
    "durationMinutes": ${durationMinutes},
    "passPercentage": 50
  },
  "sections": [
    {
      "id": "sec_1",
      "title": "Section A — Grammar & Core Language",
      "description": "Answer all objective questions testing grammatical precision.",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "Question text here?",
          "options": [
            { "id": "a", "text": "Correct option" },
            { "id": "b", "text": "Plausible distractor" },
            { "id": "c", "text": "Common misconception" },
            { "id": "d", "text": "Alternative distractor" }
          ],
          "correctAnswer": ["a"],
          "difficulty": "medium",
          "marks": 1,
          "required": true,
          "explanation": "Clear educational explanation."
        }
      ]
    },
    {
      "id": "sec_2",
      "title": "Section B — Reading Comprehension",
      "description": "Read the text carefully and answer the questions that follow.",
      "questions": [],
      "activities": [
        {
          "id": "act_reading_1",
          "activityType": "reading_activity",
          "title": "Reading Comprehension",
          "passage": "Rich contextual passage text here...",
          "questions": [
            {
              "id": "q_rc_1",
              "type": "multiple_choice",
              "question": "Comprehension question?",
              "options": [
                { "id": "a", "text": "Accurate answer" },
                { "id": "b", "text": "Distractor" }
              ],
              "correctAnswer": ["a"],
              "difficulty": "medium",
              "marks": 2,
              "required": true,
              "explanation": "Explanation from passage."
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Generate the full, complete examination JSON now:`;
  }, [input]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleValidatePaste = () => {
    if (!pasteText.trim()) return;
    const result = validateExamJSON(pasteText);
    setValidationResult(result);
  };

  const handleImport = () => {
    if (!validationResult?.isValid || !validationResult.parsedExam) {
      handleValidatePaste();
      return;
    }
    const { sections, exam } = validationResult.parsedExam;
    onImportExam(sections, exam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  AI Prompt Bridge
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">ChatGPT • Claude • Gemini</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                AI Examination Generator
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

        {/* Tab Switcher: 1. Generate Prompt | 2. Paste AI Exam */}
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-4 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'prompt'
                ? 'text-purple-700 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Copy AI Exam Prompt
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'text-purple-700 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Paste AI Exam</span>
            {validationResult?.isValid && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {activeTab === 'prompt' ? (
            <div className="space-y-4">
              {/* Instructions Banner */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-purple-950">
                    How to use this AI Exam Prompt
                  </div>
                  <p className="leading-relaxed">
                    1. Click <strong>Copy Prompt</strong> below.<br />
                    2. Paste it into <strong>ChatGPT, Gemini, Claude</strong>, or your preferred AI tool.<br />
                    3. Copy the JSON generated by the AI and click <strong>Paste AI Exam</strong> above to import it directly into your exam builder.
                  </p>
                </div>
              </div>

              {/* Prompt Text Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    AI EXAM PROMPT ({generatedPrompt.length} characters)
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-50 border border-slate-300 rounded-2xl text-[11px] font-mono text-slate-900 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed shadow-inner select-all">
                  {generatedPrompt}
                </pre>
              </div>

              {/* Next Step Shortcut */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ready to import? Go to Paste AI Exam</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Paste AI Response (JSON)
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setPasteText(text);
                        const res = validateExamJSON(text);
                        setValidationResult(res);
                      }
                    } catch {}
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              <textarea
                rows={10}
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setValidationResult(null);
                }}
                placeholder="Paste the JSON response from ChatGPT, Gemini, or Claude here (including or excluding ```json code fences)..."
                className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 leading-relaxed resize-y"
              />

              {/* Validation Feedback */}
              {validationResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                    validationResult.isValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {validationResult.isValid
                          ? 'Valid EdTechra Assessment JSON'
                          : `Validation Found Issues (${validationResult.errors.length})`}
                      </span>
                    </div>

                    {validationResult.stats && (
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {validationResult.stats.questionCount} Questions • {validationResult.stats.sectionCount} Sections
                      </span>
                    )}
                  </div>

                  {validationResult.errors.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 font-medium">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Designed to seamlessly transition to native EdTechra AI generation.
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'paste' ? (
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={handleImport}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              >
                <span>Import Into Live Exam Cards</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
