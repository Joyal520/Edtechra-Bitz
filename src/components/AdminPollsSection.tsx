import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  Plus,
  X,
  Loader2,
  Check
} from 'lucide-react';
import {
  PollBit,
  PollAdminStats,
  AIPollGenerationResult,
  CreatePollInput
} from '@/types';
import { pollService } from '@/services/pollService';
import { useAuth } from '@/context/AuthContext';
import { POLL_CONFIG } from '@/utils/pollConfig';

export const AdminPollsSection: React.FC = () => {
  const { session } = useAuth();

  // Data state
  const [polls, setPolls] = useState<PollBit[]>([]);
  const [stats, setStats] = useState<PollAdminStats>({
    totalPolls: 0,
    publishedPolls: 0,
    draftPolls: 0,
    totalVotes: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // AI Prompt Generation State
  const [promptInput, setPromptInput] = useState<string>('');
  const [generatingAI, setGeneratingAI] = useState<boolean>(false);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [generatedDraft, setGeneratedDraft] = useState<AIPollGenerationResult | null>(null);

  // Review & Edit Form state
  const [draftQuestion, setDraftQuestion] = useState<string>('');
  const [draftOptions, setDraftOptions] = useState<string[]>(['', '', '', '']);
  const [draftCategory, setDraftCategory] = useState<string>('General');
  const [draftAllowMultiple, setDraftAllowMultiple] = useState<boolean>(false);
  const [draftShowResults, setDraftShowResults] = useState<boolean>(true);
  const [savingPoll, setSavingPoll] = useState<boolean>(false);

  // Edit Existing Poll State
  const [editingPoll, setEditingPoll] = useState<PollBit | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      const data = await pollService.getAdminPolls(
        {
          search: searchQuery,
          category: categoryFilter,
          status: statusFilter
        },
        token
      );
      setPolls(data.polls);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading admin polls:', err);
      showToast(err.message || 'Failed to load polls', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle AI Poll Generation from Prompt
  const handleGenerateAI = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || promptInput).trim();
    if (!promptToUse) {
      showToast('Please enter a natural language prompt first.', 'error');
      return;
    }

    setGeneratingAI(true);
    try {
      const token = session?.access_token || null;
      const result = await pollService.generatePollFromPrompt(promptToUse, token);

      setGeneratedDraft(result);
      setDraftQuestion(result.question);
      setDraftOptions(result.options.length >= 4 ? result.options : [...result.options, '', '', ''].slice(0, 4));
      setDraftCategory(result.category || 'General');
      setDraftAllowMultiple(result.allow_multiple);
      setDraftShowResults(result.show_results_after_vote);
      setEditingPoll(null);
      setReviewModalOpen(true);
    } catch (err: any) {
      console.error('AI Poll Generation failed:', err);
      showToast(err.message || 'Failed to generate poll with AI.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Open Manual Create Poll Modal
  const handleOpenManualCreate = () => {
    setGeneratedDraft(null);
    setEditingPoll(null);
    setDraftQuestion('');
    setDraftOptions(['', '', '', '']);
    setDraftCategory('General');
    setDraftAllowMultiple(false);
    setDraftShowResults(true);
    setReviewModalOpen(true);
  };

  // Open Edit Modal for Existing Poll
  const handleOpenEditModal = (poll: PollBit) => {
    setEditingPoll(poll);
    setGeneratedDraft(null);
    setDraftQuestion(poll.question);
    setDraftOptions(poll.options.length >= 4 ? poll.options : [...poll.options, '', '', ''].slice(0, 4));
    setDraftCategory(poll.category || 'General');
    setDraftAllowMultiple(poll.allow_multiple);
    setDraftShowResults(poll.show_results_after_vote);
    setReviewModalOpen(true);
  };

  // Save / Approve Poll
  const handleSavePoll = async (publishImmediately: boolean) => {
    if (!draftQuestion.trim()) {
      alert('Poll question is required.');
      return;
    }

    const cleanOptions = draftOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      alert('At least 2 non-empty options are required.');
      return;
    }

    setSavingPoll(true);
    try {
      const token = session?.access_token || null;

      if (editingPoll) {
        await pollService.updatePoll(
          editingPoll.id,
          {
            question: draftQuestion.trim(),
            options: cleanOptions,
            category: draftCategory.trim(),
            allow_multiple: draftAllowMultiple,
            show_results_after_vote: draftShowResults,
            is_published: publishImmediately
          },
          token
        );
        showToast('Poll updated successfully.');
      } else {
        const payload: CreatePollInput = {
          question: draftQuestion.trim(),
          options: cleanOptions,
          category: draftCategory.trim(),
          allow_multiple: draftAllowMultiple,
          show_results_after_vote: draftShowResults,
          is_published: publishImmediately,
          prompt: generatedDraft?.prompt || promptInput.trim() || undefined
        };

        await pollService.createPoll(payload, token);
        showToast(`Poll ${publishImmediately ? 'approved and published to feed' : 'saved as draft'}!`);
      }

      setReviewModalOpen(false);
      setPromptInput('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save poll.');
    } finally {
      setSavingPoll(false);
    }
  };

  // Toggle Publication
  const handleTogglePublish = async (poll: PollBit) => {
    try {
      const token = session?.access_token || null;
      const newStatus = !poll.is_published;
      await pollService.togglePublish(poll.id, newStatus, token);
      setPolls(prev => prev.map(p => (p.id === poll.id ? { ...p, is_published: newStatus } : p)));
      showToast(`Poll ${newStatus ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  // Delete Poll
  const handleDeletePoll = async (poll: PollBit) => {
    if (!window.confirm(`Permanently delete poll "${poll.question}"?`)) return;

    try {
      const token = session?.access_token || null;
      await pollService.deletePoll(poll.id, token);
      setPolls(prev => prev.filter(p => p.id !== poll.id));
      showToast('Poll deleted permanently.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete poll.', 'error');
    }
  };

  return (
    <section className="space-y-6 pt-4">
      
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 ${
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

      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0f233a] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 text-[11px] font-black tracking-wider uppercase border border-purple-400/30">
              AI Prompt Engine
            </span>
            <span className="text-white/70 text-xs font-semibold">
              Prompt → Preview → Approval Workflow
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>📊</span>
            <span>AI-Prompt-Based Poll System</span>
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Enter a natural-language prompt to generate structured polls using OpenAI. Review and edit questions/options before approving. No AI poll is ever published automatically without admin approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenManualCreate}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Poll Manually</span>
          </button>
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            title="Reload poll records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Stats Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400">Total Polls</div>
          <div className="text-2xl font-black text-[#0f233a]">{stats.totalPolls}</div>
          <div className="text-[10px] text-slate-500">Created Polls</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-600">Published</div>
          <div className="text-2xl font-black text-emerald-700">{stats.publishedPolls}</div>
          <div className="text-[10px] text-slate-500">Active in Student Feed</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-amber-600">Drafts</div>
          <div className="text-2xl font-black text-amber-700">{stats.draftPolls}</div>
          <div className="text-[10px] text-slate-500">Awaiting Approval</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-600">Total Responses</div>
          <div className="text-2xl font-black text-purple-700">{stats.totalVotes}</div>
          <div className="text-[10px] text-slate-500">Student Votes Recorded</div>
        </div>
      </div>

      {/* 3. Natural Language AI Prompt Generator Box */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
              Generate Poll with AI Prompt
            </h3>
            <p className="text-xs text-slate-500">
              Type what kind of poll you want in natural English, and AI will structure the question and 4 options for your review.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              placeholder="e.g. Create a poll for Grade 8 students about their favourite way to learn science. Give four options."
              className="w-full p-4 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white leading-relaxed font-medium"
            />
          </div>

          {/* Quick Idea Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400">
              💡 Or click a quick template idea:
            </div>
            <div className="flex flex-wrap gap-2">
              {POLL_CONFIG.SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptInput(sample);
                    handleGenerateAI(sample);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-800 text-xs font-semibold text-left transition-colors border border-transparent hover:border-purple-200"
                >
                  "{sample.slice(0, 55)}…"
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">
              🔒 Generates a draft for review. Does not auto-publish.
            </span>

            <button
              type="button"
              disabled={!promptInput.trim() || generatingAI}
              onClick={() => handleGenerateAI()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer min-h-[38px]"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Structured Poll…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Poll</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Polls Catalogue Table */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
              Polls Directory & Live Results
            </h3>
            <p className="text-xs text-slate-500">
              Showing {polls.length} {polls.length === 1 ? 'poll' : 'polls'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, options, or category..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-white text-purple-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Polls List / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                <th className="pb-3 px-3">Question & Category</th>
                <th className="pb-3 px-3">Options & Live Breakdown</th>
                <th className="pb-3 px-3">Total Votes</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    <span>Loading polls...</span>
                  </td>
                </tr>
              ) : polls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No polls found. Enter a prompt above to generate your first AI poll!
                  </td>
                </tr>
              ) : (
                polls.map(poll => (
                  <tr key={poll.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Question & Category */}
                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-extrabold text-slate-900 leading-snug">
                        {poll.question}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                          {poll.category || 'General'}
                        </span>
                        {poll.prompt && (
                          <span className="text-[10px] text-slate-400 font-mono line-clamp-1 max-w-[150px]" title={poll.prompt}>
                            Prompt: {poll.prompt}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Options Breakdown Bar Preview */}
                    <td className="py-3.5 px-3 max-w-sm">
                      <div className="space-y-1">
                        {poll.options.map((opt, optIdx) => {
                          const percent = poll.option_percentages?.[opt] || 0;
                          return (
                            <div key={optIdx} className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-600 truncate flex-1">{opt}</span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="text-slate-400 font-bold w-7 text-right shrink-0">{percent}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Total Votes */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 font-bold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>{poll.total_votes || 0}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(poll)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                          poll.is_published
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                        }`}
                      >
                        {poll.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(poll)}
                          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-purple-700 transition-colors"
                          title="Edit poll"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePoll(poll)}
                          className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete poll"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REVIEW, EDIT & LIVE PREVIEW MODAL (Mandatory Admin Approval Workflow)      */}
      {/* ========================================================================= */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 to-[#0f233a] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <h3 className="text-sm sm:text-base font-black">
                  {editingPoll ? 'Edit Community Poll' : 'Review & Approve AI-Generated Poll'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form & Live Preview */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#fcfcf9]">
              
              {/* Notice Banner */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Admin Verification: Review or customize the question and options below before approving for the student feed.
                </span>
              </div>

              {/* Editable Question */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Poll Question:
                </label>
                <input
                  type="text"
                  value={draftQuestion}
                  onChange={(e) => setDraftQuestion(e.target.value)}
                  placeholder="e.g. How do you prefer to learn science?"
                  className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-black text-[#0f233a] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Editable 4 Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Poll Options (at least 2, recommended 4):
                </label>
                <div className="space-y-2">
                  {draftOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-black shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...draftOptions];
                          updated[idx] = e.target.value;
                          setDraftOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Category & Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-1.5 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={draftShowResults}
                      onChange={(e) => setDraftShowResults(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Show live percentage results after voting</span>
                  </label>
                </div>
              </div>

              {/* Live Card Preview Box */}
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Live Feed Card Preview:
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold border border-purple-200 text-[10px]">
                      {draftCategory || 'General'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">0 votes</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#0f233a]">
                    {draftQuestion || 'Sample Poll Question'}
                  </h4>
                  <div className="space-y-1.5">
                    {draftOptions.filter(Boolean).map((opt, optIdx) => (
                      <div key={optIdx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingPoll}
                onClick={() => handleSavePoll(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={savingPoll}
                onClick={() => handleSavePoll(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer min-h-[38px]"
              >
                {savingPoll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Approve & Publish to Feed</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
