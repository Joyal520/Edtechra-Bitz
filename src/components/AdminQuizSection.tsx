// ============================================================================
// EDTECHRA-BITZ: Admin Interactive Quizzes & Batch Import Section
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Loader2
} from 'lucide-react';
import {
  QuizBit,
  QuizAdminStats,
  QuizValidationResult
} from '@/types';
import { quizService } from '@/services/quizService';
import { useAuth } from '@/context/AuthContext';
import { validateQuizBatch } from '@/utils/quizValidation';
import { QUIZ_CONFIG, AI_QUIZ_PROMPT_TEMPLATE } from '@/utils/quizConfig';

export const AdminQuizSection: React.FC = () => {
  const { session } = useAuth();
  
  // Data state
  const [quizzes, setQuizzes] = useState<QuizBit[]>([]);
  const [stats, setStats] = useState<QuizAdminStats>({
    totalQuizzes: 0,
    publishedQuizzes: 0,
    unpublishedQuizzes: 0,
    totalAttempts: 0,
    totalXpAwarded: 0,
    totalBatches: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Batch import state
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<QuizValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [promptTopic, setPromptTopic] = useState<string>('Science, Technology, Space, and Curious Facts');
  const [promptCount, setPromptCount] = useState<number>(20);
  const [importPanelOpen, setImportPanelOpen] = useState<boolean>(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit Modal state
  const [editingQuiz, setEditingQuiz] = useState<QuizBit | null>(null);
  const [editForm, setEditForm] = useState<{
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    category: string;
    difficulty: string;
    xp: number;
    is_published: boolean;
  }>({
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    category: 'General',
    difficulty: 'Easy',
    xp: 10,
    is_published: true
  });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      const data = await quizService.getAdminQuizzes(
        {
          search: searchQuery,
          category: categoryFilter,
          difficulty: difficultyFilter,
          published: statusFilter
        },
        token
      );
      setQuizzes(data.quizzes);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading admin quizzes:', err);
      showToast(err.message || 'Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, searchQuery, categoryFilter, difficultyFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy AI Generator Prompt
  const handleCopyPrompt = () => {
    const prompt = AI_QUIZ_PROMPT_TEMPLATE
      .replace('{COUNT}', String(promptCount))
      .replace('{TOPIC}', promptTopic.trim() || 'General Science and Microlearning');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(() => {
        setCopiedPrompt(true);
        showToast('AI Quiz Prompt copied to clipboard! Paste it into ChatGPT or Claude.');
        setTimeout(() => setCopiedPrompt(false), 3000);
      });
    }
  };

  // Validate Pasted JSON
  const handleValidate = () => {
    if (!jsonInput.trim()) {
      showToast('Please paste quiz JSON data before validating.', 'error');
      return;
    }
    const result = validateQuizBatch(jsonInput);
    setValidationResult(result);

    if (result.invalid.length === 0 && result.valid.length > 0) {
      showToast(`All ${result.valid.length} quizzes passed validation! Ready to import.`);
    } else if (result.valid.length > 0) {
      showToast(`${result.valid.length} quizzes valid, ${result.invalid.length} contains errors.`, 'error');
    } else {
      showToast('Validation failed: No valid quizzes found in pasted JSON.', 'error');
    }
  };

  // Import Valid Quizzes
  const handleImportValidQuizzes = async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      showToast('Please validate your JSON first and ensure there are valid quizzes.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const token = session?.access_token || null;
      const result = await quizService.importBatch(validationResult.valid, token);
      showToast(`Successfully imported ${result.importedCount} quiz bit${result.importedCount === 1 ? '' : 's'}!`);
      
      // Reset import state
      setJsonInput('');
      setValidationResult(null);
      loadData();
    } catch (err: any) {
      console.error('Import error:', err);
      showToast(err.message || 'Failed to import quizzes.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Clear Import Form
  const handleClearImport = () => {
    setJsonInput('');
    setValidationResult(null);
  };

  // Toggle single quiz publication
  const handleTogglePublish = async (quiz: QuizBit) => {
    try {
      const token = session?.access_token || null;
      const updated = await quizService.togglePublish(quiz.id, !quiz.is_published, token);
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? updated : q)));
      setStats((prev) => ({
        ...prev,
        publishedQuizzes: prev.publishedQuizzes + (updated.is_published ? 1 : -1),
        unpublishedQuizzes: prev.unpublishedQuizzes + (updated.is_published ? -1 : 1)
      }));
      showToast(`Quiz ${updated.is_published ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  // Delete single quiz
  const handleDeleteQuiz = async (quiz: QuizBit) => {
    if (!window.confirm(`Are you sure you want to permanently delete this quiz:\n"${quiz.question}"?`)) {
      return;
    }

    try {
      const token = session?.access_token || null;
      await quizService.deleteQuiz(quiz.id, token);
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      showToast('Quiz deleted successfully.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete quiz.', 'error');
    }
  };

  // Batch toggle publish
  const handleBatchPublish = async (publish: boolean) => {
    if (selectedIds.size === 0) return;

    try {
      const token = session?.access_token || null;
      await quizService.batchPublish(Array.from(selectedIds), publish, token);
      showToast(`Updated publication status for ${selectedIds.size} quizzes.`);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update batch.', 'error');
    }
  };

  // Select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === quizzes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(quizzes.map((q) => q.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (quiz: QuizBit) => {
    setEditingQuiz(quiz);
    setEditForm({
      question: quiz.question,
      options: [...quiz.options],
      correct_answer: quiz.correct_answer || quiz.options[0] || '',
      explanation: quiz.explanation,
      category: quiz.category || 'General',
      difficulty: quiz.difficulty || 'Easy',
      xp: quiz.xp || 10,
      is_published: quiz.is_published
    });
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;

    if (!editForm.question.trim()) {
      alert('Question cannot be empty.');
      return;
    }
    if (editForm.options.some((opt) => !opt.trim())) {
      alert('All 4 options must be filled.');
      return;
    }
    if (!editForm.options.includes(editForm.correct_answer)) {
      alert('Correct answer must match one of the 4 options.');
      return;
    }
    if (!editForm.explanation.trim()) {
      alert('Explanation cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await quizService.updateQuiz(
        editingQuiz.id,
        {
          question: editForm.question.trim(),
          options: editForm.options.map((o) => o.trim()),
          correct_answer: editForm.correct_answer.trim(),
          explanation: editForm.explanation.trim(),
          category: editForm.category.trim(),
          difficulty: editForm.difficulty,
          xp: Number(editForm.xp) || 10,
          is_published: editForm.is_published
        },
        token
      );

      setQuizzes((prev) => prev.map((q) => (q.id === editingQuiz.id ? updated : q)));
      showToast('Quiz updated successfully.');
      setEditingQuiz(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update quiz.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section className="space-y-6 pt-4">
      
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Card with Actions */}
      <div className="bg-gradient-to-r from-[#0f233a] via-[#122e4d] to-[#026fc3] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[11px] font-black tracking-wider uppercase border border-teal-400/30">
              Interactive Learning
            </span>
            <span className="text-white/70 text-xs font-semibold">
              Feed Interleaving Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🎯</span>
            <span>Interactive Quiz Bits Center</span>
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Batch-import AI-generated multiple-choice questions, manage publication status, and reward students with confetti celebrations & XP directly inside the post feed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleCopyPrompt}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            title="Copy ChatGPT prompt to generate quizzes"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Prompt Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#026fc3]" />
                <span>Copy AI Quiz Prompt</span>
              </>
            )}
          </button>

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            title="Reload quiz records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid (6 Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Quizzes */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">Total Quizzes</div>
          <div className="text-xl font-black text-[#0f233a] mt-1">{stats.totalQuizzes}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">In database</div>
        </div>

        {/* Published */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs bg-emerald-50/20">
          <div className="text-xs font-bold text-emerald-700">Published</div>
          <div className="text-xl font-black text-emerald-900 mt-1">{stats.publishedQuizzes}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active in feed</div>
        </div>

        {/* Unpublished */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs bg-amber-50/20">
          <div className="text-xs font-bold text-amber-700">Draft / Hidden</div>
          <div className="text-xl font-black text-amber-900 mt-1">{stats.unpublishedQuizzes}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Not in feed</div>
        </div>

        {/* Total Student Attempts */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">Total Attempts</div>
          <div className="text-xl font-black text-[#026fc3] mt-1">{stats.totalAttempts}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">By students</div>
        </div>

        {/* Total XP Awarded */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">Quiz XP Awarded</div>
          <div className="text-xl font-black text-amber-600 mt-1">+{stats.totalXpAwarded} XP</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Earned by students</div>
        </div>

        {/* Import Batches */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">Import Batches</div>
          <div className="text-xl font-black text-purple-600 mt-1">{stats.totalBatches}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">ChatGPT batches</div>
        </div>
      </div>

      {/* 3. Batch Import Card */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f233a]">
                AI Quiz Batch Import (JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Paste structured JSON from ChatGPT or Claude to batch-import dozens of quizzes at once.
              </p>
            </div>
          </div>

          <button
            onClick={() => setImportPanelOpen(!importPanelOpen)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            {importPanelOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {importPanelOpen && (
          <div className="space-y-4 animate-in fade-in">
            {/* Prompt customization settings */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1 space-y-1 w-full sm:w-auto">
                <label className="font-extrabold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Prompt Topic Customizer:</span>
                </label>
                <input
                  type="text"
                  value={promptTopic}
                  onChange={(e) => setPromptTopic(e.target.value)}
                  placeholder="e.g. Space Exploration, Physics, Microorganisms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Questions Count:</label>
                  <select
                    value={promptCount}
                    onChange={(e) => setPromptCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value={10}>10 Quizzes</option>
                    <option value={20}>20 Quizzes</option>
                    <option value={30}>30 Quizzes</option>
                    <option value={50}>50 Quizzes</option>
                  </select>
                </div>

                <button
                  onClick={handleCopyPrompt}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </button>
              </div>
            </div>

            {/* JSON Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">Paste JSON Content:</label>
                <span className="text-slate-400 font-mono text-[11px]">
                  Format: {`{ "quizzes": [ ... ] }`}
                </span>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`Paste JSON here...\nExample:\n{\n  "quizzes": [\n    {\n      "question": "How many hearts does an octopus have?",\n      "options": ["1", "2", "3", "4"],\n      "correctAnswer": "3",\n      "explanation": "An octopus has three hearts.",\n      "category": "Science",\n      "difficulty": "Easy",\n      "xp": 10\n    }\n  ]\n}`}
                rows={7}
                className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Import Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Validate JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearImport}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {validationResult && validationResult.valid.length > 0 && (
                <button
                  type="button"
                  onClick={handleImportValidQuizzes}
                  disabled={isImporting}
                  className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import {validationResult.valid.length} Valid Quiz{validationResult.valid.length === 1 ? '' : 'zes'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Validation Feedback UI */}
            {validationResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <span className="text-slate-800">Validation Results:</span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      ✓ {validationResult.valid.length} Valid
                    </span>
                    {validationResult.invalid.length > 0 && (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-lg">
                        ✗ {validationResult.invalid.length} Errors
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    Total Detected: {validationResult.totalDetected}
                  </span>
                </div>

                {/* List invalid errors if any */}
                {validationResult.invalid.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-rose-800">Problematic Records:</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {validationResult.invalid.map((errItem, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                          <div className="font-extrabold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Record #{errItem.index}: {errItem.question}</span>
                          </div>
                          <ul className="list-disc list-inside mt-1 text-[11px] text-rose-700 pl-2">
                            {errItem.errors.map((msg, idx) => (
                              <li key={idx}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Records Preview Table */}
                {validationResult.valid.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h5 className="text-xs font-bold text-emerald-800">Valid Quizzes Ready for Import:</h5>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Question</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Difficulty</th>
                            <th className="py-2.5 px-3">XP</th>
                            <th className="py-2.5 px-3">Correct Answer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                          {validationResult.valid.map((q, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 max-w-xs truncate" title={q.question}>{q.question}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {q.category}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                  {q.difficulty}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[#026fc3] font-black">+{q.xp} XP</td>
                              <td className="py-2 px-3 text-emerald-700 font-bold truncate max-w-[140px]">{q.correctAnswer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Quiz Management & Directory Section */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-[#0f233a]">
              Manage Quiz Bits ({quizzes.length})
            </h3>
            <p className="text-xs text-slate-500">
              Filter by category, search by text, toggle published status, edit options, or remove outdated questions.
            </p>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-slate-600">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBatchPublish(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Publish
              </button>
              <button
                onClick={() => handleBatchPublish(false)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Unpublish
              </button>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question, explanation..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {QUIZ_CONFIG.VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Published Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="false">Draft / Hidden Only</option>
            </select>
          </div>
        </div>

        {/* Quizzes Table */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#026fc3] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading quiz bits...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50/50">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-700">No Quizzes Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No quiz bits match your current filter criteria or none have been imported yet. Use the Batch Import tool above to add quizzes!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === quizzes.length && quizzes.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Question & Options</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Difficulty</th>
                  <th className="py-3 px-3">XP</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Attempts</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {quizzes.map((quiz) => {
                  const isSelected = selectedIds.has(quiz.id);

                  return (
                    <tr key={quiz.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-brand-50/30' : ''}`}>
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(quiz.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-extrabold text-[#0f233a] leading-snug">
                          {quiz.question}
                        </div>

                        {/* Options pills */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(Array.isArray(quiz.options) ? quiz.options : []).map((opt, i) => {
                            const isCorrect = opt === quiz.correct_answer;
                            return (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isCorrect ? '✓ ' : ''}{opt}
                              </span>
                            );
                          })}
                        </div>

                        {/* Explanation snippet */}
                        {quiz.explanation && (
                          <p className="text-[11px] text-slate-500 font-normal mt-1 line-clamp-1 italic">
                            💡 {quiz.explanation}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {quiz.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          quiz.difficulty?.toLowerCase() === 'hard'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : quiz.difficulty?.toLowerCase() === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {quiz.difficulty || 'Easy'}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[#026fc3] font-black">
                        +{quiz.xp || 10} XP
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(quiz)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-colors cursor-pointer ${
                            quiz.is_published
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                          }`}
                          title="Click to toggle publication"
                        >
                          {quiz.is_published ? '● Published' : '○ Draft'}
                        </button>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {quiz.attempt_count || 0} attempts
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(quiz)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Edit Quiz"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteQuiz(quiz)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Edit Quiz Modal */}
      {editingQuiz && (
        <div
          onClick={() => setEditingQuiz(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#0f233a] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#026fc3]" />
                <span>Edit Quiz Bit</span>
              </h3>
              <button
                onClick={() => setEditingQuiz(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold">
              {/* Question */}
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Question Text:</label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 font-bold text-slate-800"
                  required
                />
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div className="space-y-2">
                <label className="text-slate-700 font-bold">Options (Select radio for correct answer):</label>
                <div className="space-y-2">
                  {(Array.isArray(editForm.options) ? editForm.options : ['', '', '', '']).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswerRadio"
                        checked={editForm.correct_answer === opt && opt.length > 0}
                        onChange={() => setEditForm({ ...editForm, correct_answer: opt })}
                        className="text-brand-600 focus:ring-brand-500 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...editForm.options];
                          const oldVal = newOpts[idx];
                          newOpts[idx] = e.target.value;
                          const newCorrect = editForm.correct_answer === oldVal ? e.target.value : editForm.correct_answer;
                          setEditForm({ ...editForm, options: newOpts, correct_answer: newCorrect });
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Educational Explanation:</label>
                <textarea
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 text-slate-800"
                  required
                />
              </div>

              {/* Category, Difficulty, XP */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-600 font-bold text-[11px]">Category:</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    {QUIZ_CONFIG.VALID_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-bold text-[11px]">Difficulty:</label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-bold text-[11px]">XP Reward:</label>
                  <input
                    type="number"
                    value={editForm.xp}
                    onChange={(e) => setEditForm({ ...editForm, xp: Number(e.target.value) })}
                    min={1}
                    max={100}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Published checkbox */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modalPublished"
                  checked={editForm.is_published}
                  onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="modalPublished" className="font-bold text-slate-700 cursor-pointer">
                  Published (Visible to students in feed)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white font-black rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
