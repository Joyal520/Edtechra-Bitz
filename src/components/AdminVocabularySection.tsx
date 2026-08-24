// ============================================================================
// EDTECHRA-BITZ: Unified Admin Vocabulary Content System Component
// Supports: Word of the Day, Collocation of the Day, Phrasal Verb of the Day, Idiom of the Day
// Features: Dual Gemini/Fallback JSON Validation, Bulk Image Scheduling, Publishing Queue & History
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
  Link2,
  Layers,
  Lightbulb,
  Eye,
  EyeOff,
  Plus,
  Volume2,
  Calendar,
  Clock,
  Send,
  History,
  Bot,
  Image as ImageIcon
} from 'lucide-react';
import {
  VocabularyItem,
  RawVocabularyInput,
  VocabularyContentType,
  VocabularyAdminStats,
  VocabularyValidationResult,
  VocabularyStatus,
  VocabularyPublishingQueueItem,
  VocabularyImportHistoryItem,
  GeminiStatusInfo
} from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { pronunciationService } from '@/services/pronunciationService';
import { useAuth } from '@/context/AuthContext';
import { VocabularyCard } from './PostFeed/VocabularyCard';
import { CollapsibleCatalogue } from './CollapsibleCatalogue';

const DEFAULT_VOCAB_ASSET = '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png';

const SAMPLE_TEMPLATES: Record<string, string> = {
  word: JSON.stringify(
    {
      vocabulary: [
        {
          type: "word",
          title: "meticulous",
          pronunciation: "/məˈtɪkjələs/",
          partOfSpeech: "adjective",
          meaning: "Very careful and paying great attention to every small detail.",
          example: "She is meticulous about her academic research.",
          level: "B2"
        },
        {
          type: "word",
          title: "resilience",
          pronunciation: "/rɪˈzɪl.jəns/",
          partOfSpeech: "noun",
          meaning: "The capacity to recover quickly from difficulties or setbacks.",
          example: "The students showed remarkable resilience throughout the exams.",
          level: "B2"
        }
      ]
    },
    null,
    2
  ),
  collocation: JSON.stringify(
    {
      vocabulary: [
        {
          type: "collocation",
          title: "make a decision",
          meaning: "To reach a conclusion or decide on a course of action after consideration.",
          example: "She made a firm decision to pursue higher education abroad.",
          level: "B1"
        },
        {
          type: "collocation",
          title: "heavy rain",
          meaning: "Rain that falls in large amounts with high intensity.",
          example: "We had to cancel the outdoor sports session due to heavy rain.",
          level: "A2"
        }
      ]
    },
    null,
    2
  ),
  phrasal_verb: JSON.stringify(
    {
      vocabulary: [
        {
          type: "phrasal_verb",
          title: "give up",
          meaning: "To cease making an effort; admit defeat or discontinue a habit.",
          example: "He refused to give up on solving the complex math problem.",
          level: "A2"
        },
        {
          type: "phrasal_verb",
          title: "look forward to",
          meaning: "To feel excited and pleased about something that is going to happen.",
          example: "I am looking forward to our upcoming science workshop.",
          level: "B1"
        }
      ]
    },
    null,
    2
  ),
  idiom: JSON.stringify(
    {
      vocabulary: [
        {
          type: "idiom",
          title: "break the ice",
          meaning: "To say or do something that makes people feel more relaxed and comfortable in a social setting.",
          example: "The teacher told an amusing story to break the ice on the first day of class.",
          level: "B1"
        },
        {
          type: "idiom",
          title: "piece of cake",
          meaning: "Something that is very easy to do or accomplish.",
          example: "With enough preparation, the vocabulary quiz was a piece of cake.",
          level: "A2"
        }
      ]
    },
    null,
    2
  ),
  mixed: JSON.stringify(
    [
      {
        type: "word",
        title: "diligent",
        meaning: "Working hard and carefully with steady effort.",
        example: "The diligent learner reviewed every lesson daily.",
        level: "B1"
      },
      {
        type: "collocation",
        title: "pay attention",
        meaning: "To listen or watch closely.",
        example: "Please pay attention to the teacher's instructions.",
        level: "A2"
      },
      {
        type: "phrasal_verb",
        title: "carry out",
        meaning: "To perform or complete a task or experiment.",
        example: "The students carried out the laboratory experiment safely.",
        level: "B2"
      },
      {
        type: "idiom",
        title: "burn the midnight oil",
        meaning: "To study or work late into the night.",
        example: "She burned the midnight oil to finish her essay before the deadline.",
        level: "B2"
      }
    ],
    null,
    2
  )
};

export const AdminVocabularySection: React.FC = () => {
  const { session } = useAuth();

  // Active Content Type Tab: 'word' | 'collocation' | 'phrasal_verb' | 'idiom'
  const [selectedTypeTab, setSelectedTypeTab] = useState<VocabularyContentType>('word');

  // SubTab: 'list' | 'create'
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');

  // Modals state
  const [bulkJsonModalOpen, setBulkJsonModalOpen] = useState<boolean>(false);
  const [bulkImageModalOpen, setBulkImageModalOpen] = useState<boolean>(false);
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Data & Stats State
  // --------------------------------------------------------------------------
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState<VocabularyAdminStats>({
    totalVocabulary: 0,
    wordsCount: 0,
    collocationsCount: 0,
    phrasalVerbsCount: 0,
    idiomsCount: 0,
    publishedCount: 0,
    scheduledCount: 0,
    draftCount: 0,
    pendingValidationCount: 0,
    totalLikes: 0,
    totalSaves: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');

  // --------------------------------------------------------------------------
  // Single Item Creation State
  // --------------------------------------------------------------------------
  const [singleForm, setSingleForm] = useState<RawVocabularyInput>({
    content_type: 'word',
    title: '',
    pronunciation: '',
    partOfSpeech: '',
    meaning: '',
    example: '',
    level: 'B1',
    category: '',
    status: 'published'
  });
  const [isSavingSingle, setIsSavingSingle] = useState<boolean>(false);
  const [showSinglePreview, setShowSinglePreview] = useState<boolean>(true);

  // --------------------------------------------------------------------------
  // Bulk JSON Import State
  // --------------------------------------------------------------------------
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationMode, setValidationMode] = useState<'gemini' | 'basic'>('gemini');
  const [isValidatingJSON, setIsValidatingJSON] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<VocabularyValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'replace'>('skip');

  // --------------------------------------------------------------------------
  // Bulk Image Upload & Scheduler State
  // --------------------------------------------------------------------------
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string; title: string; meaning: string; status: 'ready' | 'uploading' | 'done' | 'failed' }[]>([]);
  const [imageContentType, setImageContentType] = useState<VocabularyContentType>('word');
  const [imageScheduleMode, setImageScheduleMode] = useState<'immediate' | 'schedule'>('schedule');
  const [imageStartDate, setImageStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [imageStartTime, setImageStartTime] = useState<string>('09:00');
  const [imageIntervalHours, setImageIntervalHours] = useState<number>(6);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Publishing Queue & History State
  // --------------------------------------------------------------------------
  const [queueData, setQueueData] = useState<{
    scheduled: VocabularyPublishingQueueItem[];
    published: VocabularyPublishingQueueItem[];
    draft: VocabularyPublishingQueueItem[];
  }>({ scheduled: [], published: [], draft: [] });
  const [queueTab, setQueueTab] = useState<'scheduled' | 'published' | 'draft'>('scheduled');
  const [importHistory, setImportHistory] = useState<VocabularyImportHistoryItem[]>([]);
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatusInfo | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Edit Modal State
  // --------------------------------------------------------------------------
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [editForm, setEditForm] = useState<RawVocabularyInput>({
    title: '',
    pronunciation: '',
    partOfSpeech: '',
    meaning: '',
    example: '',
    level: '',
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
      const data = await vocabularyService.getAdminVocabulary(
        {
          type: selectedTypeTab,
          search: searchQuery,
          status: statusFilter,
          validationStatus: validationFilter
        },
        token
      );
      setItems(data.items || data.words || []);
      setStats(data.stats);

      // Load Gemini status
      const gStatus = await vocabularyService.getGeminiStatus(token);
      setGeminiStatus(gStatus);
    } catch (err: any) {
      console.error('Error loading Vocabulary admin data:', err);
      showToast(err.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, selectedTypeTab, searchQuery, statusFilter, validationFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep singleForm & imageContentType synced with selected content type
  useEffect(() => {
    setSingleForm((prev) => ({
      ...prev,
      content_type: selectedTypeTab,
      type: selectedTypeTab
    }));
    setImageContentType(selectedTypeTab);
  }, [selectedTypeTab]);

  // Handle Single Item Creation
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleVal = (singleForm.title || singleForm.word || '').trim();
    const meaningVal = (singleForm.meaning || singleForm.definition || '').trim();
    const exampleVal = (singleForm.example || '').trim();

    if (!titleVal || !meaningVal || !exampleVal) {
      showToast('Title, Meaning, and Example are required.', 'error');
      return;
    }

    setIsSavingSingle(true);
    try {
      const token = session?.access_token || null;
      const created = await vocabularyService.createVocabulary({
        ...singleForm,
        content_type: selectedTypeTab,
        title: titleVal,
        word: titleVal,
        meaning: meaningVal,
        example: exampleVal
      }, token);
      showToast(`${getTypeBadgeLabel(selectedTypeTab)} "${created.title}" created successfully!`, 'success');
      setSingleForm({
        content_type: selectedTypeTab,
        title: '',
        pronunciation: '',
        partOfSpeech: '',
        meaning: '',
        example: '',
        level: 'B1',
        category: '',
        status: 'published'
      });
      setActiveSubTab('list');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create item.', 'error');
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
      setValidationError('Please paste JSON before validating.');
      return;
    }

    let parsedList: any[] = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) parsedList = parsed;
      else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.vocabulary)) parsedList = parsed.vocabulary;
        else if (Array.isArray(parsed.words)) parsedList = parsed.words;
        else if (Array.isArray(parsed.items)) parsedList = parsed.items;
      }
    } catch (err: any) {
      setValidationError(`Invalid JSON syntax: ${err.message}.`);
      return;
    }

    if (parsedList.length === 0) {
      setValidationError('No items found in JSON array.');
      return;
    }

    setIsValidatingJSON(true);
    try {
      const token = session?.access_token || null;
      const res = await vocabularyService.validateBatch(
        parsedList,
        selectedTypeTab,
        validationMode,
        token
      );
      setValidationResult(res);
      if (res.fallbackNotice) {
        showToast('Gemini unavailable. Switched automatically to local fallback.', 'error');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Validation failed.');
    } finally {
      setIsValidatingJSON(false);
    }
  };

  // Handle Commit Import of Valid Items
  const handleImportValidItems = async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      showToast('No valid items to import.', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validationResult.valid.length });

    try {
      const token = session?.access_token || null;
      const res = await vocabularyService.importBatch(
        validationResult.valid,
        {
          defaultType: selectedTypeTab,
          duplicateAction,
          fileName: 'bulk_import.json',
          onProgress: (current, total) => setImportProgress({ current, total })
        },
        token
      );

      if (res.success) {
        showToast(`Successfully imported ${res.importedCount} vocabulary records!`, 'success');
        setJsonInput('');
        setValidationResult(null);
        setBulkJsonModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Bulk import failed.', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // Image Selection Handler
  const handleSelectImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f, idx) => {
      const baseName = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      return {
        file: f,
        preview: URL.createObjectURL(f),
        title: baseName || `Image ${idx + 1}`,
        meaning: `Visual learning lesson for ${baseName}.`,
        status: 'ready' as const
      };
    });
    setImageFiles((prev) => [...prev, ...newItems]);
  };

  // Upload & Schedule Images
  const handleUploadAndScheduleImages = async () => {
    if (imageFiles.length === 0) {
      showToast('Please select images to upload.', 'error');
      return;
    }

    setIsUploadingImages(true);
    try {
      const token = session?.access_token || null;
      // In web app, we mock or upload to R2 public URL
      const payloadImages = imageFiles.map((img) => ({
        filename: img.file.name,
        publicUrl: img.preview, // Will be replaced by R2 upload URL or asset
        title: img.title,
        meaning: img.meaning,
        example: `Study the image for ${img.title}.`
      }));

      const res = await vocabularyService.scheduleBulkImages(
        {
          images: payloadImages,
          contentType: imageContentType,
          scheduleMode: imageScheduleMode,
          startDate: imageStartDate,
          startTime: imageStartTime,
          intervalHours: imageIntervalHours
        },
        token
      );

      showToast(`Successfully ${imageScheduleMode === 'schedule' ? 'scheduled' : 'published'} ${res.totalScheduled} images!`, 'success');
      setImageFiles([]);
      setBulkImageModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Image upload and schedule failed.', 'error');
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Fetch Queue Data
  const handleOpenQueue = async () => {
    setQueueModalOpen(true);
    try {
      const token = session?.access_token || null;
      const q = await vocabularyService.getPublishingQueue(token);
      setQueueData(q);
    } catch (err: any) {
      showToast(err.message || 'Failed to load publishing queue.', 'error');
    }
  };

  // Fetch History Data
  const handleOpenHistory = async () => {
    setHistoryModalOpen(true);
    try {
      const token = session?.access_token || null;
      const hist = await vocabularyService.getImportHistory(token);
      setImportHistory(hist);
    } catch (err: any) {
      showToast(err.message || 'Failed to load import history.', 'error');
    }
  };

  // Test Gemini Connection
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    try {
      const token = session?.access_token || null;
      const res = await vocabularyService.testGeminiConnection(token);
      setGeminiStatus(res);
      if (res.isConnected) {
        showToast('Gemini AI connection successful!', 'success');
      } else {
        showToast('Gemini unavailable. Fallback validation active.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to test Gemini.', 'error');
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: VocabularyItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = session?.access_token || null;
      await vocabularyService.deleteVocabulary(item.id, token);
      showToast(`"${item.title}" deleted.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item.', 'error');
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (item: VocabularyItem, newStatus: VocabularyStatus) => {
    try {
      const token = session?.access_token || null;
      await vocabularyService.updateVocabulary(item.id, { status: newStatus }, token);
      showToast(`Status updated to ${newStatus}.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: VocabularyItem) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || item.word || '',
      pronunciation: item.pronunciation || item.phonetic || '',
      partOfSpeech: item.part_of_speech || '',
      meaning: item.meaning || item.definition || '',
      example: item.example,
      level: item.level || 'B1',
      status: item.status
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const token = session?.access_token || null;
      await vocabularyService.updateVocabulary(
        editingItem.id,
        {
          title: (editForm.title || '').trim(),
          word: (editForm.title || '').trim(),
          pronunciation: editForm.pronunciation ? editForm.pronunciation.trim() : null,
          part_of_speech: editForm.partOfSpeech ? editForm.partOfSpeech.trim() : null,
          meaning: (editForm.meaning || '').trim(),
          definition: (editForm.meaning || '').trim(),
          example: (editForm.example || '').trim(),
          level: editForm.level ? editForm.level.trim() : null,
          status: editForm.status
        },
        token
      );
      showToast(`"${editForm.title}" updated successfully!`, 'success');
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update item.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Copy template helper
  const handleCopyTemplate = (key: string) => {
    const text = SAMPLE_TEMPLATES[key] || SAMPLE_TEMPLATES.word;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedTemplate(true);
        setTimeout(() => setCopiedTemplate(false), 2000);
      });
    }
  };

  // Live preview mock object
  const previewItemMock: VocabularyItem = {
    id: 'preview_mock',
    content_type: selectedTypeTab,
    title: (singleForm.title || singleForm.word || '').trim() || getSampleDefaultTitle(selectedTypeTab),
    meaning: (singleForm.meaning || singleForm.definition || '').trim() || 'Clear definition and meaning for educational learners.',
    example: (singleForm.example || '').trim() || 'An illustrative example sentence demonstrating natural usage.',
    pronunciation: singleForm.pronunciation?.trim() || '/prəˌnʌn.siˈeɪ.ʃən/',
    level: singleForm.level || 'B1',
    part_of_speech: singleForm.partOfSpeech || (selectedTypeTab === 'word' ? 'noun' : undefined),
    status: singleForm.status || 'published',
    validation_status: 'manually_approved',
    validation_provider: 'manual',
    image_url: DEFAULT_VOCAB_ASSET,
    likes_count: 0,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Navigation Tabs */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
              <BookA className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0f233a] tracking-tight">
                Vocabulary Content System
              </h2>
              <p className="text-xs text-slate-500">
                Words, Collocations, Phrasal Verbs & Idioms with Gemini AI validation & automatic fallback.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab(activeSubTab === 'create' ? 'list' : 'create')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'create'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{activeSubTab === 'create' ? 'View Content' : '+ Create Content'}</span>
            </button>

            <button
              onClick={() => {
                setJsonInput(SAMPLE_TEMPLATES[selectedTypeTab] || SAMPLE_TEMPLATES.word);
                setBulkJsonModalOpen(true);
              }}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk JSON Import</span>
            </button>

            <button
              onClick={() => setBulkImageModalOpen(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Bulk Image Upload</span>
            </button>

            <button
              onClick={handleOpenQueue}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Publishing Queue"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Queue ({stats.scheduledCount})</span>
            </button>

            <button
              onClick={handleOpenHistory}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Import History"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>History</span>
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
              title="Refresh Vocabulary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Content Type Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <button
            onClick={() => setSelectedTypeTab('word')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTypeTab === 'word'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border border-stone-200/70'
            }`}
          >
            <BookA className="w-3.5 h-3.5" />
            <span>Word of the Day</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              selectedTypeTab === 'word' ? 'bg-amber-200 text-slate-950' : 'bg-stone-200 text-slate-700'
            }`}>
              {stats.wordsCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('collocation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTypeTab === 'collocation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/60'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Collocation of the Day</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              selectedTypeTab === 'collocation' ? 'bg-blue-200 text-blue-950' : 'bg-blue-100 text-blue-800'
            }`}>
              {stats.collocationsCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('phrasal_verb')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTypeTab === 'phrasal_verb'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Phrasal Verb of the Day</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              selectedTypeTab === 'phrasal_verb' ? 'bg-purple-200 text-purple-950' : 'bg-purple-100 text-purple-800'
            }`}>
              {stats.phrasalVerbsCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedTypeTab('idiom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTypeTab === 'idiom'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/60'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Idiom of the Day</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              selectedTypeTab === 'idiom' ? 'bg-teal-200 text-teal-950' : 'bg-teal-100 text-teal-800'
            }`}>
              {stats.idiomsCount}
            </span>
          </button>
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

        {/* Admin Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-slate-500">Total Vocab</div>
            <div className="text-lg font-black text-[#0f233a] mt-0.5">{stats.totalVocabulary}</div>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-amber-700">Words</div>
            <div className="text-lg font-black text-amber-900 mt-0.5">{stats.wordsCount}</div>
          </div>
          <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-blue-700">Collocations</div>
            <div className="text-lg font-black text-blue-900 mt-0.5">{stats.collocationsCount}</div>
          </div>
          <div className="bg-purple-50/70 border border-purple-200/70 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-purple-700">Phrasal Verbs</div>
            <div className="text-lg font-black text-purple-900 mt-0.5">{stats.phrasalVerbsCount}</div>
          </div>
          <div className="bg-teal-50/70 border border-teal-200/70 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-teal-700">Idioms</div>
            <div className="text-lg font-black text-teal-900 mt-0.5">{stats.idiomsCount}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-emerald-700">Published</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">{stats.publishedCount}</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-indigo-700">Scheduled</div>
            <div className="text-lg font-black text-indigo-900 mt-0.5">{stats.scheduledCount}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-black uppercase text-rose-700">Likes</div>
            <div className="text-lg font-black text-rose-900 mt-0.5">{stats.totalLikes}</div>
          </div>
        </div>

        {/* Gemini AI Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-700">Gemini AI Linguistic Validator:</span>
            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
              geminiStatus?.isConnected
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {geminiStatus?.isConnected ? 'Connected (Active)' : 'Unavailable (Local Fallback Active)'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {geminiStatus?.maskedApiKey ? `Key: ${geminiStatus.maskedApiKey}` : 'Key: [Auto-fallback]'}
            </span>
          </div>

          <button
            onClick={handleTestGemini}
            disabled={isTestingGemini}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            {isTestingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
            <span>Test Connection</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUBTAB: CREATE CONTENT WITH LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'create' && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base font-black text-[#0f233a]">
                Create {getTypeBadgeLabel(selectedTypeTab)}
              </h3>
              <p className="text-xs text-slate-500">
                Add a new entry. The live feed card updates dynamically.
              </p>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    {getTypeTitleFieldLabel(selectedTypeTab)} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={getSampleDefaultTitle(selectedTypeTab)}
                    value={singleForm.title || singleForm.word || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value, word: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">CEFR Level</label>
                  <select
                    value={singleForm.level || 'B1'}
                    onChange={(e) => setSingleForm({ ...singleForm, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="A1">A1 — Beginner</option>
                    <option value="A2">A2 — Elementary</option>
                    <option value="B1">B1 — Intermediate</option>
                    <option value="B2">B2 — Upper Intermediate</option>
                    <option value="C1">C1 — Advanced</option>
                    <option value="C2">C2 — Proficiency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">IPA / Phonetic</label>
                  <input
                    type="text"
                    placeholder="e.g. /məˈtɪkjələs/"
                    value={singleForm.pronunciation || singleForm.phonetic || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, pronunciation: e.target.value, phonetic: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Status</label>
                  <select
                    value={singleForm.status || 'published'}
                    onChange={(e) => setSingleForm({ ...singleForm, status: e.target.value as VocabularyStatus })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="published">Published (Visible in Feed)</option>
                    <option value="draft">Draft (Admin Only)</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {selectedTypeTab === 'word' && (
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Part of Speech</label>
                  <input
                    type="text"
                    placeholder="e.g. noun, adjective, verb"
                    value={singleForm.partOfSpeech || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, partOfSpeech: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Meaning / Definition *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Clear educational meaning..."
                  value={singleForm.meaning || singleForm.definition || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, meaning: e.target.value, definition: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Example Sentence *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Sentence demonstrating the usage..."
                  value={singleForm.example || ''}
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
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Save & Publish</span>
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
                  <span>Live Feed Card Preview ({getTypeBadgeLabel(selectedTypeTab)})</span>
                </div>
                <VocabularyCard item={previewItemMock} />
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MAIN LIST: TABLE / ITEMS (Collapsible by default) */}
      {/* ========================================================================= */}
      {activeSubTab === 'list' && (
        <CollapsibleCatalogue
          title={`${getTypeBadgeLabel(selectedTypeTab)} Catalogue`}
          count={items.length}
          icon={<BookA className="w-4 h-4 text-amber-600" />}
          subtitle={`Manage, search, and review all ${getTypeBadgeLabel(selectedTypeTab).toLowerCase()} records.`}
        >
          {/* List Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[#0f233a]">
                {getTypeBadgeLabel(selectedTypeTab)} Records Directory
              </h4>
              <p className="text-[11px] text-slate-500">
                Filtered: {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search title, meaning..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={validationFilter}
                onChange={(e) => setValidationFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="all">All Validations</option>
                <option value="gemini_validated">Gemini AI Verified</option>
                <option value="fallback_validated">Fallback Validated</option>
                <option value="manually_approved">Manually Approved</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-stone-200/80 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80">
                <tr className="text-slate-500 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-3">Title / Entry</th>
                  <th className="py-3 px-3">Meaning & Example</th>
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3">Validation</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading vocabulary data...</span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const title = item.title || item.word || 'Vocabulary';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Title & Pronunciation */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{title}</span>
                              <button
                                onClick={() => pronunciationService.speak(title)}
                                className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                                title="Listen"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            </div>
                            {(item.pronunciation || item.phonetic) && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {item.pronunciation || item.phonetic}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Meaning & Example */}
                        <td className="py-3 px-3 max-w-sm">
                          <div className="space-y-0.5">
                            <div className="text-slate-700 line-clamp-1">{item.meaning || item.definition}</div>
                            <div className="text-[10px] text-slate-400 italic line-clamp-1 font-serif">
                              "{item.example}"
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="py-3 px-3">
                          {item.level ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                              {item.level}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Validation */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.validation_provider === 'gemini'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : item.validation_provider === 'local_fallback'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {item.validation_provider === 'gemini' ? (
                              <>
                                <Bot className="w-2.5 h-2.5" />
                                <span>AI Verified</span>
                              </>
                            ) : item.validation_provider === 'local_fallback' ? (
                              <>
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Fallback</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-2.5 h-2.5" />
                                <span>Manual</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <select
                            value={item.status}
                            onChange={(e) => handleToggleStatus(item, e.target.value as VocabularyStatus)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent cursor-pointer focus:outline-none ${
                              item.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 hover:border-emerald-300'
                                : item.status === 'scheduled'
                                ? 'bg-indigo-100 text-indigo-800 hover:border-indigo-300'
                                : item.status === 'draft'
                                ? 'bg-amber-100 text-amber-800 hover:border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <option value="published">published</option>
                            <option value="scheduled">scheduled</option>
                            <option value="draft">draft</option>
                            <option value="archived">archived</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </CollapsibleCatalogue>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BULK JSON IMPORT */}
      {/* ========================================================================= */}
      {bulkJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-xl space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f233a]">Bulk JSON Import</h3>
                <p className="text-xs text-slate-500">
                  Upload or paste up to 1,000 entries for {getTypeBadgeLabel(selectedTypeTab)}.
                </p>
              </div>
              <button
                onClick={() => setBulkJsonModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Mode Selector */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-black text-slate-700 block">Validation Pipeline:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                  validationMode === 'gemini' ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-300' : 'bg-white border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="valMode"
                    checked={validationMode === 'gemini'}
                    onChange={() => setValidationMode('gemini')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Gemini AI Validation (Recommended)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Linguistic quality check with automatic local fallback if unavailable.
                    </p>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                  validationMode === 'basic' ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="valMode"
                    checked={validationMode === 'basic'}
                    onChange={() => setValidationMode('basic')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Basic Validation Only</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deterministic structural schema validation without calling AI.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sample Schema Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Load sample:</span>
              <button
                onClick={() => setJsonInput(SAMPLE_TEMPLATES[selectedTypeTab] || SAMPLE_TEMPLATES.word)}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                {getTypeBadgeLabel(selectedTypeTab)}
              </button>
              <button
                onClick={() => setJsonInput(SAMPLE_TEMPLATES.mixed)}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Mixed 4-Type Array
              </button>
              <button
                onClick={() => handleCopyTemplate(selectedTypeTab)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer ml-auto flex items-center gap-1"
              >
                {copiedTemplate ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTemplate ? 'Copied' : 'Copy Schema'}</span>
              </button>
            </div>

            {/* JSON Textarea */}
            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON array here..."
              className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-800 leading-relaxed"
            />

            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Validation Error</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">{validationError}</div>
                </div>
              </div>
            )}

            {/* Validate Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleValidateJSON}
                disabled={isValidatingJSON || !jsonInput.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {isValidatingJSON ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating batch…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Validate & Preview Batch</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setJsonInput('');
                  setValidationResult(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Validation Report */}
            {validationResult && (
              <div className="space-y-4 pt-4 border-t border-stone-100 animate-in fade-in">
                
                {validationResult.fallbackNotice && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Gemini validation unavailable — Local fallback active</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {validationResult.fallbackNotice}
                    </p>
                  </div>
                )}

                {/* Counts Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="text-base font-black text-slate-900">{validationResult.totalDetected}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Valid</div>
                    <div className="text-base font-black text-emerald-900">{validationResult.validCount}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-amber-700 uppercase">In-Batch Dups</div>
                    <div className="text-base font-black text-amber-900">{validationResult.inBatchDuplicateCount}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-blue-700 uppercase">In DB</div>
                    <div className="text-base font-black text-blue-900">{validationResult.existingCount}</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Invalid</div>
                    <div className="text-base font-black text-rose-900">{validationResult.invalidCount}</div>
                  </div>
                </div>

                {/* Duplicate Action Setting */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Action for Existing Duplicates:</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAct"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                      />
                      <span>Skip (Recommended)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAct"
                        checked={duplicateAction === 'replace'}
                        onChange={() => setDuplicateAction('replace')}
                      />
                      <span>Replace</span>
                    </label>
                  </div>
                </div>

                {/* Commit Import Button & Progress */}
                <div className="space-y-2">
                  {importProgress && (
                    <div className="space-y-1 bg-stone-100 p-3 rounded-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Import Progress</span>
                        <span>{importProgress.current} / {importProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.round((importProgress.current / importProgress.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-stone-50 border border-stone-200 p-4 rounded-2xl">
                    <div>
                      <div className="text-xs font-black text-[#0f233a]">
                        Ready to commit {validationResult.validCount} valid records?
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Validation provider: {validationResult.geminiValidatedCount > 0 ? 'Gemini AI' : 'Local Fallback'}
                      </p>
                    </div>

                    <button
                      onClick={handleImportValidItems}
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
                          <span>IMPORT {validationResult.validCount} VALID ITEMS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK IMAGE UPLOAD & SCHEDULER */}
      {/* ========================================================================= */}
      {bulkImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-xl space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f233a]">Bulk Image Upload & Scheduler</h3>
                <p className="text-xs text-slate-500">
                  Upload multiple visual cards. Admin reviewed — NO AI quota wasted.
                </p>
              </div>
              <button
                onClick={() => setBulkImageModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop Zone */}
            <div className="p-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl text-center space-y-2 transition-colors cursor-pointer bg-slate-50/50">
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => handleSelectImages(e.target.files)}
                className="hidden"
                id="bulk-image-input"
              />
              <label htmlFor="bulk-image-input" className="cursor-pointer block space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  Drop images here or <span className="text-amber-600 underline">browse files</span>
                </div>
                <p className="text-[10px] text-slate-400">Supported: JPG, PNG, WebP (Max 15MB each)</p>
              </label>
            </div>

            {/* Content Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Target Content Type:</label>
                <select
                  value={imageContentType}
                  onChange={(e) => setImageContentType(e.target.value as VocabularyContentType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value="word">Word of the Day</option>
                  <option value="collocation">Collocation of the Day</option>
                  <option value="phrasal_verb">Phrasal Verb of the Day</option>
                  <option value="idiom">Idiom of the Day</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Publishing Mode:</label>
                <select
                  value={imageScheduleMode}
                  onChange={(e) => setImageScheduleMode(e.target.value as 'immediate' | 'schedule')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value="schedule">Schedule Publishing</option>
                  <option value="immediate">Publish Immediately</option>
                </select>
              </div>
            </div>

            {/* Scheduling Controls */}
            {imageScheduleMode === 'schedule' && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl space-y-3 text-xs">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Publishing Schedule (Sri Lanka Time +05:30)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-800">Start Date</label>
                    <input
                      type="date"
                      value={imageStartDate}
                      onChange={(e) => setImageStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-800">Start Time</label>
                    <input
                      type="time"
                      value={imageStartTime}
                      onChange={(e) => setImageStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-800">Interval</label>
                    <select
                      value={imageIntervalHours}
                      onChange={(e) => setImageIntervalHours(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl font-bold cursor-pointer"
                    >
                      <option value={1}>Every 1 hour</option>
                      <option value={2}>Every 2 hours</option>
                      <option value={4}>Every 4 hours</option>
                      <option value={6}>Every 6 hours</option>
                      <option value={12}>Every 12 hours</option>
                      <option value={24}>Every 24 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Images List */}
            {imageFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700">
                  Selected Images ({imageFiles.length}):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {imageFiles.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <img src={img.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <input
                        type="text"
                        value={img.title}
                        onChange={(e) => {
                          const updated = [...imageFiles];
                          updated[idx].title = e.target.value;
                          setImageFiles(updated);
                        }}
                        placeholder="Title / Caption"
                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <button
                        onClick={() => setImageFiles(imageFiles.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setBulkImageModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAndScheduleImages}
                disabled={isUploadingImages || imageFiles.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isUploadingImages ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{imageScheduleMode === 'schedule' ? `Schedule ${imageFiles.length} Images` : `Publish ${imageFiles.length} Images`}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PUBLISHING QUEUE */}
      {/* ========================================================================= */}
      {queueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f233a]">Publishing Queue</h3>
                <p className="text-xs text-slate-500">Upcoming automated feed releases.</p>
              </div>
              <button
                onClick={() => setQueueModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Queue Tabs */}
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2 text-xs">
              <button
                onClick={() => setQueueTab('scheduled')}
                className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                  queueTab === 'scheduled' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Upcoming / Scheduled ({queueData.scheduled.length})
              </button>
              <button
                onClick={() => setQueueTab('published')}
                className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                  queueTab === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Published ({queueData.published.length})
              </button>
              <button
                onClick={() => setQueueTab('draft')}
                className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                  queueTab === 'draft' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Drafts ({queueData.draft.length})
              </button>
            </div>

            {/* Queue Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(queueTab === 'scheduled' ? queueData.scheduled : (queueTab === 'published' ? queueData.published : queueData.draft)).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No items in this queue section.
                </div>
              ) : (
                (queueTab === 'scheduled' ? queueData.scheduled : (queueTab === 'published' ? queueData.published : queueData.draft)).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs gap-3">
                    <div className="flex items-center gap-2.5">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.title}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-extrabold uppercase">
                            {item.content_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{item.meaning}</div>
                        {item.scheduled_at && (
                          <div className="text-[10px] text-indigo-700 font-bold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Release: {new Date(item.scheduled_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {queueTab === 'scheduled' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            await vocabularyService.publishNow(item.id, session?.access_token || null);
                            showToast(`"${item.title}" published now!`, 'success');
                            handleOpenQueue();
                            loadData();
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Publish Now
                        </button>
                        <button
                          onClick={async () => {
                            await vocabularyService.cancelSchedule(item.id, session?.access_token || null);
                            showToast(`"${item.title}" cancelled (moved to draft).`, 'success');
                            handleOpenQueue();
                            loadData();
                          }}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IMPORT HISTORY */}
      {/* ========================================================================= */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f233a]">Import Batch History</h3>
                <p className="text-xs text-slate-500">Audit logs of all vocabulary imports.</p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {importHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No import batch records logged yet.
                </div>
              ) : (
                importHistory.map((h) => (
                  <div key={h.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.file_name || 'bulk_import.json'}</span>
                      <span className="font-mono text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <span>Total: <strong>{h.total_records}</strong></span>
                      <span className="text-emerald-700">Success: <strong>{h.successful_count}</strong></span>
                      <span className="text-amber-700">Duplicates: <strong>{h.duplicate_count}</strong></span>
                      <span className="text-rose-700">Rejected: <strong>{h.rejected_count}</strong></span>
                      <span>AI: <strong>{h.gemini_validated_count}</strong></span>
                      <span>Fallback: <strong>{h.fallback_validated_count}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT VOCABULARY ITEM */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-[#0f233a]">Edit Vocabulary Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Title / Word</label>
                <input
                  type="text"
                  required
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pronunciation</label>
                  <input
                    type="text"
                    value={editForm.pronunciation || ''}
                    onChange={(e) => setEditForm({ ...editForm, pronunciation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Level</label>
                  <input
                    type="text"
                    value={editForm.level || ''}
                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Meaning</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.meaning || ''}
                  onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Example</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.example || ''}
                  onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black cursor-pointer"
                >
                  {isSavingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

function getTypeBadgeLabel(type: VocabularyContentType): string {
  switch (type) {
    case 'collocation': return 'Collocation of the Day';
    case 'phrasal_verb': return 'Phrasal Verb of the Day';
    case 'idiom': return 'Idiom of the Day';
    case 'word':
    default: return 'Word of the Day';
  }
}

function getTypeTitleFieldLabel(type: VocabularyContentType): string {
  switch (type) {
    case 'collocation': return 'Collocation (e.g. "make a decision")';
    case 'phrasal_verb': return 'Phrasal Verb (e.g. "give up")';
    case 'idiom': return 'Idiom (e.g. "break the ice")';
    case 'word':
    default: return 'Word (e.g. "meticulous")';
  }
}

function getSampleDefaultTitle(type: VocabularyContentType): string {
  switch (type) {
    case 'collocation': return 'Make a decision';
    case 'phrasal_verb': return 'Give up';
    case 'idiom': return 'Break the ice';
    case 'word':
    default: return 'Meticulous';
  }
}
