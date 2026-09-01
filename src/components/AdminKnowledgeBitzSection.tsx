// ============================================================================
// EDTECHRA-BITZ: Admin Knowledge Bitz Catalogue & Image Pipeline
// Fact Management, Bulk Import (1,000+ facts), Gemini Image Generation,
// WebP Compression, Cloudflare R2 Upload, and Admin Preview.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Upload,
  Image as ImageIcon,
  Search,
  AlertCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Edit,
  Loader2,
  FileJson,
  Layers,
  X,
  Check,
  RefreshCw,
  Globe,
  Rocket,
  Download
} from 'lucide-react';
import {
  KnowledgeBitzItem,
  CreateKnowledgeBitzInput,
  BitzAdminStats,
  BitzDifficulty,
  BitzPublishStatus,
  BitzBulkImportResult,
  BitzCefrLevel
} from '@/types';
import {
  BITZ_CATEGORIES,
  getCategoryById,
  getSubtopicsForCategory,
  type BitzSubtopic
} from '@/utils/bitzTopicsConfig';
import {
  validateBitzBatch,
  type ValidatedBitzRecord
} from '@/utils/bitzContentValidator';
import { CEFR_LEVELS } from '@/utils/bitzCefrConfig';
import { useAuth } from '@/context/AuthContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { downloadKnowledgeBitzCsv } from '@/utils/bitzCsvExporter';
import { KnowledgeBitzReaderModal } from './Explore/KnowledgeBitzReaderModal';
import { AiBitzCreationWizard } from './AiBitzCreationWizard';

export const AdminKnowledgeBitzSection: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  // Catalogue Data State
  const [bitzList, setBitzList] = useState<KnowledgeBitzItem[]>([]);
  const [stats, setStats] = useState<BitzAdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CSV Export State
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Synchronized Horizontal Scroll Bar State & Refs
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingTop = useRef<boolean>(false);
  const isSyncingTable = useRef<boolean>(false);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [tableClientWidth, setTableClientWidth] = useState<number>(0);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVisualStatus, setSelectedVisualStatus] = useState<string>('all');
  const [selectedCefrLevel, setSelectedCefrLevel] = useState<string>('all');
  const [page] = useState<number>(1);

  // Modals State
  const [aiWizardOpen, setAiWizardOpen] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editingBitz, setEditingBitz] = useState<KnowledgeBitzItem | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState<boolean>(false);
  const [geminiModalOpen, setGeminiModalOpen] = useState<boolean>(false);
  const [activeGeminiBitz, setActiveGeminiBitz] = useState<KnowledgeBitzItem | null>(null);
  const [geminiPreviewUrl, setGeminiPreviewUrl] = useState<string | null>(null);
  const [geminiObjectKey, setGeminiObjectKey] = useState<string | null>(null);
  const [geminiCustomPrompt, setGeminiCustomPrompt] = useState<string>('');
  const [geminiGenerating, setGeminiGenerating] = useState<boolean>(false);
  const [previewBitz, setPreviewBitz] = useState<KnowledgeBitzItem | null>(null);

  // Form State for Create / Edit
  const [formTitle, setFormTitle] = useState<string>('');
  const [formShortFact, setFormShortFact] = useState<string>('');
  const [formReadingText, setFormReadingText] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Science & Nature');
  const [formSubtopic, setFormSubtopic] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<BitzDifficulty>('Easy');
  const [formCefrLevel, setFormCefrLevel] = useState<BitzCefrLevel>('B1');
  const [formReadingTime, setFormReadingTime] = useState<number>(30);
  const [formSource, setFormSource] = useState<string>('');
  const [formQuizQuestion, setFormQuizQuestion] = useState<string>('');
  const [formQuizOptions, setFormQuizOptions] = useState<string[]>(['', '', '', '']);
  const [formQuizCorrect, setFormQuizCorrect] = useState<string>('');
  const [formQuizExplanation, setFormQuizExplanation] = useState<string>('');
  const [formStatus, setFormStatus] = useState<BitzPublishStatus>('draft');

  // Bulk Import Form State
  const [bulkJsonText, setBulkJsonText] = useState<string>('');
  const [bulkValidatedRecords, setBulkValidatedRecords] = useState<ValidatedBitzRecord[]>([]);
  const [bulkJsonError, setBulkJsonError] = useState<string | null>(null);
  const [bulkImportResult, setBulkImportResult] = useState<BitzBulkImportResult | null>(null);
  const [bulkImporting, setBulkImporting] = useState<boolean>(false);

  // Available subtopics for the currently selected filter category
  const availableSubtopics = useMemo(() => {
    if (selectedCategory === 'all') return [];
    return getSubtopicsForCategory(selectedCategory);
  }, [selectedCategory]);

  // Fetch Admin Bitz List & Stats
  const loadAdminBitz = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const categoryObj = selectedCategory !== 'all' ? getCategoryById(selectedCategory) : null;
      const res = await knowledgeBitzService.getAdminBitz(
        {
          search: searchQuery,
          category: categoryObj?.name || undefined,
          topic: selectedCategory !== 'all' ? selectedCategory : undefined,
          subtopic: selectedSubtopic !== 'all' ? selectedSubtopic : undefined,
          status: selectedStatus,
          visualStatus: selectedVisualStatus,
          cefrLevel: selectedCefrLevel,
          page,
          limit: 50
        },
        token
      );
      if (res.success) {
        setBitzList(res.bitz);
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error('[AdminKnowledgeBitzSection] Load error:', err);
      setErrorMessage(err.message || 'Failed to load Knowledge Bitz catalogue.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedSubtopic, selectedStatus, selectedVisualStatus, selectedCefrLevel, page, token]);

  useEffect(() => {
    loadAdminBitz();
  }, [loadAdminBitz]);

  // Synchronize top horizontal scrollbar with facts table width dynamically
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;

    const updateWidth = () => {
      setTableScrollWidth(tableEl.scrollWidth);
      setTableClientWidth(tableEl.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(tableEl);
    if (tableEl.firstElementChild) {
      resizeObserver.observe(tableEl.firstElementChild);
    }

    return () => resizeObserver.disconnect();
  }, [bitzList, loading]);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingTable.current = true;
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (isSyncingTable.current) {
      isSyncingTable.current = false;
      return;
    }
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  // Export ALL Knowledge Bitz in database to Excel UTF-8 BOM CSV
  const handleExportCsv = async () => {
    if (exportingCsv) return;
    setExportingCsv(true);
    setErrorMessage(null);
    setExportSuccessMessage(null);

    try {
      const allBitz = await knowledgeBitzService.getAllAdminBitz(token);
      if (!allBitz || allBitz.length === 0) {
        setErrorMessage('No Knowledge Bitz records found in the database to export.');
        return;
      }

      downloadKnowledgeBitzCsv(allBitz);
      setExportSuccessMessage(`Successfully exported all ${allBitz.length} Knowledge Bitz to CSV.`);
      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('[AdminKnowledgeBitzSection] Export CSV error:', err);
      setErrorMessage(err.message || 'Failed to export Knowledge Bitz catalogue to CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBitz(null);
    setFormTitle('');
    setFormShortFact('');
    setFormReadingText('');
    setFormCategory(BITZ_CATEGORIES[0]?.name || 'Science & Nature');
    setFormSubtopic('');
    setFormDifficulty('Easy');
    setFormCefrLevel('B1');
    setFormReadingTime(30);
    setFormSource('');
    setFormQuizQuestion('');
    setFormQuizOptions(['', '', '', '']);
    setFormQuizCorrect('');
    setFormQuizExplanation('');
    setFormStatus('published'); // Default to published so it is live immediately on Explore
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (bitz: KnowledgeBitzItem) => {
    setEditingBitz(bitz);
    setFormTitle(bitz.title);
    setFormShortFact(bitz.short_fact);
    setFormReadingText(bitz.reading_text);
    setFormCategory(bitz.category || 'Science & Nature');
    setFormSubtopic(bitz.sub_topic || '');
    setFormDifficulty(bitz.difficulty);
    setFormCefrLevel(bitz.cefr_level || 'B1');
    setFormReadingTime(bitz.reading_time_sec || 30);
    setFormSource(bitz.source_citation || '');
    if (bitz.quiz && !Array.isArray(bitz.quiz)) {
      setFormQuizQuestion(bitz.quiz.question || '');
      setFormQuizOptions(bitz.quiz.options || ['', '', '', '']);
      setFormQuizCorrect(bitz.quiz.correct_answer || bitz.quiz.correctAnswer || '');
      setFormQuizExplanation(bitz.quiz.explanation || '');
    } else if (Array.isArray(bitz.quiz) && bitz.quiz.length > 0) {
      setFormQuizQuestion(bitz.quiz[0]?.question || '');
      setFormQuizOptions(bitz.quiz[0]?.options || ['', '', '', '']);
      setFormQuizCorrect(bitz.quiz[0]?.correct_answer || bitz.quiz[0]?.correctAnswer || '');
      setFormQuizExplanation(bitz.quiz[0]?.explanation || '');
    } else {
      setFormQuizQuestion('');
      setFormQuizOptions(['', '', '', '']);
      setFormQuizCorrect('');
      setFormQuizExplanation('');
    }
    setFormStatus(bitz.status);
    setCreateModalOpen(true);
  };

  // Quick 1-Click Publish / Unpublish Toggle
  const handleTogglePublish = async (bitz: KnowledgeBitzItem) => {
    const nextStatus: BitzPublishStatus = bitz.status === 'published' ? 'draft' : 'published';
    setActionLoading(`toggle-${bitz.id}`);
    try {
      await knowledgeBitzService.updateBitz(bitz.id, { status: nextStatus }, token);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 1-Click Batch Publish All Drafts
  const handlePublishAllDrafts = async () => {
    const draftItems = bitzList.filter((b) => b.status !== 'published');
    if (draftItems.length === 0) {
      alert('All facts are already published!');
      return;
    }
    if (!window.confirm(`Publish all ${draftItems.length} draft facts to the Explore feed now?`)) return;
    setActionLoading('publish-all');
    try {
      for (const b of draftItems) {
        await knowledgeBitzService.updateBitz(b.id, { status: 'published' }, token);
      }
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Batch publish failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Save Create / Edit
  const handleSaveBitz = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save');
    try {

      const quizPayload = formQuizQuestion.trim()
        ? {
            question: formQuizQuestion.trim(),
            options: formQuizOptions.map((o) => o.trim()).filter(Boolean),
            correct_answer: formQuizCorrect.trim() || formQuizOptions[0]?.trim(),
            explanation: formQuizExplanation.trim() || 'Verified answer.'
          }
        : null;

      const payload: CreateKnowledgeBitzInput = {
        title: formTitle.trim(),
        short_fact: formShortFact.trim(),
        reading_text: formReadingText.trim(),
        topic_id: 'general',
        category: formCategory,
        sub_topic: formSubtopic.trim(),
        difficulty: formDifficulty,
        cefr_level: formCefrLevel,
        reading_time_sec: formReadingTime,
        source_citation: formSource.trim() || undefined,
        quiz: quizPayload,
        status: formStatus
      };

      if (editingBitz) {
        await knowledgeBitzService.updateBitz(editingBitz.id, payload, token);
      } else {
        await knowledgeBitzService.createBitz(payload, token);
      }

      setCreateModalOpen(false);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Bitz
  const handleDeleteBitz = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this Knowledge Bitz?')) return;
    setActionLoading(id);
    try {
      await knowledgeBitzService.deleteBitz(id, token);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Gemini AI Image Generator Modal Trigger
  const handleOpenGeminiModal = (bitz: KnowledgeBitzItem) => {
    setActiveGeminiBitz(bitz);
    setGeminiPreviewUrl(bitz.visual_url || null);
    setGeminiObjectKey(bitz.visual_object_key || null);
    setGeminiCustomPrompt('');
    setGeminiModalOpen(true);
  };

  // Execute Gemini Image Generation
  const handleGenerateGemini = async () => {
    if (!activeGeminiBitz) return;
    setGeminiGenerating(true);
    try {
      const res = await knowledgeBitzService.generateGeminiImage(
        activeGeminiBitz.id,
        geminiCustomPrompt.trim() || undefined,
        token
      );
      if (res.success && res.publicUrl) {
        setGeminiPreviewUrl(res.publicUrl);
        setGeminiObjectKey(res.objectKey || null);
      }
    } catch (err: any) {
      alert(`Gemini image generation failed: ${err.message}`);
    } finally {
      setGeminiGenerating(false);
    }
  };

  // Approve Generated Gemini Image
  const handleApproveGeminiImage = async () => {
    if (!activeGeminiBitz || !geminiPreviewUrl) return;
    setActionLoading('approve-gemini');
    try {
      await knowledgeBitzService.updateBitz(
        activeGeminiBitz.id,
        {
          visual_url: geminiPreviewUrl,
          visual_object_key: geminiObjectKey,
          visual_status: 'ready'
        },
        token
      );
      setGeminiModalOpen(false);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Failed to save image: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Direct Image File Upload (WebP compression & Cloudflare R2)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bitz: KnowledgeBitzItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(`upload-${bitz.id}`);
    try {
      // 1. Get presigned R2 upload URL
      const presigned = await knowledgeBitzService.getPresignedUpload(bitz.id, file.type, token);
      if (!presigned.success || !presigned.uploadUrl) {
        throw new Error('Could not get secure upload URL from server.');
      }

      // 2. Direct PUT upload to Cloudflare R2
      const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!putRes.ok) throw new Error(`Cloudflare R2 PUT failed (${putRes.status})`);

      // 3. Update Bitz record with strict Admin upload priority
      await knowledgeBitzService.updateBitz(
        bitz.id,
        {
          visual_url: presigned.publicUrl,
          visual_object_key: presigned.objectKey,
          visual_status: 'ready',
          image_source: 'admin'
        },
        token
      );

      await loadAdminBitz();
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch or Replace image with automatic Pixabay search & R2 storage
  const handleFetchPixabay = async (bitz: KnowledgeBitzItem) => {
    setActionLoading(`pixabay-${bitz.id}`);
    try {
      await knowledgeBitzService.fetchPixabayImageForBitz(bitz.id, undefined, token);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Pixabay fetch failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Remove image from Bitz (reverts to premium animated visual)
  const handleRemoveImage = async (bitz: KnowledgeBitzItem) => {
    if (!window.confirm(`Remove image from "${bitz.title}"?`)) return;
    setActionLoading(`remove-img-${bitz.id}`);
    try {
      await knowledgeBitzService.removeBitzImage(bitz.id, token);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Failed to remove image: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk JSON input change with live validation
  const handleBulkJsonChange = (text: string) => {
    setBulkJsonText(text);
    setBulkImportResult(null);

    if (!text.trim()) {
      setBulkJsonError(null);
      setBulkValidatedRecords([]);
      return;
    }

    try {
      const parsed = JSON.parse(text.trim());
      const items = Array.isArray(parsed) ? parsed : parsed.bitz || parsed.facts || [];
      if (!Array.isArray(items) || items.length === 0) {
        setBulkJsonError('JSON must contain an array of fact objects (e.g. [ ... ] or { "bitz": [ ... ] }).');
        setBulkValidatedRecords([]);
        return;
      }
      setBulkJsonError(null);
      const { results } = validateBitzBatch(items);
      setBulkValidatedRecords(results);
    } catch (e: any) {
      setBulkJsonError(`Invalid JSON syntax: ${e.message}`);
      setBulkValidatedRecords([]);
    }
  };

  // Bulk Fact Import Submission
  const handleBulkImport = async () => {
    const importableRecords = bulkValidatedRecords
      .filter((r) => r.status !== 'error')
      .map((r) => r.canonical);

    if (importableRecords.length === 0) {
      alert('No valid records to import. Please resolve the validation errors first.');
      return;
    }

    setBulkImporting(true);
    setBulkImportResult(null);

    try {
      const res = await knowledgeBitzService.bulkImport(importableRecords, token);
      setBulkImportResult(res);
      await loadAdminBitz();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Facts</div>
            <div className="text-2xl font-black text-[#0a213c] mt-1">
              {stats.totalBitz}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Published</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {stats.publishedCount}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-blue-700 font-bold uppercase tracking-wider">Images Ready</div>
            <div className="text-2xl font-black text-[#026fc3] mt-1">
              {stats.readyImageCount}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-amber-700 font-bold uppercase tracking-wider">Missing Images</div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {stats.missingImageCount}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-purple-700 font-bold uppercase tracking-wider">Completions</div>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {stats.totalCompletions}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-rose-700 font-bold uppercase tracking-wider">Total Likes</div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {stats.totalLikes}
            </div>
          </div>
        </div>
      )}

      {/* Primary Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAiWizardOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>+ Create with AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBulkImportResult(null);
              setBulkJsonText('');
              setBulkImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-purple-500 text-[#0a213c] text-xs font-black rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-purple-600 stroke-[2.5]" />
            <span>Bulk Import (1,000+)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-[#0a213c] text-xs font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Single Fact</span>
          </button>

          {/* Export CSV Button (All Facts in database) */}
          <button
            type="button"
            disabled={exportingCsv}
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-emerald-50 border-2 border-emerald-500 hover:border-emerald-600 text-emerald-800 hover:text-emerald-900 text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Export ALL Knowledge Bitz records and 5 flattened quizzes to CSV"
          >
            {exportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <Download className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            )}
            <span>{exportingCsv ? 'Exporting CSV...' : 'Export CSV'}</span>
          </button>

          {/* Batch Publish All Drafts Button */}
          {bitzList.some((b) => b.status !== 'published') && (
            <button
              type="button"
              disabled={actionLoading === 'publish-all'}
              onClick={handlePublishAllDrafts}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-600/25"
              title="Publish all draft facts to Explore feed"
            >
              {actionLoading === 'publish-all' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Publish All Drafts ({bitzList.filter((b) => b.status !== 'published').length})</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => loadAdminBitz()}
          className="p-2 text-slate-600 hover:text-[#0a213c] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Refresh Catalogue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Responsive Filter & Search Grid (6-Column Responsive Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-100/90 p-3 rounded-2xl border border-slate-200">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, fact, code..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#0a213c] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
          />
        </div>

        {/* Main Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubtopic('all');
          }}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
        >
          <option value="all">All Categories</option>
          {BITZ_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Subtopic Filter (Dynamically adapts to selected Category) */}
        <select
          value={selectedSubtopic}
          onChange={(e) => setSelectedSubtopic(e.target.value)}
          disabled={selectedCategory === 'all' || availableSubtopics.length === 0}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25 disabled:opacity-50 disabled:bg-slate-50"
        >
          <option value="all">
            {selectedCategory === 'all' ? 'All Subtopics' : `All ${getCategoryById(selectedCategory).name}`}
          </option>
          {availableSubtopics.map((st: BitzSubtopic) => (
            <option key={st.id} value={st.name}>
              {st.name}
            </option>
          ))}
        </select>

        {/* CEFR Level Filter */}
        <select
          value={selectedCefrLevel}
          onChange={(e) => setSelectedCefrLevel(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
        >
          <option value="all">All CEFR Levels</option>
          {CEFR_LEVELS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Image Status Filter */}
        <select
          value={selectedVisualStatus}
          onChange={(e) => setSelectedVisualStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
        >
          <option value="all">All Images</option>
          <option value="ready">Images Ready</option>
          <option value="missing">Missing Images</option>
          <option value="generating">Generating</option>
          <option value="failed">Failed</option>
        </select>

        {/* Publication Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Success Banner */}
      {exportSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 font-bold rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Catalogue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden table-scroll-wrapper">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#026fc3] mb-2" />
            <span className="text-xs font-bold">Loading catalogue...</span>
          </div>
        ) : bitzList.length === 0 ? (
          <div className="p-16 text-center bg-white space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-[#026fc3] border border-blue-100 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-[#0a213c]">
                No Knowledge Bitz Found
              </h4>
              <p className="text-xs font-semibold text-slate-600 max-w-sm mx-auto mt-1 leading-relaxed">
                {searchQuery || selectedCategory !== 'all' || selectedSubtopic !== 'all' || selectedStatus !== 'all' || selectedVisualStatus !== 'all' || selectedCefrLevel !== 'all'
                  ? 'No facts match your current search and filter criteria.'
                  : 'Start building your microlearning catalogue by creating facts with AI or bulk importing records.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAiWizardOpen(true)}
                className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>+ Create with AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkImportResult(null);
                  setBulkJsonText('');
                  setBulkImportOpen(true);
                }}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-300 text-[#0a213c] text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileJson className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                <span>Bulk Import</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-[#0a213c] text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Single Fact</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Synchronized Horizontal Scroll Bar */}
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="top-horizontal-scroll overflow-x-auto overflow-y-hidden bg-slate-100 border-b border-slate-200"
              style={{
                height: '14px',
                display: tableScrollWidth > tableClientWidth ? 'block' : 'none'
              }}
              title="Drag or scroll horizontally to pan table"
              aria-label="Table horizontal scroll controller"
            >
              <div
                className="scroll-width-spacer"
                style={{
                  width: `${tableScrollWidth}px`,
                  height: '1px'
                }}
              />
            </div>

            {/* Main Table Horizontal Scroll Area */}
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="table-horizontal-scroll overflow-x-auto"
            >
              <table className="w-full text-left text-xs min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-black text-[11px]">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Image</th>
                  <th className="p-3.5">Title & Short Fact</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Subtopic</th>
                  <th className="p-3.5">CEFR</th>
                  <th className="p-3.5">Diff</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bitzList.map((bitz) => {
                  const cat = getCategoryById(bitz.category || bitz.topic_id);

                  return (
                    <tr key={bitz.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {bitz.bitz_code}
                      </td>

                      {/* Image Thumbnail & Status */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            {bitz.visual_url ? (
                              <img
                                src={bitz.visual_url}
                                alt={bitz.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            {bitz.visual_url ? (
                              bitz.image_source === 'admin' || bitz.image_source === 'manual' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200" title="Administrator Uploaded Image">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Admin Upload
                                </span>
                              ) : bitz.image_source === 'pixabay' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200" title="Automatic Pixabay Image (Stored in R2)">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Pixabay
                                </span>
                              ) : bitz.image_source === 'gemini' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200" title="Gemini AI Generated Artwork">
                                  <Sparkles className="w-3 h-3 stroke-[2.5]" /> Gemini AI
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Ready
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <AlertCircle className="w-3 h-3 stroke-[2.5]" /> No image
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Title & Short Fact */}
                      <td className="p-3.5 max-w-sm">
                        <div className="font-black text-[#0a213c] line-clamp-1 text-xs">
                          {bitz.title}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                          {bitz.short_fact}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-[#026fc3] border border-blue-100">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                      </td>

                      {/* Subtopic */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {bitz.sub_topic || '—'}
                        </span>
                      </td>

                      {/* CEFR Level */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#026fc3] border border-blue-200">
                          {bitz.cefr_level || 'B1'}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">
                          {bitz.difficulty}
                        </span>
                      </td>

                      {/* Publish Status Toggle */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(bitz)}
                          disabled={actionLoading === `toggle-${bitz.id}`}
                          title={`Click to ${bitz.status === 'published' ? 'unpublish to Draft' : 'publish immediately to Explore feed'}`}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            bitz.status === 'published'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                              : 'bg-[#026fc3] hover:bg-[#025ea6] text-white border border-blue-600 animate-pulse'
                          }`}
                        >
                          {actionLoading === `toggle-${bitz.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : bitz.status === 'published' ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Live on Explore</span>
                            </>
                          ) : (
                            <>
                              <Rocket className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Publish to Explore</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Quick Publish / Unpublish Icon */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(bitz)}
                            disabled={actionLoading === `toggle-${bitz.id}`}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              bitz.status === 'published'
                                ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                                : 'text-[#026fc3] hover:text-blue-900 hover:bg-blue-50'
                            }`}
                            title={bitz.status === 'published' ? 'Live on Explore (Click to Unpublish)' : 'Draft (Click to Publish to Explore)'}
                          >
                            <Globe className="w-4 h-4 stroke-[2.2]" />
                          </button>

                          {/* Admin Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewBitz(bitz)}
                            className="p-1.5 text-slate-600 hover:text-[#026fc3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Preview Discovery Card & Reader"
                          >
                            <Eye className="w-4 h-4 stroke-[2.2]" />
                          </button>

                          {/* Fetch / Replace with Pixabay */}
                          <button
                            type="button"
                            onClick={() => handleFetchPixabay(bitz)}
                            disabled={actionLoading === `pixabay-${bitz.id}`}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Fetch / Replace Image from Pixabay (Stored in R2)"
                          >
                            {actionLoading === `pixabay-${bitz.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                            ) : (
                              <Search className="w-4 h-4 stroke-[2.2]" />
                            )}
                          </button>

                          {/* Generate with Gemini */}
                          <button
                            type="button"
                            onClick={() => handleOpenGeminiModal(bitz)}
                            className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Generate AI Image with Gemini"
                          >
                            <Sparkles className="w-4 h-4 stroke-[2.2]" />
                          </button>

                          {/* Upload Direct Image (Admin Priority) */}
                          <label className="p-1.5 text-[#026fc3] hover:text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Upload Image (Admin Priority - Stored in R2)">
                            <Upload className="w-4 h-4 stroke-[2.2]" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, bitz)}
                            />
                          </label>

                          {/* Remove Image (if present) */}
                          {bitz.visual_url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(bitz)}
                              disabled={actionLoading === `remove-img-${bitz.id}`}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Image (Revert to No-Image Visual)"
                            >
                              <X className="w-4 h-4 stroke-[2.2]" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bitz)}
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Bitz"
                          >
                            <Edit className="w-4 h-4 stroke-[2.2]" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteBitz(bitz.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Bitz"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2.2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* CREATE / EDIT BITZ MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="text-base font-black text-[#0a213c]">
                {editingBitz ? 'Edit Knowledge Bitz' : 'Create Knowledge Bitz'}
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBitz} className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                  Title / Hook *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Why Mars Appears Red: Planetary Rust"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#0a213c] placeholder:text-slate-400 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                  Short Fact (Discovery Card) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formShortFact}
                  onChange={(e) => setFormShortFact(e.target.value)}
                  placeholder="1-2 sentences shown on the card before reader opens"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-[#0a213c] uppercase">
                    100-Word Reading Explanation *
                  </label>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    formReadingText.trim().split(/\s+/).filter(Boolean).length >= 70 && formReadingText.trim().split(/\s+/).filter(Boolean).length <= 130
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}>
                    {formReadingText.trim().split(/\s+/).filter(Boolean).length} words (Recommended: 80–120)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={formReadingText}
                  onChange={(e) => setFormReadingText(e.target.value)}
                  placeholder="Clear, simple English paragraph explaining the insight (80-120 words)"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
                  >
                    {BITZ_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                    Subtopic
                  </label>
                  <input
                    type="text"
                    value={formSubtopic}
                    onChange={(e) => setFormSubtopic(e.target.value)}
                    placeholder="e.g. World History"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                    CEFR Level
                  </label>
                  <select
                    value={formCefrLevel}
                    onChange={(e) => setFormCefrLevel(e.target.value as BitzCefrLevel)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
                  >
                    {CEFR_LEVELS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as BitzDifficulty)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                    Publication Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as BitzPublishStatus)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-[#0a213c] focus:outline-none focus:ring-2 focus:ring-[#026fc3]/25"
                  >
                    <option value="published">🚀 Published (Live on Explore Feed)</option>
                    <option value="draft">📁 Draft (Saved Privately in Admin)</option>
                    <option value="review">🔍 Under Review</option>
                    <option value="archived">📦 Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                  Source Citation
                </label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="e.g. NASA Planetary Science Division"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
                />
              </div>

              {/* Optional Quiz Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase text-[#0a213c]">
                  Optional Quiz Question (+10 XP)
                </span>
                <input
                  type="text"
                  value={formQuizQuestion}
                  onChange={(e) => setFormQuizQuestion(e.target.value)}
                  placeholder="Question text..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400"
                />

                <div className="grid grid-cols-2 gap-2">
                  {formQuizOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...formQuizOptions];
                        next[idx] = e.target.value;
                        setFormQuizOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400"
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formQuizCorrect}
                    onChange={(e) => setFormQuizCorrect(e.target.value)}
                    placeholder="Exact correct answer string..."
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    value={formQuizExplanation}
                    onChange={(e) => setFormQuizExplanation(e.target.value)}
                    placeholder="Short 1-sentence explanation..."
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'save'}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {actionLoading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Bitz</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div>
                <h3 className="text-base font-black text-[#0a213c]">
                  Bulk Fact Import (1,000+ Facts)
                </h3>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Paste JSON array of fact objects with live validation diagnostics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkImportOpen(false)}
                className="p-1.5 text-slate-500 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                  Knowledge Bitz JSON Input
                </label>
                <textarea
                  rows={6}
                  value={bulkJsonText}
                  onChange={(e) => handleBulkJsonChange(e.target.value)}
                  placeholder={`[
  {
    "title": "Why Mars Looks Red",
    "short_fact": "Mars appears distinctly red in the night sky because its surface rocks and soil are saturated with oxidized iron minerals.",
    "reading_text": "Mars looks reddish because its surface is covered in iron oxide, which is the same chemical compound found in everyday rust...",
    "category": "Science & Nature",
    "subtopic": "Space & Astronomy",
    "cefr_level": "A2",
    "quiz": [ ... 5 questions ... ]
  }
]`}
                  className="w-full font-mono text-xs p-3 bg-white border border-slate-300 rounded-xl text-[#0a213c] placeholder:text-slate-400 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3]"
                />
              </div>

              {/* JSON Error Banner */}
              {bulkJsonError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 font-bold rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{bulkJsonError}</span>
                </div>
              )}

              {/* Live Validation Summary */}
              {bulkValidatedRecords.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-black">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-slate-500 text-[10px] uppercase">Detected</div>
                      <div className="text-base text-[#0a213c] font-black">{bulkValidatedRecords.length}</div>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <div className="text-emerald-700 text-[10px] uppercase">Valid</div>
                      <div className="text-base text-emerald-700 font-black">
                        {bulkValidatedRecords.filter((r) => r.status === 'valid').length}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <div className="text-amber-800 text-[10px] uppercase">Warnings</div>
                      <div className="text-base text-amber-800 font-black">
                        {bulkValidatedRecords.filter((r) => r.status === 'warning').length}
                      </div>
                    </div>
                    <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <div className="text-rose-800 text-[10px] uppercase">Errors</div>
                      <div className="text-base text-rose-800 font-black">
                        {bulkValidatedRecords.filter((r) => r.status === 'error').length}
                      </div>
                    </div>
                  </div>

                  {/* Record Diagnostics List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {bulkValidatedRecords.map((rec, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs ${
                          rec.status === 'valid'
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            : rec.status === 'warning'
                            ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                            : 'bg-rose-50/60 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-black text-sm text-[#0a213c]">
                            {rec.status === 'valid' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                            {rec.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5]" />}
                            {rec.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />}
                            <span>#{i + 1} {rec.metrics.title}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              rec.status === 'valid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : rec.status === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {rec.status === 'error' ? 'INVALID' : 'READY TO IMPORT'}
                          </span>
                        </div>

                        {/* Metric Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-bold">
                          <span className="bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                            Category: <strong>{rec.metrics.category}</strong>
                          </span>
                          <span className="bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                            Level: <strong>{rec.metrics.cefrLevel}</strong>
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border font-extrabold ${
                            rec.metrics.shortFactWords >= 18 && rec.metrics.shortFactWords <= 35
                              ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            Short fact: {rec.metrics.shortFactWords} words {rec.metrics.shortFactWords >= 18 && rec.metrics.shortFactWords <= 35 ? '✓' : '✗'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border font-extrabold ${
                            rec.metrics.readingWords >= 80 && rec.metrics.readingWords <= 125
                              ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            Reading: {rec.metrics.readingWords} words {rec.metrics.readingWords >= 80 && rec.metrics.readingWords <= 125 ? '✓' : '✗'}
                          </span>
                          <span className="bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                            Quizzes: {rec.metrics.quizCount}/5 {rec.metrics.quizCount === 5 ? '✓' : ''}
                          </span>
                          <span className="bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                            XP: {rec.metrics.totalXp} ✓
                          </span>
                        </div>

                        {/* Issues List */}
                        {rec.issues.length > 0 && (
                          <div className="mt-2 text-[11px] font-semibold space-y-0.5">
                            {rec.issues.map((iss, j) => (
                              <div
                                key={j}
                                className={iss.type === 'error' ? 'text-rose-700' : 'text-amber-800'}
                              >
                                • {iss.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Result Banner */}
              {bulkImportResult && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-4 text-xs font-black">
                    <span className="text-emerald-700">✓ Successfully Imported: {bulkImportResult.importedCount}</span>
                    {bulkImportResult.failedCount > 0 && (
                      <span className="text-rose-700">Failed: {bulkImportResult.failedCount}</span>
                    )}
                  </div>
                  {bulkImportResult.errors.length > 0 && (
                    <div className="text-xs text-rose-700 max-h-32 overflow-y-auto space-y-1 font-medium">
                      {bulkImportResult.errors.map((err, i) => (
                        <div key={i}>
                          #{err.index} {err.title}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkImportOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={
                    bulkImporting ||
                    bulkValidatedRecords.filter((r) => r.status !== 'error').length === 0
                  }
                  onClick={handleBulkImport}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                >
                  {bulkImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>
                      Import Valid Records ({bulkValidatedRecords.filter((r) => r.status !== 'error').length})
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI AI IMAGE GENERATOR MODAL */}
      {geminiModalOpen && activeGeminiBitz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 stroke-[2.5]" />
                <h3 className="text-base font-black text-[#0a213c]">
                  Gemini AI Image Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGeminiModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-xs bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-purple-950 font-semibold">
                <strong className="font-black text-purple-900">Fact:</strong> {activeGeminiBitz.title} ({activeGeminiBitz.category})
              </div>

              {/* Image Preview Container */}
              <div className="w-full aspect-[16/10] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative shadow-inner">
                {geminiGenerating ? (
                  <div className="flex flex-col items-center justify-center text-purple-700">
                    <Loader2 className="w-10 h-10 animate-spin mb-2" />
                    <span className="text-xs font-black">Generating paper-cut artwork with Gemini...</span>
                  </div>
                ) : geminiPreviewUrl ? (
                  <img
                    src={geminiPreviewUrl}
                    alt="Generated Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-xs font-medium">
                    <ImageIcon className="w-10 h-10 mx-auto mb-1 text-slate-400" />
                    <span>Click Generate to produce visual with Gemini</span>
                  </div>
                )}
              </div>

              {/* Custom Prompt Override */}
              <div>
                <label className="block text-xs font-black text-[#0a213c] uppercase mb-1">
                  Custom Prompt (Optional)
                </label>
                <textarea
                  rows={2}
                  value={geminiCustomPrompt}
                  onChange={(e) => setGeminiCustomPrompt(e.target.value)}
                  placeholder="Leave blank for automatic paper-cut art prompt..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-[#0a213c] placeholder:text-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={geminiGenerating}
                  onClick={handleGenerateGemini}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{geminiPreviewUrl ? 'Regenerate' : 'Generate Image'}</span>
                </button>

                {geminiPreviewUrl && (
                  <button
                    type="button"
                    disabled={actionLoading === 'approve-gemini'}
                    onClick={handleApproveGeminiImage}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Use This Image (Upload to R2)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI CONTENT CREATION WIZARD (5-Step) */}
      <AiBitzCreationWizard
        isOpen={aiWizardOpen}
        onClose={() => setAiWizardOpen(false)}
        onImportComplete={() => loadAdminBitz()}
        token={token}
      />

      {/* ADMIN PREVIEW MODAL */}
      {previewBitz && (
        <KnowledgeBitzReaderModal
          bitz={previewBitz}
          isOpen={Boolean(previewBitz)}
          onClose={() => setPreviewBitz(null)}
          onLearned={() => {}}
        />
      )}
    </div>
  );
};
