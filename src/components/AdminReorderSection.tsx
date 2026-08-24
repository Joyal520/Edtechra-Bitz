// ============================================================================
// EDTECHRA-BITZ: Admin Sentence Reorder & Bulk Import Management Section
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ReorderActivity,
  ReorderAdminStats,
  ReorderValidationResult
} from '@/types/reorder';
import { reorderService } from '@/services/reorderService';
import { useAuth } from '@/context/AuthContext';
import { CollapsibleCatalogue } from './CollapsibleCatalogue';
import { validateReorderJSON } from '@/utils/reorderValidation';

const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  [
    {
      "sentence": "She goes to school.",
      "category": "Grammar",
      "level": "A1",
      "xp": 10,
      "hint": "This sentence talks about a person's daily action.",
      "explanation": "We use 'goes' with 'she' in the simple present tense."
    },
    {
      "sentence": "The sun rises in the east.",
      "category": "Science",
      "level": "A2",
      "xp": 10,
      "hint": "Think about directions and the morning sky.",
      "explanation": "Standard English subject-verb-prepositional phrase order."
    },
    {
      "sentence": "I want to go home now.",
      "category": "Daily Life",
      "level": "A1",
      "xp": 10,
      "hint": "Expressing a current desire.",
      "explanation": "'Want to go' is followed by 'home' and the time adverb 'now'."
    }
  ],
  null,
  2
);

export const AdminReorderSection: React.FC = () => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data state
  const [activities, setActivities] = useState<ReorderActivity[]>([]);
  const [stats, setStats] = useState<ReorderAdminStats>({
    totalActivities: 0,
    publishedActivities: 0,
    draftActivities: 0,
    totalCompletions: 0,
    totalXpAwarded: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // JSON Import Panel state
  const [importPanelOpen, setImportPanelOpen] = useState<boolean>(true);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ReorderValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // Single Add Form state
  const [singleSentence, setSingleSentence] = useState<string>('');
  const [singleCategory, setSingleCategory] = useState<string>('Grammar');
  const [singleLevel, setSingleLevel] = useState<string>('A1');
  const [singleXP, setSingleXP] = useState<number>(10);
  const [singleHint, setSingleHint] = useState<string>('');
  const [singleExplanation, setSingleExplanation] = useState<string>('');
  const [singlePublished, setSinglePublished] = useState<boolean>(true);
  const [isCreatingSingle, setIsCreatingSingle] = useState<boolean>(false);

  // Edit Modal state
  const [editingActivity, setEditingActivity] = useState<ReorderActivity | null>(null);
  const [editForm, setEditForm] = useState<{
    sentence: string;
    category: string;
    level: string;
    xp: number;
    hint: string;
    explanation: string;
    is_published: boolean;
  }>({
    sentence: '',
    category: 'Grammar',
    level: 'A1',
    xp: 10,
    hint: '',
    explanation: '',
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
      const data = await reorderService.getAdminActivities(
        {
          search: searchQuery,
          category: categoryFilter,
          level: levelFilter,
          published: statusFilter
        },
        token
      );
      setActivities(data.activities);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading admin reorder activities:', err);
      showToast(err.message || 'Failed to load activities', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, searchQuery, categoryFilter, levelFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle JSON Input Change with real-time validation
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonInput(val);
    if (!val.trim()) {
      setValidationResult(null);
      return;
    }
    const validated = validateReorderJSON(val);
    setValidationResult(validated);
  };

  // Handle JSON File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      const validated = validateReorderJSON(content);
      setValidationResult(validated);
    };
    reader.readAsText(file);
  };

  // Copy sample template to clipboard
  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON_TEMPLATE);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
      showToast('Sample JSON template copied to clipboard!');
    } catch (err) {
      showToast('Could not copy template', 'error');
    }
  };

  // Execute Bulk Batch Import
  const handleImportBatch = async () => {
    if (!validationResult || !validationResult.valid || validationResult.activities.length === 0) {
      showToast('Please fix JSON validation errors before importing.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const token = session?.access_token || null;
      const res = await reorderService.importBatch(validationResult.activities, token);

      showToast(`Successfully imported ${res.importedCount} activities!`);
      setJsonInput('');
      setValidationResult(null);
      loadData();
    } catch (err: any) {
      console.error('Import batch error:', err);
      showToast(err.message || 'Failed to import activities', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Create Single Activity Manually
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSentence.trim()) {
      showToast('Please enter a sentence.', 'error');
      return;
    }

    const words = singleSentence.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 6) {
      showToast(`Sentence contains ${words.length} words. Allowed: 3 to 6 words.`, 'error');
      return;
    }

    setIsCreatingSingle(true);
    try {
      const token = session?.access_token || null;
      await reorderService.createActivity(
        {
          sentence: singleSentence.trim(),
          category: singleCategory,
          level: singleLevel,
          xp: singleXP,
          hint: singleHint.trim() || undefined,
          explanation: singleExplanation.trim() || undefined,
          is_published: singlePublished
        },
        token
      );

      showToast('Sentence reorder activity created successfully!');
      setSingleSentence('');
      setSingleHint('');
      setSingleExplanation('');
      loadData();
    } catch (err: any) {
      console.error('Create single activity error:', err);
      showToast(err.message || 'Failed to create activity', 'error');
    } finally {
      setIsCreatingSingle(false);
    }
  };

  // Toggle Publication
  const handleTogglePublish = async (activity: ReorderActivity) => {
    try {
      const token = session?.access_token || null;
      const nextPub = !activity.is_published;
      await reorderService.togglePublish(activity.id, nextPub, token);

      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? { ...a, is_published: nextPub } : a))
      );
      showToast(`Activity ${nextPub ? 'published' : 'unpublished'} successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update publication status', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (activity: ReorderActivity) => {
    setEditingActivity(activity);
    setEditForm({
      sentence: activity.sentence,
      category: activity.category || 'Grammar',
      level: activity.level || 'A1',
      xp: activity.xp || 10,
      hint: activity.hint || '',
      explanation: activity.explanation || '',
      is_published: activity.is_published
    });
  };

  // Save Edit Modal Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    const words = editForm.sentence.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 6) {
      showToast(`Sentence must have between 3 and 6 words (received ${words.length}).`, 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await reorderService.updateActivity(editingActivity.id, editForm, token);

      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Activity updated successfully!');
      setEditingActivity(null);
    } catch (err: any) {
      console.error('Save edit error:', err);
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Activity
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Sentence Reorder activity?')) return;

    try {
      const token = session?.access_token || null;
      await reorderService.deleteActivity(id, token);

      setActivities((prev) => prev.filter((a) => a.id !== id));
      showToast('Activity deleted successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete activity', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Activities</div>
          <div className="text-2xl font-black text-[#0f233a] mt-1">{stats.totalActivities}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Published</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.publishedActivities}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Drafts</div>
          <div className="text-2xl font-black text-slate-600 mt-1">{stats.draftActivities}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Completions</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats.totalCompletions}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">XP Awarded</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.totalXpAwarded}</div>
        </div>
      </div>

      {/* 2. Bulk JSON Import & Single Add Panel */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <button
          onClick={() => setImportPanelOpen((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
              🔤
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-[#0f233a]">
                Bulk JSON Import & Create Activities
              </h3>
              <p className="text-xs text-slate-500">
                Add 3–6 word sentence reorder challenges in bulk via JSON or manually
              </p>
            </div>
          </div>
          <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
            {importPanelOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {importPanelOpen && (
          <div className="p-5 pt-1 border-t border-slate-100 space-y-6">
            {/* Bulk JSON Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-brand-600" />
                  <span>Paste JSON Array or Object</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .JSON File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTemplate ? 'Copied!' : 'Copy Template'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={jsonInput}
                onChange={handleJsonChange}
                placeholder={`[\n  {\n    "sentence": "She goes to school.",\n    "category": "Grammar",\n    "level": "A1",\n    "xp": 10,\n    "hint": "Daily routine.",\n    "explanation": "Simple present tense."\n  }\n]`}
                rows={6}
                className="w-full p-3.5 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />

              {/* Validation Status Box */}
              {validationResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                    validationResult.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">
                        {validationResult.valid
                          ? `✓ Valid JSON: ${validationResult.validCount} activities detected (3–6 words each)`
                          : `✗ Validation Failed (${validationResult.errors.length} errors)`}
                      </span>
                      {!validationResult.valid && (
                        <div className="mt-1 text-[11px] text-rose-700 space-y-0.5 max-h-24 overflow-y-auto">
                          {validationResult.errors.map((err, i) => (
                            <div key={i}>
                              • {err.index ? `Item ${err.index}: ` : ''}{err.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {validationResult.valid && (
                    <button
                      onClick={handleImportBatch}
                      disabled={isImporting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Import {validationResult.validCount} Activities</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Or Add Single Activity</span>
              </div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleCreateSingle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Sentence (3 to 6 words) *
                </label>
                <input
                  type="text"
                  value={singleSentence}
                  onChange={(e) => setSingleSentence(e.target.value)}
                  placeholder="e.g. She goes to school."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                  >
                    <option value="Grammar">Grammar</option>
                    <option value="Vocabulary">Vocabulary</option>
                    <option value="Daily Life">Daily Life</option>
                    <option value="Science">Science</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
                  <select
                    value={singleLevel}
                    onChange={(e) => setSingleLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                  >
                    <option value="A1">A1 Beginner</option>
                    <option value="A2">A2 Elementary</option>
                    <option value="B1">B1 Intermediate</option>
                    <option value="B2">B2 Upper Int</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={singleXP}
                    onChange={(e) => setSingleXP(Number(e.target.value))}
                    min={5}
                    max={50}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="singlePub"
                    checked={singlePublished}
                    onChange={(e) => setSinglePublished(e.target.checked)}
                    className="rounded-md text-brand-600 w-4 h-4"
                  />
                  <label htmlFor="singlePub" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Publish Immediately
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hint (Optional)</label>
                  <input
                    type="text"
                    value={singleHint}
                    onChange={(e) => setSingleHint(e.target.value)}
                    placeholder="e.g. This sentence talks about daily routine."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Explanation (Optional)</label>
                  <input
                    type="text"
                    value={singleExplanation}
                    onChange={(e) => setSingleExplanation(e.target.value)}
                    placeholder="e.g. Simple present tense third-person singular rule."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingSingle}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Reorder Activity</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 3 & 4. Sentence Reorder Activities Catalogue (Collapsible by default) */}
      <CollapsibleCatalogue
        title="Sentence Reorder Catalogue"
        count={activities.length}
        subtitle="Search, filter, edit, and toggle publishing status for sentence reorder activities."
      >
        {/* Search & Filter Toolbar */}
        <div className="bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sentences, categories, explanations..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="Grammar">Grammar</option>
              <option value="Vocabulary">Vocabulary</option>
              <option value="Daily Life">Daily Life</option>
              <option value="Science">Science</option>
              <option value="General">General</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
            >
              <option value="all">All Levels</option>
              <option value="A1">Level A1</option>
              <option value="A2">Level A2</option>
              <option value="B1">Level B1</option>
              <option value="B2">Level B2</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Activities Data List */}
        <div className="border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <span>Loading activities…</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              No sentence reorder activities found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          activity.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {activity.is_published ? 'Published' : 'Draft'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-extrabold">
                        {activity.category || 'Grammar'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                        Level {activity.level || 'A1'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                        +{activity.xp || 10} XP
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-[#0f233a] leading-snug">
                      {activity.sentence}
                    </h4>

                    {/* Scrambled Word Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activity.scrambled_words?.map((word, wIdx) => (
                        <span
                          key={wIdx}
                          className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200/80"
                        >
                          {word}
                        </span>
                      ))}
                    </div>

                    {activity.explanation && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        💡 {activity.explanation}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePublish(activity)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                        activity.is_published
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={activity.is_published ? 'Unpublish activity' : 'Publish activity'}
                    >
                      {activity.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(activity)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit activity"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleCatalogue>

      {/* 5. Edit Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#0f233a]">Edit Sentence Reorder</h3>
              <button
                onClick={() => setEditingActivity(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sentence (3 to 6 words) *
                </label>
                <input
                  type="text"
                  value={editForm.sentence}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sentence: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                  >
                    <option value="Grammar">Grammar</option>
                    <option value="Vocabulary">Vocabulary</option>
                    <option value="Daily Life">Daily Life</option>
                    <option value="Science">Science</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
                  <select
                    value={editForm.level}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, level: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                  >
                    <option value="A1">A1 Beginner</option>
                    <option value="A2">A2 Elementary</option>
                    <option value="B1">B1 Intermediate</option>
                    <option value="B2">B2 Upper Int</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={editForm.xp}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, xp: Number(e.target.value) }))}
                    min={5}
                    max={50}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="editPub"
                    checked={editForm.is_published}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="rounded-md text-brand-600 w-4 h-4"
                  />
                  <label htmlFor="editPub" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Published
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hint (Optional)</label>
                <input
                  type="text"
                  value={editForm.hint}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, hint: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Explanation (Optional)</label>
                <input
                  type="text"
                  value={editForm.explanation}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
