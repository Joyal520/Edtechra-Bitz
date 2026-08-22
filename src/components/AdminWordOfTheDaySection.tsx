// ============================================================================
// EDTECHRA-BITZ: Admin Word of the Day & 1,000-Word Bulk Importer Section
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
  X,
  Loader2,
  BookA,
  Eye,
  EyeOff,
  Plus,
  FileJson,
  Layers,
  Volume2
} from 'lucide-react';
import {
  WordOfTheDay,
  RawWordInput,
  WordAdminStats,
  WordValidationResult,
  WordStatus
} from '@/types/wordOfTheDay';
import { wordOfTheDayService } from '@/services/wordOfTheDayService';
import { pronunciationService } from '@/services/pronunciationService';
import { useAuth } from '@/context/AuthContext';
import { validateWordJSON } from '@/utils/wordValidation';
import { WordOfTheDayCard } from './PostFeed/WordOfTheDayCard';

const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  {
    words: [
      {
        word: "meticulous",
        pronunciation: "/məˈtɪkjələs/",
        partOfSpeech: "adjective",
        meaning: "Very careful and paying great attention to every small detail.",
        example: "She is meticulous in her work."
      },
      {
        word: "diligent",
        pronunciation: "/ˈdɪlɪdʒənt/",
        partOfSpeech: "adjective",
        meaning: "Working hard and carefully.",
        example: "He is a diligent student."
      },
      {
        word: "ephemeral",
        pronunciation: "/ɪˈfem.ər.əl/",
        partOfSpeech: "adjective",
        meaning: "Lasting for only a short time.",
        example: "Fame in the digital era can often be ephemeral."
      },
      {
        word: "resilience",
        pronunciation: "/rɪˈzɪl.jəns/",
        partOfSpeech: "noun",
        meaning: "The ability to quickly recover from difficulties or change.",
        example: "The students showed remarkable resilience throughout the exams."
      }
    ]
  },
  null,
  2
);

export const AdminWordOfTheDaySection: React.FC = () => {
  const { session } = useAuth();

  // Mode: 'list' | 'create' | 'bulk_import'
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'bulk_import'>('list');

  // --------------------------------------------------------------------------
  // Data & Stats State
  // --------------------------------------------------------------------------
  const [words, setWords] = useState<WordOfTheDay[]>([]);
  const [stats, setStats] = useState<WordAdminStats>({
    totalWords: 0,
    publishedWords: 0,
    draftWords: 0,
    archivedWords: 0,
    totalLikes: 0,
    totalSaves: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState<string>('all');

  // --------------------------------------------------------------------------
  // Single Word Creation State
  // --------------------------------------------------------------------------
  const [singleForm, setSingleForm] = useState<RawWordInput>({
    word: '',
    pronunciation: '',
    partOfSpeech: 'adjective',
    meaning: '',
    example: '',
    status: 'published'
  });
  const [isSavingSingle, setIsSavingSingle] = useState<boolean>(false);
  const [showSinglePreview, setShowSinglePreview] = useState<boolean>(true);

  // --------------------------------------------------------------------------
  // Bulk JSON Import State
  // --------------------------------------------------------------------------
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<WordValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Edit Modal State
  // --------------------------------------------------------------------------
  const [editingWord, setEditingWord] = useState<WordOfTheDay | null>(null);
  const [editForm, setEditForm] = useState<RawWordInput>({
    word: '',
    pronunciation: '',
    partOfSpeech: '',
    meaning: '',
    example: '',
    status: 'published'
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Load Data
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      const data = await wordOfTheDayService.getAdminWords(
        {
          search: searchQuery,
          status: statusFilter,
          partOfSpeech: partOfSpeechFilter
        },
        token
      );
      setWords(data.words);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading Word of the Day admin data:', err);
      showToast(err.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, searchQuery, statusFilter, partOfSpeechFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Single Word Creation
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.word.trim() || !singleForm.meaning.trim() || !singleForm.example.trim()) {
      showToast('Word, Meaning, and Example are required.', 'error');
      return;
    }

    setIsSavingSingle(true);
    try {
      const token = session?.access_token || null;
      const created = await wordOfTheDayService.createWord(singleForm, token);
      showToast(`Word "${created.word}" created successfully!`, 'success');
      setSingleForm({
        word: '',
        pronunciation: '',
        partOfSpeech: 'adjective',
        meaning: '',
        example: '',
        status: 'published'
      });
      setActiveSubTab('list');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create word.', 'error');
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Validate JSON input
  const handleValidateJSON = async () => {
    setValidationError(null);
    setValidationResult(null);

    const trimmed = jsonInput.trim();
    if (!trimmed) {
      setValidationError('Please paste valid JSON before validating.');
      return;
    }

    try {
      const token = session?.access_token || null;
      const existingWords = await wordOfTheDayService.getExistingWords(token);
      const existingSet = new Set(existingWords);

      const res = validateWordJSON(trimmed, existingSet);
      if (!res.success) {
        setValidationError(res.error || 'Validation failed.');
      } else if (res.result) {
        setValidationResult(res.result);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to validate JSON.');
    }
  };

  // Handle Commit Import of Valid Words
  const handleImportValidWords = async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      showToast('No valid words to import.', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validationResult.valid.length });

    try {
      const token = session?.access_token || null;
      const res = await wordOfTheDayService.importBatch(
        validationResult.valid,
        (current, total) => {
          setImportProgress({ current, total });
        },
        token
      );

      if (res.success) {
        showToast(`Successfully imported ${res.importedCount} words!`, 'success');
        setJsonInput('');
        setValidationResult(null);
        setActiveSubTab('list');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Bulk import failed.', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (word: WordOfTheDay, newStatus: WordStatus) => {
    try {
      const token = session?.access_token || null;
      await wordOfTheDayService.updateWord(word.id, { status: newStatus }, token);
      showToast(`Status updated to ${newStatus}.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Delete Word
  const handleDeleteWord = async (word: WordOfTheDay) => {
    if (!window.confirm(`Are you sure you want to delete "${word.word}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = session?.access_token || null;
      await wordOfTheDayService.deleteWord(word.id, token);
      showToast(`Word "${word.word}" deleted.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete word.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (word: WordOfTheDay) => {
    setEditingWord(word);
    setEditForm({
      word: word.word,
      pronunciation: word.pronunciation || '',
      partOfSpeech: word.part_of_speech || '',
      meaning: word.meaning,
      example: word.example,
      status: word.status
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord) return;

    setIsSavingEdit(true);
    try {
      const token = session?.access_token || null;
      await wordOfTheDayService.updateWord(
        editingWord.id,
        {
          word: editForm.word.trim(),
          pronunciation: editForm.pronunciation ? editForm.pronunciation.trim() : null,
          part_of_speech: editForm.partOfSpeech ? editForm.partOfSpeech.trim() : null,
          meaning: editForm.meaning.trim(),
          example: editForm.example.trim(),
          status: editForm.status
        },
        token
      );
      showToast(`Word "${editForm.word}" updated successfully!`, 'success');
      setEditingWord(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update word.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Copy sample template to clipboard
  const handleCopyTemplate = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SAMPLE_JSON_TEMPLATE).then(() => {
        setCopiedTemplate(true);
        setTimeout(() => setCopiedTemplate(false), 2000);
      });
    }
  };

  const handlePasteSample = () => {
    setJsonInput(SAMPLE_JSON_TEMPLATE);
  };

  // Single word preview object mock
  const previewWordMock: WordOfTheDay = {
    id: 'preview_mock',
    word: singleForm.word.trim() || 'Meticulous',
    word_normalized: (singleForm.word || 'meticulous').trim().toLowerCase(),
    pronunciation: singleForm.pronunciation?.trim() || '/məˈtɪkjələs/',
    part_of_speech: singleForm.partOfSpeech?.trim() || 'Adjective',
    meaning: singleForm.meaning.trim() || 'Very careful and paying great attention to every small detail.',
    example: singleForm.example.trim() || 'She is meticulous in her work.',
    image_url: '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png',
    status: singleForm.status || 'published',
    likes_count: 0,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Navigation Subtabs */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black shadow-xs">
              <BookA className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0f233a] tracking-tight">
                Word of the Day System
              </h2>
              <p className="text-xs text-slate-500">
                100% Real DOM HTML cards, single reusable boy illustration, browser TTS & 1,000-word bulk import.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'list'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Words ({stats.totalWords})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('create')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'create'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Create Word</span>
            </button>

            <button
              onClick={() => setActiveSubTab('bulk_import')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'bulk_import'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/60'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk JSON Import</span>
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
              title="Refresh Words"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Status Toast Alert */}
        {actionMessage && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-bold">{actionMessage.text}</span>
          </div>
        )}

        {/* 2. Admin Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Words</div>
            <div className="text-lg font-black text-[#0f233a] mt-0.5">{stats.totalWords}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Published</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">{stats.publishedWords}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Drafts</div>
            <div className="text-lg font-black text-amber-900 mt-0.5">{stats.draftWords}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Archived</div>
            <div className="text-lg font-black text-slate-700 mt-0.5">{stats.archivedWords}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-700">Likes</div>
            <div className="text-lg font-black text-rose-900 mt-0.5">{stats.totalLikes}</div>
          </div>
          <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-wider text-teal-700">Saved</div>
            <div className="text-lg font-black text-teal-900 mt-0.5">{stats.totalSaves}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: CREATE SINGLE WORD WITH LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'create' && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base font-black text-[#0f233a]">Create Word of the Day</h3>
              <p className="text-xs text-slate-500">Fill in the fields below. Live preview updates dynamically.</p>
            </div>
            <button
              onClick={() => setShowSinglePreview(!showSinglePreview)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              {showSinglePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSinglePreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Column */}
            <form onSubmit={handleCreateSingle} className="lg:col-span-6 space-y-4">
              
              {/* Word & Part of Speech */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Word *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meticulous"
                    value={singleForm.word}
                    onChange={(e) => setSingleForm({ ...singleForm, word: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Part of Speech</label>
                  <input
                    type="text"
                    placeholder="e.g. adjective, noun, verb"
                    value={singleForm.partOfSpeech || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, partOfSpeech: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Pronunciation & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">IPA Pronunciation</label>
                  <input
                    type="text"
                    placeholder="e.g. /məˈtɪkjələs/"
                    value={singleForm.pronunciation || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, pronunciation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Status</label>
                  <select
                    value={singleForm.status || 'published'}
                    onChange={(e) => setSingleForm({ ...singleForm, status: e.target.value as WordStatus })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="published">Published (Visible in Feed)</option>
                    <option value="draft">Draft (Admin Only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Meaning */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Meaning *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Very careful and paying great attention to every small detail."
                  value={singleForm.meaning}
                  onChange={(e) => setSingleForm({ ...singleForm, meaning: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Example Sentence */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Example Sentence *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="She is meticulous in her work."
                  value={singleForm.example}
                  onChange={(e) => setSingleForm({ ...singleForm, example: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingSingle}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingSingle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Word…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Save & Publish Word</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('list')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Live Preview Column */}
            {showSinglePreview && (
              <div className="lg:col-span-6 space-y-2">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Live Feed Card Preview</span>
                </div>
                <WordOfTheDayCard word={previewWordMock} />
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BULK JSON IMPORTER (UP TO 1,000 WORDS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'bulk_import' && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base font-black text-[#0f233a]">Bulk JSON Importer</h3>
              <p className="text-xs text-slate-500">
                Paste up to 1,000 words in one batch. Automated double validation & duplicate prevention.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteSample}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Load Sample JSON</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTemplate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate ? 'Copied Template!' : 'Copy Schema'}</span>
              </button>
            </div>
          </div>

          {/* JSON Textarea Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>Paste JSON Payload:</span>
              <span className="font-mono text-[11px]">Max 1,000 entries per batch</span>
            </div>

            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setValidationError(null);
              }}
              placeholder='{ "words": [ { "word": "meticulous", "pronunciation": "/məˈtɪkjələs/", "partOfSpeech": "adjective", "meaning": "...", "example": "..." } ] }'
              className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-800 leading-relaxed resize-y"
            />
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Validation Error Detected</div>
                <div className="text-[11px] text-rose-700 mt-0.5">{validationError}</div>
              </div>
            </div>
          )}

          {/* Action Bar for Validation */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidateJSON}
              disabled={isImporting || !jsonInput.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Validate & Preview Batch</span>
            </button>

            {jsonInput && (
              <button
                type="button"
                onClick={() => {
                  setJsonInput('');
                  setValidationResult(null);
                  setValidationError(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Validation Preview Dashboard */}
          {validationResult && (
            <div className="space-y-4 pt-4 border-t border-stone-100 animate-in fade-in">
              
              {/* Summary Counts Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-slate-500">Total Detected</div>
                  <div className="text-lg font-black text-[#0f233a]">{validationResult.totalDetected}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-emerald-700">Valid to Import</div>
                  <div className="text-lg font-black text-emerald-900">{validationResult.validCount}</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-amber-700">In-Batch Duplicates</div>
                  <div className="text-lg font-black text-amber-900">{validationResult.inBatchDuplicateCount}</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-blue-700">Already in DB</div>
                  <div className="text-lg font-black text-blue-900">{validationResult.existingCount}</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-rose-700">Invalid Records</div>
                  <div className="text-lg font-black text-rose-900">{validationResult.invalidCount}</div>
                </div>
              </div>

              {/* Progress Indicator for Large Imports */}
              {isImporting && importProgress && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-black text-amber-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Importing Word of the Day records…</span>
                    </span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="w-full h-2.5 bg-amber-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Commit Import Button */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 p-4 rounded-2xl">
                <div>
                  <div className="text-xs font-black text-[#0f233a]">
                    Ready to commit {validationResult.validCount} valid words?
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Duplicates and invalid entries will be safely skipped.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleImportValidWords}
                  disabled={isImporting || validationResult.validCount === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>IMPORT {validationResult.validCount} VALID WORDS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>Batch Preview ({validationResult.allReport.length} items)</span>
                  <span className="text-slate-400 text-[11px]">Showing validation status per item</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 text-xs">
                  {validationResult.allReport.map((rep) => (
                    <div key={rep.index} className="p-3 flex items-start gap-3 hover:bg-stone-50/50">
                      <span className="font-mono text-slate-400 text-[11px] w-6 shrink-0 pt-0.5">
                        #{rep.index}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#0f233a]">{rep.raw.word || '—'}</span>
                          {rep.raw.pronunciation && (
                            <span className="font-mono text-[11px] text-slate-500">{rep.raw.pronunciation}</span>
                          )}
                          {rep.raw.partOfSpeech && (
                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                              {rep.raw.partOfSpeech}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">
                          <span className="font-semibold">Meaning:</span> {rep.raw.meaning}
                        </div>

                        {rep.message && (
                          <div className="text-rose-600 text-[11px] font-bold mt-1">
                            {rep.message}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {rep.status === 'valid' && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black">
                            ✓ Valid
                          </span>
                        )}
                        {rep.status === 'duplicate_in_batch' && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black">
                            In-Batch Dup
                          </span>
                        )}
                        {rep.status === 'already_exists' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-black">
                            Exists in DB
                          </span>
                        )}
                        {rep.status === 'invalid' && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ALL WORDS LIST & MANAGEMENT TABLE */}
      {/* ========================================================================= */}
      {activeSubTab === 'list' && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          
          {/* Filters & Search Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search words, meanings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={partOfSpeechFilter}
                onChange={(e) => setPartOfSpeechFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Parts of Speech</option>
                <option value="adjective">Adjective</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adverb">Adverb</option>
              </select>
            </div>
          </div>

          {/* Words Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Loading Word of the Day records…</span>
            </div>
          ) : words.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <BookA className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0f233a]">No Words Found</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {searchQuery ? 'No records match your search criteria.' : 'Create your first Word of the Day or import a bulk batch.'}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('create')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Create Word</span>
              </button>
            </div>
          ) : (
            <div className="border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-slate-600 font-black">
                    <tr>
                      <th className="py-3 px-4">Word</th>
                      <th className="py-3 px-3">Pronunciation</th>
                      <th className="py-3 px-3">Part of Speech</th>
                      <th className="py-3 px-4">Meaning & Example</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Likes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {words.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                        
                        {/* Word & Speaker */}
                        <td className="py-3 px-4 font-black text-[#0f233a]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => pronunciationService.speak(item.word)}
                              className="p-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
                              title={`Pronounce ${item.word}`}
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                            <span>{item.word}</span>
                          </div>
                        </td>

                        {/* Pronunciation */}
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          {item.pronunciation || '—'}
                        </td>

                        {/* Part of Speech */}
                        <td className="py-3 px-3">
                          {item.part_of_speech ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold uppercase">
                              {item.part_of_speech}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Meaning & Example */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-800 line-clamp-1">{item.meaning}</div>
                          <div className="text-[11px] text-slate-500 font-serif italic line-clamp-1 mt-0.5">
                            "{item.example}"
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-3 text-center">
                          <select
                            value={item.status}
                            onChange={(e) => handleToggleStatus(item, e.target.value as WordStatus)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border cursor-pointer focus:outline-none ${
                              item.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.status === 'draft'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                          </select>
                        </td>

                        {/* Likes */}
                        <td className="py-3 px-3 text-center font-bold text-slate-600">
                          {item.likes_count || 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Edit Word"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                              title="Delete Word"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL */}
      {/* ========================================================================= */}
      {editingWord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-[#0f233a]">Edit Word of the Day</h3>
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Word *</label>
                  <input
                    type="text"
                    required
                    value={editForm.word}
                    onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Part of Speech</label>
                  <input
                    type="text"
                    value={editForm.partOfSpeech || ''}
                    onChange={(e) => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">IPA Pronunciation</label>
                  <input
                    type="text"
                    value={editForm.pronunciation || ''}
                    onChange={(e) => setEditForm({ ...editForm, pronunciation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Status</label>
                  <select
                    value={editForm.status || 'published'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as WordStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Meaning *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.meaning}
                  onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Example Sentence *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.example}
                  onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
