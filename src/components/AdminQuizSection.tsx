// ============================================================================
// EDTECHRA-BITZ: Admin Interactive Quizzes, Spelling Scramble & Spelling Flip Card Section
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Clock,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  QuizBit,
  QuizAdminStats,
  QuizValidationResult
} from '@/types';
import {
  SpellingScramble,
  SpellingScrambleAdminStats,
  SpellingScrambleValidationResult,
  SpellingDifficulty
} from '@/types/spellingScramble';
import {
  SpellingFlipCardItem,
  SpellingFlipAdminStats,
  SpellingFlipValidationResult,
  SpellingFlipLevel
} from '@/types/spellingFlipCard';
import { quizService } from '@/services/quizService';
import { spellingScrambleService } from '@/services/spellingScrambleService';
import { spellingFlipCardService } from '@/services/spellingFlipCardService';
import { useAuth } from '@/context/AuthContext';
import { validateQuizBatch } from '@/utils/quizValidation';
import { validateSpellingScrambleBatch } from '@/utils/spellingScrambleValidation';
import { validateSpellingFlipBatch } from '@/utils/spellingFlipValidation';
import {
  AI_QUIZ_PROMPT_TEMPLATE,
  AI_SPELLING_SCRAMBLE_PROMPT_TEMPLATE
} from '@/utils/quizConfig';

const AI_SPELLING_FLIP_PROMPT_TEMPLATE = `Please generate {COUNT} English spelling words for the Spelling Flip Card memory game on the topic: "{TOPIC}".

Format as clean CSV (no markdown):
word,level,category

Rules:
- Easy: 3–5 letters (Grades 3–5)
- Intermediate: 6–8 letters (Grades 6–8)
- Hard: 9–12 letters (Grades 9–12)
`;

export const AdminQuizSection: React.FC = () => {
  const { session } = useAuth();

  // Activity Type Selector: 'quiz' | 'spelling' | 'spelling_flip'
  const [contentType, setContentType] = useState<'quiz' | 'spelling' | 'spelling_flip'>('quiz');

  // --------------------------------------------------------------------------
  // Quiz Data & State
  // --------------------------------------------------------------------------
  const [quizzes, setQuizzes] = useState<QuizBit[]>([]);
  const [quizStats, setQuizStats] = useState<QuizAdminStats>({
    totalQuizzes: 0,
    publishedQuizzes: 0,
    unpublishedQuizzes: 0,
    totalAttempts: 0,
    totalXpAwarded: 0,
    totalBatches: 0
  });

  // --------------------------------------------------------------------------
  // Spelling Scramble Data & State
  // --------------------------------------------------------------------------
  const [scrambles, setScrambles] = useState<SpellingScramble[]>([]);
  const [spellingStats, setSpellingStats] = useState<SpellingScrambleAdminStats>({
    totalScrambles: 0,
    publishedScrambles: 0,
    draftScrambles: 0,
    totalCompletions: 0,
    totalXpAwarded: 0
  });

  // --------------------------------------------------------------------------
  // Spelling Flip Card Data & State
  // --------------------------------------------------------------------------
  const [flipCards, setFlipCards] = useState<SpellingFlipCardItem[]>([]);
  const [flipStats, setFlipStats] = useState<SpellingFlipAdminStats>({
    totalCards: 0,
    publishedCards: 0,
    draftCards: 0,
    totalCompletions: 0,
    totalXpAwarded: 0
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
  const [quizValidationResult, setQuizValidationResult] = useState<QuizValidationResult | null>(null);
  const [spellingValidationResult, setSpellingValidationResult] = useState<SpellingScrambleValidationResult | null>(null);
  const [flipValidationResult, setFlipValidationResult] = useState<SpellingFlipValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [promptTopic, setPromptTopic] = useState<string>('Science, Technology, Space, and Curious Facts');
  const [promptCount, setPromptCount] = useState<number>(20);
  const [spellingDifficultyPrompt, setSpellingDifficultyPrompt] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Mixed');
  const [importPanelOpen, setImportPanelOpen] = useState<boolean>(true);

  // Edit Modal state for Quiz
  const [editingQuiz, setEditingQuiz] = useState<QuizBit | null>(null);
  const [editQuizForm, setEditQuizForm] = useState<{
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

  // Edit Modal state for Spelling Scramble
  const [editingScramble, setEditingScramble] = useState<SpellingScramble | null>(null);
  const [editScrambleForm, setEditScrambleForm] = useState<{
    word: string;
    clue: string;
    category: string;
    difficulty: SpellingDifficulty;
    xp: number;
    is_published: boolean;
  }>({
    word: '',
    clue: '',
    category: 'Vocabulary',
    difficulty: 'Easy',
    xp: 10,
    is_published: true
  });

  // Edit Modal state for Spelling Flip Card
  const [editingFlipCard, setEditingFlipCard] = useState<SpellingFlipCardItem | null>(null);
  const [editFlipForm, setEditFlipForm] = useState<{
    word: string;
    level: SpellingFlipLevel;
    category: string;
    is_published: boolean;
  }>({
    word: '',
    level: 'easy',
    category: 'General',
    is_published: true
  });

  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Load Data for current content type
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      if (contentType === 'quiz') {
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
        setQuizStats(data.stats);
      } else if (contentType === 'spelling') {
        const data = await spellingScrambleService.getAdminScrambles(
          {
            search: searchQuery,
            category: categoryFilter,
            difficulty: difficultyFilter,
            published: statusFilter
          },
          token
        );
        setScrambles(data.scrambles);
        setSpellingStats(data.stats);
      } else {
        const data = await spellingFlipCardService.getAdminCards(
          {
            search: searchQuery,
            category: categoryFilter,
            level: difficultyFilter,
            status: statusFilter === 'published' ? 'published' : statusFilter === 'draft' ? 'draft' : 'all'
          },
          token
        );
        setFlipCards(data.cards);
        setFlipStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error loading admin content:', err);
      showToast(err.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, contentType, searchQuery, categoryFilter, difficultyFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Type Change
  const handleContentTypeChange = (newType: 'quiz' | 'spelling' | 'spelling_flip') => {
    setContentType(newType);
    setJsonInput('');
    setQuizValidationResult(null);
    setSpellingValidationResult(null);
    setFlipValidationResult(null);
    setSearchQuery('');
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setStatusFilter('all');
    if (newType === 'spelling_flip') {
      setPromptTopic('Animals, Science, Everyday Objects, Technology');
    } else if (newType === 'spelling') {
      setPromptTopic('English Vocabulary, Science, Nature, and Daily Life');
    } else {
      setPromptTopic('Science, Technology, Space, and Curious Facts');
    }
  };

  // Copy AI Generator Prompt
  const handleCopyPrompt = () => {
    let prompt = '';
    if (contentType === 'quiz') {
      prompt = AI_QUIZ_PROMPT_TEMPLATE
        .replace('{COUNT}', String(promptCount))
        .replace('{TOPIC}', promptTopic.trim() || 'General Science and Microlearning');
    } else if (contentType === 'spelling') {
      prompt = AI_SPELLING_SCRAMBLE_PROMPT_TEMPLATE
        .replace('{COUNT}', String(promptCount))
        .replace('{TOPIC}', promptTopic.trim() || 'English Vocabulary, Everyday Objects, and Science')
        .replace('{DIFFICULTY}', spellingDifficultyPrompt);
    } else {
      prompt = AI_SPELLING_FLIP_PROMPT_TEMPLATE
        .replace('{COUNT}', String(promptCount))
        .replace('{TOPIC}', promptTopic.trim() || 'Animals, Science, Everyday, and Technology');
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(() => {
        setCopiedPrompt(true);
        showToast(`AI Prompt copied to clipboard!`);
        setTimeout(() => setCopiedPrompt(false), 3000);
      });
    }
  };

  // Validate Input (CSV or JSON)
  const handleValidate = () => {
    if (!jsonInput.trim()) {
      showToast('Please paste content before validating.', 'error');
      return;
    }

    if (contentType === 'quiz') {
      const result = validateQuizBatch(jsonInput);
      setQuizValidationResult(result);

      if (result.invalid.length === 0 && result.valid.length > 0) {
        showToast(`All ${result.valid.length} quizzes passed validation! Ready to import.`);
      } else if (result.valid.length > 0) {
        showToast(`${result.valid.length} quizzes valid, ${result.invalid.length} contains errors.`, 'error');
      } else {
        showToast('Validation failed: No valid quizzes found.', 'error');
      }
    } else if (contentType === 'spelling') {
      const result = validateSpellingScrambleBatch(jsonInput);
      setSpellingValidationResult(result);

      if (result.invalid.length === 0 && result.valid.length > 0) {
        showToast(`All ${result.valid.length} spelling scrambles passed validation! Ready to import.`);
      } else if (result.valid.length > 0) {
        showToast(`${result.valid.length} scrambles valid, ${result.invalid.length} contains errors.`, 'error');
      } else {
        showToast('Validation failed: No valid spelling scrambles found.', 'error');
      }
    } else {
      const result = validateSpellingFlipBatch(jsonInput);
      setFlipValidationResult(result);

      if (result.invalid.length === 0 && result.valid.length > 0) {
        showToast(`All ${result.valid.length} spelling flip words passed validation! Ready to import.`);
      } else if (result.valid.length > 0) {
        showToast(`${result.valid.length} words valid, ${result.invalid.length} rows have errors.`, 'error');
      } else {
        showToast('Validation failed: No valid words found. Check word lengths per level.', 'error');
      }
    }
  };

  // Import Valid Items
  const handleImportValidBatch = async () => {
    if (contentType === 'quiz') {
      if (!quizValidationResult || quizValidationResult.valid.length === 0) {
        showToast('Please validate your JSON first and ensure there are valid quizzes.', 'error');
        return;
      }

      setIsImporting(true);
      try {
        const token = session?.access_token || null;
        const result = await quizService.importBatch(quizValidationResult.valid, token);
        showToast(`Successfully imported ${result.importedCount} quiz bit${result.importedCount === 1 ? '' : 's'}!`);
        setJsonInput('');
        setQuizValidationResult(null);
        loadData();
      } catch (err: any) {
        showToast(err.message || 'Failed to import quizzes.', 'error');
      } finally {
        setIsImporting(false);
      }
    } else if (contentType === 'spelling') {
      if (!spellingValidationResult || spellingValidationResult.valid.length === 0) {
        showToast('Please validate your JSON first and ensure there are valid spelling scrambles.', 'error');
        return;
      }

      setIsImporting(true);
      try {
        const token = session?.access_token || null;
        const result = await spellingScrambleService.importBatch(spellingValidationResult.valid, token);
        showToast(`Successfully imported ${result.importedCount} spelling scramble${result.importedCount === 1 ? '' : 's'}!`);
        setJsonInput('');
        setSpellingValidationResult(null);
        loadData();
      } catch (err: any) {
        showToast(err.message || 'Failed to import spelling scrambles.', 'error');
      } finally {
        setIsImporting(false);
      }
    } else {
      if (!flipValidationResult || flipValidationResult.valid.length === 0) {
        showToast('Please validate your batch first and ensure there are valid words.', 'error');
        return;
      }

      setIsImporting(true);
      try {
        const token = session?.access_token || null;
        const result = await spellingFlipCardService.importBatch(flipValidationResult.valid, token);
        showToast(`Successfully imported ${result.importedCount} spelling flip card${result.importedCount === 1 ? '' : 's'}!`);
        setJsonInput('');
        setFlipValidationResult(null);
        loadData();
      } catch (err: any) {
        showToast(err.message || 'Failed to import spelling flip cards.', 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  // Clear Import Form
  const handleClearImport = () => {
    setJsonInput('');
    setQuizValidationResult(null);
    setSpellingValidationResult(null);
    setFlipValidationResult(null);
  };

  // --------------------------------------------------------------------------
  // Quiz Actions
  // --------------------------------------------------------------------------
  const handleToggleQuizPublish = async (quiz: QuizBit) => {
    try {
      const token = session?.access_token || null;
      const updated = await quizService.togglePublish(quiz.id, !quiz.is_published, token);
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? updated : q)));
      showToast(`Quiz ${updated.is_published ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  const handleDeleteQuiz = async (quiz: QuizBit) => {
    if (!window.confirm(`Permanently delete quiz:\n"${quiz.question}"?`)) return;
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

  const handleOpenEditQuizModal = (quiz: QuizBit) => {
    setEditingQuiz(quiz);
    setEditQuizForm({
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

  const handleSaveQuizEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;
    if (!editQuizForm.question.trim()) {
      alert('Question cannot be empty.');
      return;
    }
    if (editQuizForm.options.some((opt) => !opt.trim())) {
      alert('All 4 options must be filled.');
      return;
    }
    if (!editQuizForm.options.includes(editQuizForm.correct_answer)) {
      alert('Correct answer must match one of the 4 options.');
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await quizService.updateQuiz(
        editingQuiz.id,
        {
          question: editQuizForm.question.trim(),
          options: editQuizForm.options.map((o) => o.trim()),
          correct_answer: editQuizForm.correct_answer.trim(),
          explanation: editQuizForm.explanation.trim(),
          category: editQuizForm.category.trim(),
          difficulty: editQuizForm.difficulty,
          xp: Number(editQuizForm.xp) || 10,
          is_published: editQuizForm.is_published
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

  // --------------------------------------------------------------------------
  // Spelling Scramble Actions
  // --------------------------------------------------------------------------
  const handleToggleScramblePublish = async (scramble: SpellingScramble) => {
    try {
      const token = session?.access_token || null;
      const nextPub = !scramble.is_published;
      await spellingScrambleService.togglePublish(scramble.id, nextPub, token);
      setScrambles((prev) =>
        prev.map((s) => (s.id === scramble.id ? { ...s, is_published: nextPub } : s))
      );
      showToast(`Spelling scramble ${nextPub ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  const handleDeleteScramble = async (scramble: SpellingScramble) => {
    if (!window.confirm(`Permanently delete spelling scramble: "${scramble.word}"?`)) return;
    try {
      const token = session?.access_token || null;
      await spellingScrambleService.deleteScramble(scramble.id, token);
      setScrambles((prev) => prev.filter((s) => s.id !== scramble.id));
      showToast('Spelling scramble deleted successfully.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete spelling scramble.', 'error');
    }
  };

  const handleOpenEditScrambleModal = (scramble: SpellingScramble) => {
    setEditingScramble(scramble);
    setEditScrambleForm({
      word: scramble.word,
      clue: scramble.clue,
      category: scramble.category || 'Vocabulary',
      difficulty: scramble.difficulty || 'Easy',
      xp: scramble.xp || (scramble.difficulty === 'Hard' ? 20 : scramble.difficulty === 'Medium' ? 15 : 10),
      is_published: scramble.is_published
    });
  };

  const handleSaveScrambleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScramble) return;
    const word = editScrambleForm.word.trim().toUpperCase();
    if (!word || !/^[A-Z]+$/.test(word) || word.length < 3) {
      alert('Word must contain at least 3 letters A-Z without spaces.');
      return;
    }
    if (!editScrambleForm.clue.trim()) {
      alert('Clue cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await spellingScrambleService.updateScramble(
        editingScramble.id,
        {
          word,
          clue: editScrambleForm.clue.trim(),
          category: editScrambleForm.category.trim(),
          difficulty: editScrambleForm.difficulty,
          xp: Number(editScrambleForm.xp) || 10,
          is_published: editScrambleForm.is_published
        },
        token
      );
      setScrambles((prev) => prev.map((s) => (s.id === editingScramble.id ? updated : s)));
      showToast('Spelling scramble updated successfully.');
      setEditingScramble(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update spelling scramble.');
    } finally {
      setSavingEdit(false);
    }
  };

  // --------------------------------------------------------------------------
  // Spelling Flip Card Actions
  // --------------------------------------------------------------------------
  const handleToggleFlipPublish = async (card: SpellingFlipCardItem) => {
    try {
      const token = session?.access_token || null;
      const nextPub = !card.is_published;
      await spellingFlipCardService.togglePublish(card.id, nextPub, token);
      setFlipCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, is_published: nextPub } : c))
      );
      showToast(`Spelling flip card ${nextPub ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  const handleDeleteFlipCard = async (card: SpellingFlipCardItem) => {
    if (!window.confirm(`Permanently delete spelling flip card: "${card.word}"?`)) return;
    try {
      const token = session?.access_token || null;
      await spellingFlipCardService.deleteCard(card.id, token);
      setFlipCards((prev) => prev.filter((c) => c.id !== card.id));
      showToast('Spelling flip card deleted successfully.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete spelling flip card.', 'error');
    }
  };

  const handleOpenEditFlipModal = (card: SpellingFlipCardItem) => {
    setEditingFlipCard(card);
    setEditFlipForm({
      word: card.word,
      level: card.level,
      category: card.category || 'General',
      is_published: card.is_published
    });
  };

  const handleSaveFlipEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlipCard) return;
    const word = editFlipForm.word.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const level = editFlipForm.level;

    if (!word) {
      alert('Word cannot be empty.');
      return;
    }

    const len = word.length;
    if (level === 'easy' && (len < 3 || len > 5)) {
      alert(`Easy level requires 3–5 letters. "${word}" has ${len} letters.`);
      return;
    }
    if (level === 'intermediate' && (len < 6 || len > 8)) {
      alert(`Intermediate level requires 6–8 letters. "${word}" has ${len} letters.`);
      return;
    }
    if (level === 'hard' && (len < 9 || len > 12)) {
      alert(`Hard level requires 9–12 letters. "${word}" has ${len} letters.`);
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await spellingFlipCardService.updateCard(
        editingFlipCard.id,
        {
          word,
          level,
          category: editFlipForm.category.trim() || 'General',
          is_published: editFlipForm.is_published
        },
        token
      );
      setFlipCards((prev) => prev.map((c) => (c.id === editingFlipCard.id ? updated : c)));
      showToast('Spelling flip card updated successfully.');
      setEditingFlipCard(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update spelling flip card.');
    } finally {
      setSavingEdit(false);
    }
  };

  const activeValidCount =
    contentType === 'quiz'
      ? quizValidationResult?.valid.length || 0
      : contentType === 'spelling'
      ? spellingValidationResult?.valid.length || 0
      : flipValidationResult?.valid.length || 0;

  const activeInvalidCount =
    contentType === 'quiz'
      ? quizValidationResult?.invalid.length || 0
      : contentType === 'spelling'
      ? spellingValidationResult?.invalid.length || 0
      : flipValidationResult?.invalid.length || 0;

  const activeInvalidList =
    contentType === 'quiz'
      ? quizValidationResult?.invalid || []
      : contentType === 'spelling'
      ? spellingValidationResult?.invalid || []
      : flipValidationResult?.invalid || [];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-sm font-semibold animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
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

      {/* 1. Header Card with Content Type Selector */}
      <div className="bg-gradient-to-r from-[#0f233a] via-[#122e4d] to-[#026fc3] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[11px] font-black tracking-wider uppercase border border-teal-400/30">
              Interactive Microlearning
            </span>
            <span className="text-white/70 text-xs font-semibold">
              AI Batch Pipeline
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>{contentType === 'quiz' ? '🎯' : contentType === 'spelling' ? '🔠' : '🃏'}</span>
            <span>
              {contentType === 'quiz'
                ? 'Interactive Quiz Bits Center'
                : contentType === 'spelling'
                ? 'Spelling Scramble Center'
                : 'Spelling Flip Card Center'}
            </span>
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            {contentType === 'quiz'
              ? 'Batch-import AI-generated multiple-choice questions with 4 options, explanations, and confetti celebrations directly inside the Explore feed.'
              : contentType === 'spelling'
              ? 'Batch-import English spelling challenges with clues and 30s/45s/60s timers derived strictly from difficulty, with letter flying animations.'
              : 'Batch-upload English spelling words with memorization countdowns (Easy: 30s/3–5 letters, Intermediate: 20s/6–8 letters, Hard: 10s/9–12 letters).'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
          {/* Content Type Selector */}
          <div className="bg-white/10 p-1 rounded-2xl border border-white/20 flex flex-wrap items-center gap-1">
            <button
              onClick={() => handleContentTypeChange('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                contentType === 'quiz'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🎯</span>
              <span>Quiz</span>
            </button>

            <button
              onClick={() => handleContentTypeChange('spelling')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                contentType === 'spelling'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🔠</span>
              <span>Spelling Scramble</span>
            </button>

            <button
              onClick={() => handleContentTypeChange('spelling_flip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                contentType === 'spelling_flip'
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-300 text-slate-950 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🃏</span>
              <span>Spelling Flip Card</span>
            </button>
          </div>

          <button
            onClick={handleCopyPrompt}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            title="Copy AI prompt template"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#026fc3]" />
                <span>Copy AI Prompt</span>
              </>
            )}
          </button>

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center justify-center"
            title="Reload records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">
            Total {contentType === 'quiz' ? 'Quizzes' : contentType === 'spelling' ? 'Scrambles' : 'Flip Cards'}
          </div>
          <div className="text-xl font-black text-[#0f233a] mt-1">
            {contentType === 'quiz' ? quizStats.totalQuizzes : contentType === 'spelling' ? spellingStats.totalScrambles : flipStats.totalCards}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">In database</div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs bg-emerald-50/20">
          <div className="text-xs font-bold text-emerald-700">Published</div>
          <div className="text-xl font-black text-emerald-900 mt-1">
            {contentType === 'quiz' ? quizStats.publishedQuizzes : contentType === 'spelling' ? spellingStats.publishedScrambles : flipStats.publishedCards}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active in feed</div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs bg-amber-50/20">
          <div className="text-xs font-bold text-amber-700">Draft / Hidden</div>
          <div className="text-xl font-black text-amber-900 mt-1">
            {contentType === 'quiz' ? quizStats.unpublishedQuizzes : contentType === 'spelling' ? spellingStats.draftScrambles : flipStats.draftCards}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Not in feed</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">Total Completions</div>
          <div className="text-xl font-black text-[#026fc3] mt-1">
            {contentType === 'quiz' ? quizStats.totalAttempts : contentType === 'spelling' ? spellingStats.totalCompletions : flipStats.totalCompletions}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">By students</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-slate-400">Total XP Awarded</div>
          <div className="text-xl font-black text-amber-600 mt-1">
            +{contentType === 'quiz' ? quizStats.totalXpAwarded : contentType === 'spelling' ? spellingStats.totalXpAwarded : flipStats.totalXpAwarded} XP
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Earned once per item</div>
        </div>
      </div>

      {/* 3. AI Batch Importer Panel */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f233a]">
                Batch Import ({contentType === 'spelling_flip' ? 'CSV or JSON' : 'JSON'})
              </h3>
              <p className="text-xs text-slate-500">
                {contentType === 'quiz'
                  ? 'Paste structured JSON from ChatGPT or Claude to batch-import dozens of quizzes.'
                  : contentType === 'spelling'
                  ? 'Paste structured JSON with word, scrambledLetters, and clue to batch-import spelling activities.'
                  : 'Upload or paste a batch of words in CSV (word,level,category) or JSON format with automatic length checks.'}
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
            {/* Prompt Customization Toolbar */}
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
                  placeholder="e.g. Science, Everyday Objects, Animals, Technology..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {contentType === 'spelling' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Difficulty:</label>
                    <select
                      value={spellingDifficultyPrompt}
                      onChange={(e) => setSpellingDifficultyPrompt(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="Mixed">Mixed (Easy/Med/Hard)</option>
                      <option value="Easy">Easy (4-6 letters, 30s)</option>
                      <option value="Medium">Medium (6-8 letters, 45s)</option>
                      <option value="Hard">Hard (8-12 letters, 60s)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Count:</label>
                  <select
                    value={promptCount}
                    onChange={(e) => setPromptCount(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value={10}>10 items</option>
                    <option value={20}>20 items</option>
                    <option value={30}>30 items</option>
                    <option value={50}>50 items</option>
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

            {/* Input Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">
                  {contentType === 'spelling_flip' ? 'Paste CSV or JSON Batch:' : 'Paste JSON Content:'}
                </label>
                <span className="text-slate-400 font-mono text-[11px]">
                  {contentType === 'quiz'
                    ? 'Format: { "quizzes": [ ... ] }'
                    : contentType === 'spelling'
                    ? 'Format: { "spellingScrambles": [ ... ] }'
                    : 'Format: word,level,category (CSV)'}
                </span>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={
                  contentType === 'quiz'
                    ? `{\n  "quizzes": [\n    {\n      "question": "How many hearts does an octopus have?",\n      "options": ["1", "2", "3", "4"],\n      "correctAnswer": "3",\n      "explanation": "An octopus has three hearts.",\n      "category": "Science",\n      "difficulty": "Easy",\n      "xp": 10\n    }\n  ]\n}`
                    : contentType === 'spelling'
                    ? `{\n  "spellingScrambles": [\n    {\n      "word": "ELEPHANT",\n      "scrambledLetters": ["P", "E", "L", "E", "H", "A", "N", "T"],\n      "clue": "A very large animal with a long trunk.",\n      "category": "Nature",\n      "difficulty": "Easy",\n      "xp": 10\n    }\n  ]\n}`
                    : `word,level,category\ncat,easy,Animals\nhouse,easy,Everyday\nschool,easy,Education\nbeautiful,intermediate,General\nelephant,intermediate,Animals\ncomputer,intermediate,Technology\nenvironment,hard,Science\ncommunication,hard,English\nresponsibility,hard,Life Skills`
                }
                rows={6}
                className="w-full p-3.5 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Actions: Validate, Clear */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClearImport}
                disabled={!jsonInput.trim()}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer disabled:opacity-40"
              >
                Clear Content
              </button>

              <button
                type="button"
                onClick={handleValidate}
                disabled={!jsonInput.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Validate Batch</span>
              </button>
            </div>

            {/* Validation Feedback Box */}
            {(quizValidationResult || spellingValidationResult || flipValidationResult) && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Validation Results:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black">
                      {activeValidCount} Valid
                    </span>
                    {activeInvalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-black">
                        {activeInvalidCount} Invalid
                      </span>
                    )}
                  </div>

                  {activeValidCount > 0 && (
                    <button
                      onClick={handleImportValidBatch}
                      disabled={isImporting}
                      className="px-5 py-2 bg-[#026fc3] hover:bg-[#025da6] text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>Save & Import {activeValidCount} Item{activeValidCount === 1 ? '' : 's'}</span>
                    </button>
                  )}
                </div>

                {activeInvalidCount > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
                    {activeInvalidList.map((errItem: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                        <span className="font-bold">Row #{errItem.index || idx + 1} ({errItem.word}): </span>
                        <span>{Array.isArray(errItem.errors) ? errItem.errors.join('; ') : errItem.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${contentType === 'quiz' ? 'quizzes' : contentType === 'spelling' ? 'spelling scrambles' : 'spelling flip words'}…`}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-[#026fc3]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty / Level Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">All Levels</option>
            {contentType === 'spelling_flip' ? (
              <>
                <option value="easy">Easy (Grades 3–5, 3–5 letters)</option>
                <option value="intermediate">Intermediate (Grades 6–8, 6–8 letters)</option>
                <option value="hard">Hard (Grades 9–12, 9–12 letters)</option>
              </>
            ) : (
              <>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </>
            )}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft / Hidden</option>
          </select>
        </div>
      </div>

      {/* 5. Management Data List */}
      <div className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0f233a]">
            {contentType === 'quiz'
              ? `Manage Quiz Bits (${quizzes.length})`
              : contentType === 'spelling'
              ? `Manage Spelling Scrambles (${scrambles.length})`
              : `Manage Spelling Flip Cards (${flipCards.length})`}
          </h3>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
            <Loader2 className="w-6 h-6 animate-spin text-[#026fc3]" />
            <span>Loading records…</span>
          </div>
        ) : contentType === 'quiz' ? (
          // Quiz List
          quizzes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              No quizzes found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          quiz.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {quiz.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-extrabold">
                        {quiz.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                        {quiz.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black">
                        +{quiz.xp || 10} XP
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-[#0f233a]">
                      {quiz.question}
                    </h4>

                    <div className="text-xs text-emerald-700 font-semibold">
                      ✓ Correct: {quiz.correct_answer}
                    </div>

                    {quiz.explanation && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        💡 {quiz.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleQuizPublish(quiz)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        quiz.is_published
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={quiz.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {quiz.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditQuizModal(quiz)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Edit quiz"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuiz(quiz)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : contentType === 'spelling' ? (
          // Spelling Scrambles List
          scrambles.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              No spelling scrambles found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {scrambles.map((scramble) => (
                <div
                  key={scramble.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          scramble.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {scramble.is_published ? 'Published' : 'Draft'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-extrabold">
                        {scramble.category}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        scramble.difficulty === 'Hard'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : scramble.difficulty === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {scramble.difficulty}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{scramble.timer_seconds}s</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-amber-700" />
                        <span>+{scramble.xp} XP</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-black text-[#0f233a] font-mono tracking-wider">
                        {scramble.word}
                      </h4>
                      <div className="flex items-center gap-1">
                        {scramble.scrambled_letters?.map((l, lIdx) => (
                          <span
                            key={lIdx}
                            className="w-5 h-6 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-bold flex items-center justify-center border border-slate-200"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-2">
                      💡 &ldquo;{scramble.clue}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleScramblePublish(scramble)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        scramble.is_published
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={scramble.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {scramble.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditScrambleModal(scramble)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Edit scramble"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteScramble(scramble)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="Delete scramble"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Spelling Flip Card List
          flipCards.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              No spelling flip cards found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {flipCards.map((card) => (
                <div
                  key={card.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          card.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {card.is_published ? 'Published' : 'Draft'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-extrabold">
                        {card.category || 'General'}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        card.level === 'hard'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : card.level === 'intermediate'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      }`}>
                        {card.level} ({card.word.length} letters)
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{card.memorize_seconds}s</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-amber-700" />
                        <span>+{card.xp} XP</span>
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-[#0f233a] font-mono tracking-widest uppercase">
                      {card.word}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleFlipPublish(card)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        card.is_published
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={card.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {card.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditFlipModal(card)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Edit word"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteFlipCard(card)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="Delete word"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 6. Edit Modal for Quiz */}
      {editingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#0f233a]">Edit Quiz Bit</h3>
              <button
                onClick={() => setEditingQuiz(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuizEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question *</label>
                <input
                  type="text"
                  value={editQuizForm.question}
                  onChange={(e) => setEditQuizForm((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">4 Options *</label>
                {editQuizForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...editQuizForm.options];
                      next[idx] = e.target.value;
                      setEditQuizForm((prev) => ({ ...prev, options: next }));
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correct Answer *</label>
                <select
                  value={editQuizForm.correct_answer}
                  onChange={(e) => setEditQuizForm((prev) => ({ ...prev, correct_answer: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                >
                  {editQuizForm.options.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt || `Option ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Explanation</label>
                <textarea
                  value={editQuizForm.explanation}
                  onChange={(e) => setEditQuizForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editQuizForm.category}
                    onChange={(e) => setEditQuizForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editQuizForm.difficulty}
                    onChange={(e) => setEditQuizForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  >
                    <option value="Easy">Easy (+10 XP)</option>
                    <option value="Medium">Medium (+15 XP)</option>
                    <option value="Hard">Hard (+20 XP)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="quiz-published-check"
                  checked={editQuizForm.is_published}
                  onChange={(e) => setEditQuizForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-[#026fc3] rounded-sm"
                />
                <label htmlFor="quiz-published-check" className="text-xs font-bold text-slate-700">
                  Published in feed
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#026fc3] hover:bg-[#025da6] text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Modal for Spelling Scramble */}
      {editingScramble && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#0f233a]">Edit Spelling Scramble</h3>
              <button
                onClick={() => setEditingScramble(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScrambleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Word *</label>
                <input
                  type="text"
                  value={editScrambleForm.word}
                  onChange={(e) => setEditScrambleForm((prev) => ({ ...prev, word: e.target.value.toUpperCase() }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono font-bold tracking-wider uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clue / Hint *</label>
                <textarea
                  value={editScrambleForm.clue}
                  onChange={(e) => setEditScrambleForm((prev) => ({ ...prev, clue: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editScrambleForm.category}
                    onChange={(e) => setEditScrambleForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editScrambleForm.difficulty}
                    onChange={(e) => setEditScrambleForm((prev) => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  >
                    <option value="Easy">Easy (30s, +10 XP)</option>
                    <option value="Medium">Medium (45s, +15 XP)</option>
                    <option value="Hard">Hard (60s, +20 XP)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="scramble-published-check"
                  checked={editScrambleForm.is_published}
                  onChange={(e) => setEditScrambleForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-[#026fc3] rounded-sm"
                />
                <label htmlFor="scramble-published-check" className="text-xs font-bold text-slate-700">
                  Published in feed
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingScramble(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#026fc3] hover:bg-[#025da6] text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Edit Modal for Spelling Flip Card */}
      {editingFlipCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#0f233a]">Edit Spelling Flip Word</h3>
              <button
                onClick={() => setEditingFlipCard(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFlipEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Word *</label>
                <input
                  type="text"
                  value={editFlipForm.word}
                  onChange={(e) => setEditFlipForm((prev) => ({ ...prev, word: e.target.value.toUpperCase() }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono font-bold tracking-wider uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Level *</label>
                  <select
                    value={editFlipForm.level}
                    onChange={(e) => setEditFlipForm((prev) => ({ ...prev, level: e.target.value as SpellingFlipLevel }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  >
                    <option value="easy">Easy (3–5 letters, 30s)</option>
                    <option value="intermediate">Intermediate (6–8 letters, 20s)</option>
                    <option value="hard">Hard (9–12 letters, 10s)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editFlipForm.category}
                    onChange={(e) => setEditFlipForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="flip-published-check"
                  checked={editFlipForm.is_published}
                  onChange={(e) => setEditFlipForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-[#026fc3] rounded-sm"
                />
                <label htmlFor="flip-published-check" className="text-xs font-bold text-slate-700">
                  Published in feed
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFlipCard(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#026fc3] hover:bg-[#025da6] text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
