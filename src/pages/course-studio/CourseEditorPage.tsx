// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIGITAL COURSE STUDIO EDITOR
// Teacher-controlled content authoring, composite rich media blocks,
// Question Planning (v1.0 schema), prompt generation, JSON validation & import,
// with maximum 10 units support and digital textbook typography (14px).
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  MoveUp,
  MoveDown,
  Copy,
  Layers,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Play,
  UploadCloud,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import {
  Course,
  CourseBlock,
  CourseEpisode,
  CourseQuestion,
  BlockType,
  QuestionType
} from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { QuestionPlanModal } from '@/components/course-studio/QuestionPlanModal';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';

export const CourseEditorPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Core Course & Selection State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Active Episode Content State
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [currentBlocks, setCurrentBlocks] = useState<CourseBlock[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<CourseQuestion[]>([]);

  // UI Modals & Panels State
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [showQuestionPlanModal, setShowQuestionPlanModal] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'ai' | 'settings'>('ai');
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(null);

  // Status & Feedback State
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'unsaved' | 'retrying'>('saved');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Autosave tracking refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const lastSavedSignatureRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadBlockIndexRef = useRef<number | null>(null);

  // --------------------------------------------------------------------------
  // INITIAL DATA LOADING
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (courseId) {
      loadCourseData(courseId);
    }
  }, [courseId]);

  const normalizeBlocks = (blocks: CourseBlock[]): CourseBlock[] => {
    return (blocks || []).map(b => {
      if (b.block_type === 'text' && (b.content as any)?.image?.url) {
        return { ...b, block_type: 'text_image' as BlockType };
      }
      if (b.block_type === 'text' && (b.content as any)?.video?.url) {
        return { ...b, block_type: 'text_video' as BlockType };
      }
      return b;
    });
  };

  const loadCourseData = async (id: string) => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await courseStudioService.getCourse(id);
      setCourse(data);

      // Auto-expand all units
      const initialExpanded: Record<string, boolean> = {};
      (data.units || []).forEach(u => {
        initialExpanded[u.id] = true;
      });
      setExpandedUnits(initialExpanded);

      // Select first unit and first episode
      const firstUnit = data.units?.[0];
      if (firstUnit) {
        const firstEp = firstUnit.episodes?.[0];
        if (firstEp) {
          selectEpisode(firstEp, firstUnit.id);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  const selectEpisode = (ep: CourseEpisode, unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedEpisodeId(ep.id);
    setEpisodeTitle(ep.title);
    setEstimatedMinutes(ep.estimated_minutes || 15);
    const normalized = normalizeBlocks(ep.blocks || []);
    const questions = ep.questions || [];
    setCurrentBlocks(normalized);
    setCurrentQuestions(questions);
    
    // Initialize signature so newly loaded episode starts in 'saved' state
    lastSavedSignatureRef.current = JSON.stringify({
      title: ep.title,
      estimated_minutes: ep.estimated_minutes || 15,
      blocks: normalized,
      questions
    });
    setSavingStatus('saved');
  };

  // --------------------------------------------------------------------------
  // NON-BLOCKING DEBOUNCED BACKGROUND AUTOSAVE ENGINE
  // --------------------------------------------------------------------------
  const currentSignature = JSON.stringify({
    title: episodeTitle,
    estimated_minutes: estimatedMinutes,
    blocks: currentBlocks,
    questions: currentQuestions
  });

  const performBackgroundSave = async (isManual = false) => {
    if (!course || !selectedEpisodeId || isSavingRef.current) return;

    const signatureToSave = currentSignature;
    if (!isManual && signatureToSave === lastSavedSignatureRef.current) {
      setSavingStatus('saved');
      return;
    }

    isSavingRef.current = true;
    setSavingStatus('saving');

    try {
      await courseStudioService.updateEpisode(course.id, selectedEpisodeId, {
        title: episodeTitle,
        estimated_minutes: estimatedMinutes,
        episode_type: 'lesson',
        order_index: 0
      });

      await courseStudioService.saveEpisodeBlocks(course.id, selectedEpisodeId, currentBlocks);
      await courseStudioService.saveEpisodeQuestions(course.id, selectedEpisodeId, currentQuestions);

      lastSavedSignatureRef.current = signatureToSave;
      retryCountRef.current = 0;
      setSavingStatus('saved');

      if (isManual) {
        setSuccessBanner('Changes saved successfully.');
        setTimeout(() => setSuccessBanner(null), 2500);
      }
    } catch (err: any) {
      console.warn('[Autosave] Background save error, scheduling retry:', err.message);
      setSavingStatus('retrying');

      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        saveTimeoutRef.current = setTimeout(() => {
          performBackgroundSave(false);
        }, 3000);
      } else {
        setSavingStatus('unsaved');
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  // Debounced trigger whenever in-memory data changes
  useEffect(() => {
    if (!course || !selectedEpisodeId || loading) return;

    if (currentSignature === lastSavedSignatureRef.current) {
      return;
    }

    setSavingStatus('unsaved');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performBackgroundSave(false);
    }, 1800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentSignature, selectedEpisodeId, course?.id, loading]);

  // --------------------------------------------------------------------------
  // OUTLINE ACTIONS (UNITS & EPISODES) — MAX 10 UNITS
  // --------------------------------------------------------------------------

  const handleAddUnit = async () => {
    if (!course) return;

    // Strict 10 units maximum rule
    if ((course.units?.length || 0) >= 10) {
      setErrorBanner('Maximum of 10 units reached.');
      return;
    }

    try {
      const newUnit = await courseStudioService.createUnit(course.id, {
        title: `Unit ${(course.units?.length || 0) + 1}`,
        order_index: course.units?.length || 0
      });

      const updatedUnits = [...(course.units || []), newUnit];
      setCourse({ ...course, units: updatedUnits });
      setSelectedUnitId(newUnit.id);
      setExpandedUnits(prev => ({ ...prev, [newUnit.id]: true }));

      if (newUnit.episodes?.[0]) {
        selectEpisode(newUnit.episodes[0], newUnit.id);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to add unit.');
    }
  };

  const handleAddEpisode = async (unitId: string) => {
    if (!course) return;
    const targetUnit = course.units?.find(u => u.id === unitId);
    const orderIndex = targetUnit?.episodes?.length || 0;

    try {
      const newEp = await courseStudioService.createEpisode(course.id, {
        unit_id: unitId,
        title: `Day ${orderIndex + 1}: Lesson`,
        order_index: orderIndex,
        estimated_minutes: 15
      });

      const updatedUnits = (course.units || []).map(u => {
        if (u.id === unitId) {
          return { ...u, episodes: [...(u.episodes || []), newEp] };
        }
        return u;
      });

      setCourse({ ...course, units: updatedUnits });
      selectEpisode(newEp, unitId);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to add lesson.');
    }
  };

  const handleDeleteUnit = async (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (!course || !confirm('Are you sure you want to delete this unit and all its lessons?')) return;

    try {
      await courseStudioService.deleteUnit(course.id, unitId);
      const nextUnits = (course.units || []).filter(u => u.id !== unitId);
      setCourse({ ...course, units: nextUnits });

      if (selectedUnitId === unitId) {
        if (nextUnits.length > 0 && nextUnits[0].episodes?.[0]) {
          selectEpisode(nextUnits[0].episodes[0], nextUnits[0].id);
        } else {
          setSelectedUnitId(null);
          setSelectedEpisodeId(null);
          setCurrentBlocks([]);
          setCurrentQuestions([]);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to delete unit.');
    }
  };

  const handleDeleteEpisode = async (e: React.MouseEvent, epId: string, unitId: string) => {
    e.stopPropagation();
    if (!course || !confirm('Delete this lesson?')) return;

    try {
      await courseStudioService.deleteEpisode(course.id, epId);
      const nextUnits = (course.units || []).map(u => {
        if (u.id === unitId) {
          return { ...u, episodes: (u.episodes || []).filter(ep => ep.id !== epId) };
        }
        return u;
      });
      setCourse({ ...course, units: nextUnits });

      const currUnit = nextUnits.find(u => u.id === unitId);
      if (currUnit?.episodes?.[0]) {
        selectEpisode(currUnit.episodes[0], unitId);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to delete episode.');
    }
  };

  // --------------------------------------------------------------------------
  // CONTENT SECTION ACTIONS (5 Section Types)
  // --------------------------------------------------------------------------

  const handleAddSection = (type: BlockType) => {
    let initialContent: any = {};

    if (type === 'text') {
      initialContent = { title: '', text: '' };
    } else if (type === 'text_image') {
      initialContent = {
        title: '',
        text: '',
        image: { url: '', caption: '', position: 'above', size: 'medium' }
      };
    } else if (type === 'text_video') {
      initialContent = {
        title: '',
        text: '',
        video: { url: '', position: 'above', is_short: false }
      };
    } else if (type === 'image') {
      initialContent = { url: '', caption: '', size: 'medium' };
    } else if (type === 'youtube_video') {
      initialContent = { url: '', title: '', is_short: false };
    } else if (type === 'youtube_short') {
      initialContent = { url: '', title: '', is_short: true };
    }

    const newBlock: CourseBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      episode_id: selectedEpisodeId || '',
      course_id: course?.id || '',
      block_type: type,
      order_index: currentBlocks.length,
      content: initialContent
    };

    setCurrentBlocks(prev => [...prev, newBlock]);
    setShowAddSectionMenu(false);
    setSavingStatus('unsaved');
  };

  const handleUpdateBlockContent = (bIndex: number, newContent: any) => {
    setCurrentBlocks(prev => {
      const next = [...prev];
      next[bIndex] = { ...next[bIndex], content: newContent };
      return next;
    });
    setSavingStatus('unsaved');
  };

  const handleMoveBlock = (bIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? bIndex - 1 : bIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentBlocks.length) return;

    setCurrentBlocks(prev => {
      const next = [...prev];
      const temp = next[bIndex];
      next[bIndex] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((b, idx) => ({ ...b, order_index: idx }));
    });
    setSavingStatus('unsaved');
  };

  const handleDuplicateBlock = (bIndex: number) => {
    const target = currentBlocks[bIndex];
    if (!target) return;
    const duplicated: CourseBlock = {
      ...target,
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_index: bIndex + 1,
      content: JSON.parse(JSON.stringify(target.content))
    };
    const next = [...currentBlocks];
    next.splice(bIndex + 1, 0, duplicated);
    setCurrentBlocks(next.map((b, idx) => ({ ...b, order_index: idx })));
    setSavingStatus('unsaved');
  };

  const handleDeleteBlock = (bIndex: number) => {
    setCurrentBlocks(prev => prev.filter((_, idx) => idx !== bIndex));
    setSavingStatus('unsaved');
  };

  // --------------------------------------------------------------------------
  // CLOUDFLARE R2 IMAGE UPLOAD FOR BLOCKS
  // --------------------------------------------------------------------------

  const triggerBlockImageUpload = (bIndex: number) => {
    activeUploadBlockIndexRef.current = bIndex;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleBlockImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bIndex = activeUploadBlockIndexRef.current;
    if (!file || bIndex === null || bIndex === undefined) return;

    setUploadingBlockIndex(bIndex);
    try {
      const res = await courseStudioService.uploadCourseImage(file, 'blocks', true);
      const targetBlock = currentBlocks[bIndex];

      if (targetBlock.block_type === 'text_image') {
        const nextContent = {
          ...targetBlock.content,
          image: {
            ...(targetBlock.content as any)?.image,
            url: res.publicUrl,
            storage_key: res.storageKey
          }
        };
        handleUpdateBlockContent(bIndex, nextContent);
      } else if (targetBlock.block_type === 'image') {
        const nextContent = {
          ...targetBlock.content,
          url: res.publicUrl,
          storage_key: res.storageKey
        };
        handleUpdateBlockContent(bIndex, nextContent);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to upload image to Cloudflare R2.');
    } finally {
      setUploadingBlockIndex(null);
      activeUploadBlockIndexRef.current = null;
    }
  };

  // --------------------------------------------------------------------------
  // QUESTION MANAGEMENT ACTIONS (All 6 Question Types)
  // --------------------------------------------------------------------------

  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    let initialOptions: any = ['Option A', 'Option B', 'Option C', 'Option D'];
    let initialCorrect = 'Option A';

    if (type === 'true_false') {
      initialOptions = ['True', 'False'];
      initialCorrect = 'True';
    } else if (type === 'fill_blank') {
      initialOptions = [];
      initialCorrect = 'answer';
    } else if (type === 'matching') {
      initialOptions = ['Character A -> Action A', 'Character B -> Action B'];
      initialCorrect = 'matches';
    } else if (type === 'ordering') {
      initialOptions = ['First event', 'Second event', 'Third event'];
      initialCorrect = 'sequence';
    } else if (type === 'short_answer') {
      initialOptions = ['acceptable answer'];
      initialCorrect = 'expected answer';
    } else if (type === 'cloze_passage') {
      const defaultPassage = 'The young bird looked at the sky every morning. He wanted to fly.';
      const defaultBlanks = [
        { id: 'blank_1', answer: 'sky', options: ['sky', 'ground', 'farm', 'nest'] },
        { id: 'blank_2', answer: 'fly', options: ['fly', 'walk', 'sleep', 'run'] }
      ];
      initialOptions = { passage: defaultPassage, blanks: defaultBlanks };
      initialCorrect = 'sky, fly';
    } else if (type === 'essay') {
      initialOptions = {
        image_url: '',
        min_words: 80,
        max_words: 100,
        evaluation_criteria: ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary']
      };
      initialCorrect = 'AI Evaluated';
    }

    const newQ: CourseQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      episode_id: selectedEpisodeId || '',
      course_id: course?.id || '',
      question_text: type === 'true_false'
        ? 'Statement based on the lesson'
        : type === 'cloze_passage'
        ? 'Complete the passage using the correct words.'
        : type === 'essay'
        ? 'Describe this image in 80–100 words.'
        : 'New practice question',
      question_type: type,
      options: initialOptions,
      correct_answer: initialCorrect,
      explanation: 'Explanation shown after answering.',
      difficulty: 'medium',
      points: type === 'essay' ? 20 : 10,
      order_index: currentQuestions.length,
      passage: type === 'cloze_passage' ? (initialOptions as any).passage : undefined,
      blanks: type === 'cloze_passage' ? (initialOptions as any).blanks : undefined,
      image_url: type === 'essay' ? (initialOptions as any).image_url : undefined,
      min_words: type === 'essay' ? (initialOptions as any).min_words : undefined,
      max_words: type === 'essay' ? (initialOptions as any).max_words : undefined,
      evaluation_criteria: type === 'essay' ? (initialOptions as any).evaluation_criteria : undefined
    };

    setCurrentQuestions(prev => [...prev, newQ]);
    setSavingStatus('unsaved');
  };

  const handleUpdateQuestion = (qIndex: number, field: keyof CourseQuestion, value: any) => {
    setCurrentQuestions(prev => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], [field]: value };
      return next;
    });
    setSavingStatus('unsaved');
  };

  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentQuestions.length) return;

    setCurrentQuestions(prev => {
      const next = [...prev];
      const temp = next[qIndex];
      next[qIndex] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((q, idx) => ({ ...q, order_index: idx }));
    });
    setSavingStatus('unsaved');
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setCurrentQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
    setSavingStatus('unsaved');
  };

  // --------------------------------------------------------------------------
  // SAVE CURRENT EPISODE (Blocks + Questions)
  // --------------------------------------------------------------------------

  const handleSaveCurrentEpisode = async () => {
    await performBackgroundSave(true);
  };

  // Extract combined text, video, and image presence from current blocks for Question Plan
  const combinedLessonText = currentBlocks
    .map(b => (b.content as any)?.text || (b.content as any)?.markdown || '')
    .filter(Boolean)
    .join('\n\n');

  const hasVideoInLesson = currentBlocks.some(b => b.block_type === 'text_video' || b.block_type === 'youtube_video' || b.block_type === 'youtube_short');
  const hasImageInLesson = currentBlocks.some(b => b.block_type === 'text_image' || b.block_type === 'image');

  const currentUnit = course?.units?.find(u => u.id === selectedUnitId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-[#026fc3] flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">Loading Course Studio...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-slate-800">Course not found</h2>
          <button
            onClick={() => navigate('/course-studio')}
            className="px-6 py-2.5 bg-[#026fc3] text-white rounded-xl text-xs font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#fbf9f4] text-slate-900 font-sans overflow-hidden">
      
      {/* Hidden File Input for R2 Cloudflare Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBlockImageSelected}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />

      {/* TOP COMPACT STUDIO BAR */}
      <header className="h-14 bg-white border-b border-stone-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Back & Course Metadata */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/course-studio')}
            className="p-2 rounded-xl hover:bg-stone-100 text-slate-600 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Return to Studio Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Studio</span>
          </button>

          <div className="h-5 w-px bg-stone-200" />

          <div>
            <h1 className="text-sm font-black text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {course.title}
            </h1>
            <span className="text-[11px] font-bold text-[#026fc3]">
              {course.subject} • {course.units?.length || 0} Units (Max 10)
            </span>
          </div>
        </div>

        {/* Center: Non-blocking Save State Indicator */}
        <div className="flex items-center gap-2">
          {savingStatus === 'saving' && (
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Saving...</span>
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          {savingStatus === 'retrying' && (
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Couldn't save — retrying</span>
            </span>
          )}
          {savingStatus === 'unsaved' && (
            <span className="text-[11px] font-bold text-slate-400">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Right: Preview, Save, Publish */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/course-studio/${course.id}/preview`)}
            className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-[#026fc3]" />
            <span className="hidden sm:inline">Preview Course</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentEpisode}
            disabled={savingStatus === 'saving'}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish & Assign</span>
          </button>
        </div>
      </header>

      {/* ERROR & SUCCESS NOTIFICATIONS */}
      {errorBanner && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-500 hover:text-rose-800">✕</button>
        </div>
      )}

      {successBanner && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* 3-PANEL AUTHORING WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* -------------------------------------------------------------------- */}
        {/* 1. LEFT PANEL: COURSE OUTLINE (MAX 10 UNITS)                         */}
        {/* -------------------------------------------------------------------- */}
        <aside className="w-72 bg-white border-r border-stone-200/90 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3.5 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#026fc3]" />
              <span>Course Outline ({(course.units || []).length}/10)</span>
            </div>
            
            {(course.units?.length || 0) < 10 && (
              <button
                type="button"
                onClick={handleAddUnit}
                className="p-1.5 rounded-lg hover:bg-sky-50 text-[#026fc3] transition-all cursor-pointer"
                title="Add Unit"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {(course.units || []).map((unit) => {
              const isExpanded = expandedUnits[unit.id] ?? true;

              return (
                <div key={unit.id} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/50">
                  {/* Unit Header */}
                  <div
                    onClick={() => setExpandedUnits(prev => ({ ...prev, [unit.id]: !isExpanded }))}
                    className="p-2.5 bg-white flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-all text-xs font-black text-slate-800"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="truncate">{unit.title}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleAddEpisode(unit.id);
                        }}
                        className="p-1 hover:text-[#026fc3] text-slate-400"
                        title="Add Lesson to Unit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {(course.units?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={e => handleDeleteUnit(e, unit.id)}
                          className="p-1 hover:text-rose-600 text-slate-400"
                          title="Delete Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lessons List */}
                  {isExpanded && (
                    <div className="p-1.5 space-y-1">
                      {(unit.episodes || []).map((ep) => {
                        const isSelected = selectedEpisodeId === ep.id;

                        return (
                          <div
                            key={ep.id}
                            onClick={() => selectEpisode(ep, unit.id)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? 'bg-[#026fc3] text-white shadow-2xs'
                                : 'text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                              <span className="truncate">{ep.title}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                                {ep.estimated_minutes || 15}m
                              </span>
                              {(unit.episodes || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={e => handleDeleteEpisode(e, ep.id, unit.id)}
                                  className={`p-0.5 opacity-0 group-hover:opacity-100 ${isSelected ? 'text-white' : 'text-slate-400 hover:text-rose-600'}`}
                                  title="Delete Lesson"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 10 Units Reached Note */}
            {(course.units?.length || 0) >= 10 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 text-center">
                Maximum of 10 units reached.
              </div>
            )}
          </div>
        </aside>

        {/* -------------------------------------------------------------------- */}
        {/* 2. CENTER PANEL: LESSON CONTENT EDITOR (700-800PX READING WIDTH)     */}
        {/* -------------------------------------------------------------------- */}
        <main className="flex-1 bg-[#fcfaf6] overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-[760px] mx-auto space-y-8">
            
            {/* Lesson Title & Duration Header */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#026fc3]">
                  {currentUnit?.title || 'Unit 1'} • Lesson Editor
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={estimatedMinutes}
                    onChange={e => {
                      setEstimatedMinutes(parseInt(e.target.value, 10) || 15);
                      setSavingStatus('unsaved');
                    }}
                    className="w-12 px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-center text-xs font-bold"
                  />
                  <span>min read</span>
                </div>
              </div>

              <input
                type="text"
                value={episodeTitle}
                onChange={e => {
                  setEpisodeTitle(e.target.value);
                  setSavingStatus('unsaved');
                }}
                placeholder="Lesson Title (e.g. Day 1: The Eagle and the Chicken)"
                className="w-full text-xl sm:text-2xl font-black text-slate-900 bg-transparent border-0 border-b border-stone-200 focus:border-[#026fc3] focus:ring-0 px-0 py-1"
              />
            </div>

            {/* CONTENT SECTIONS STREAM */}
            <div className="space-y-5">
              {currentBlocks.map((block, bIdx) => {
                const isFirst = bIdx === 0;
                const isLast = bIdx === currentBlocks.length - 1;

                return (
                  <div
                    key={block.id || bIdx}
                    className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Section Top Controls Bar */}
                    <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                          Section #{bIdx + 1}:
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[10px] font-black uppercase text-[#026fc3]">
                          {block.block_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveBlock(bIdx, 'up')}
                          className="p-1 rounded hover:bg-stone-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveBlock(bIdx, 'down')}
                          className="p-1 rounded hover:bg-stone-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateBlock(bIdx)}
                          className="p-1 rounded hover:bg-stone-200 text-slate-600 cursor-pointer"
                          title="Duplicate Section"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(bIdx)}
                          className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Section Editor Body */}
                    <div className="p-4 sm:p-5 space-y-4">
                      
                      {/* Section Optional Title */}
                      <input
                        type="text"
                        value={(block.content as any)?.title || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, title: e.target.value })}
                        placeholder="Section Heading (Optional)"
                        className="w-full text-sm font-bold text-slate-800 bg-transparent border-0 border-b border-stone-100 focus:border-[#026fc3] focus:ring-0 px-0 py-1"
                      />

                      {/* 1. TEXT SECTION */}
                      {block.block_type === 'text' && (
                        <div className="space-y-1">
                          <textarea
                            rows={6}
                            value={(block.content as any)?.text || ''}
                            onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, text: e.target.value })}
                            placeholder="Type or paste lesson text here (supports **bold**, *italic*, bullet lists, etc.)..."
                            className="w-full p-3 rounded-xl border border-stone-200 text-[14px] leading-[1.75] text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none placeholder:text-slate-400"
                          />
                        </div>
                      )}

                      {/* 2. TEXT + IMAGE SECTION */}
                      {block.block_type === 'text_image' && (
                        <div className="space-y-4">
                          {/* Image Settings */}
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-emerald-600" />
                                <span>Story Illustration</span>
                              </span>

                              <div className="flex items-center gap-3">
                                {/* Position Selector */}
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-[11px] font-bold text-slate-400">Position:</span>
                                  <select
                                    value={(block.content as any)?.image?.position || 'above'}
                                    onChange={e => {
                                      const nextImg = { ...(block.content as any)?.image, position: e.target.value };
                                      handleUpdateBlockContent(bIdx, { ...block.content, image: nextImg });
                                    }}
                                    className="px-2 py-1 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                                  >
                                    <option value="above">Above Text</option>
                                    <option value="below">Below Text</option>
                                    <option value="left">Float Left (Desktop)</option>
                                    <option value="right">Float Right (Desktop)</option>
                                  </select>
                                </div>

                                {/* Upload to Cloudflare R2 Button */}
                                <button
                                  type="button"
                                  onClick={() => triggerBlockImageUpload(bIdx)}
                                  disabled={uploadingBlockIndex === bIdx}
                                  className="px-3 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-[#026fc3]" />
                                  <span>{uploadingBlockIndex === bIdx ? 'Uploading...' : 'Upload Image (R2)'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Image URL & Caption */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                value={(block.content as any)?.image?.url || ''}
                                onChange={e => {
                                  const nextImg = { ...(block.content as any)?.image, url: e.target.value };
                                  handleUpdateBlockContent(bIdx, { ...block.content, image: nextImg });
                                }}
                                placeholder="Image URL (or upload above)"
                                className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs"
                              />
                              <input
                                type="text"
                                value={(block.content as any)?.image?.caption || ''}
                                onChange={e => {
                                  const nextImg = { ...(block.content as any)?.image, caption: e.target.value };
                                  handleUpdateBlockContent(bIdx, { ...block.content, image: nextImg });
                                }}
                                placeholder="Optional caption (12-13px)"
                                className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs"
                              />
                            </div>
                          </div>

                          {/* Text Body */}
                          <textarea
                            rows={6}
                            value={(block.content as any)?.text || ''}
                            onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, text: e.target.value })}
                            placeholder="Type or paste lesson text here..."
                            className="w-full p-3 rounded-xl border border-stone-200 text-[14px] leading-[1.75] text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* 3. TEXT + VIDEO SECTION */}
                      {block.block_type === 'text_video' && (
                        <div className="space-y-4">
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Video className="w-4 h-4 text-rose-500" />
                                <span>Video Embed</span>
                              </span>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] font-bold text-slate-400">Position:</span>
                                <select
                                  value={(block.content as any)?.video?.position || 'above'}
                                  onChange={e => {
                                    const nextVid = { ...(block.content as any)?.video, position: e.target.value };
                                    handleUpdateBlockContent(bIdx, { ...block.content, video: nextVid });
                                  }}
                                  className="px-2 py-1 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                                >
                                  <option value="above">Above Text</option>
                                  <option value="below">Below Text</option>
                                  <option value="left">Float Left (Desktop)</option>
                                  <option value="right">Float Right (Desktop)</option>
                                </select>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={(block.content as any)?.video?.url || ''}
                              onChange={e => {
                                const nextVid = { ...(block.content as any)?.video, url: e.target.value };
                                handleUpdateBlockContent(bIdx, { ...block.content, video: nextVid });
                              }}
                              placeholder="YouTube URL (e.g. https://www.youtube.com/watch?v=... or /shorts/...)"
                              className="w-full px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs font-mono"
                            />
                          </div>

                          <textarea
                            rows={6}
                            value={(block.content as any)?.text || ''}
                            onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, text: e.target.value })}
                            placeholder="Type or paste lesson text here..."
                            className="w-full p-3 rounded-xl border border-stone-200 text-[14px] leading-[1.75] text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* 4. IMAGE ONLY SECTION */}
                      {block.block_type === 'image' && (
                        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-slate-600" />
                              <span>Standalone Image</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => triggerBlockImageUpload(bIdx)}
                              disabled={uploadingBlockIndex === bIdx}
                              className="px-3 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#026fc3]" />
                              <span>{uploadingBlockIndex === bIdx ? 'Uploading...' : 'Upload Image (R2)'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              value={(block.content as any)?.url || ''}
                              onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, url: e.target.value })}
                              placeholder="Image URL"
                              className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs"
                            />
                            <input
                              type="text"
                              value={(block.content as any)?.caption || ''}
                              onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, caption: e.target.value })}
                              placeholder="Caption (Optional)"
                              className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* 5. VIDEO ONLY SECTION */}
                      {(block.block_type === 'youtube_video' || block.block_type === 'youtube_short') && (
                        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2.5">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Play className="w-4 h-4 text-slate-600" />
                            <span>{block.block_type === 'youtube_short' ? 'YouTube Short (9:16)' : 'YouTube Video (16:9)'}</span>
                          </span>

                          <input
                            type="text"
                            value={(block.content as any)?.url || ''}
                            onChange={e => handleUpdateBlockContent(bIdx, { ...block.content, url: e.target.value })}
                            placeholder="YouTube URL"
                            className="w-full px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs font-mono"
                          />
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>

            {/* + ADD SECTION PICKER */}
            <div className="relative py-2">
              {!showAddSectionMenu ? (
                <button
                  type="button"
                  onClick={() => setShowAddSectionMenu(true)}
                  className="w-full py-3.5 border-2 border-dashed border-stone-300 hover:border-[#026fc3] bg-white/60 hover:bg-sky-50/50 rounded-2xl text-xs font-black text-slate-600 hover:text-[#026fc3] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Lesson Section</span>
                </button>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Choose Section Type</span>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionMenu(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleAddSection('text')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-[#026fc3] hover:bg-sky-50/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 group-hover:text-[#026fc3]">
                        <FileText className="w-4 h-4 text-[#026fc3]" />
                        <span>📝 Text</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Standard 14px reading body text
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSection('text_image')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 group-hover:text-emerald-700">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>🖼 Text + Image</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Composite story text & illustration
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSection('text_video')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-rose-500 hover:bg-rose-50/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 group-hover:text-rose-700">
                        <Video className="w-4 h-4 text-rose-500" />
                        <span>🎥 Text + Video</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Composite text & video lesson
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSection('image')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                        <span>🖼 Image Only</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Standalone diagram or hero image
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSection('youtube_video')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        <Video className="w-4 h-4 text-slate-600" />
                        <span>▶ YouTube Video</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        16:9 widescreen video player
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSection('youtube_short')}
                      className="p-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        <Play className="w-4 h-4 text-slate-600" />
                        <span>📱 YouTube Short</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        9:16 vertical video player
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* INTERACTIVE PRACTICE QUESTIONS SECTION                           */}
            {/* ---------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#026fc3]" />
                  <h3 className="text-sm font-black text-slate-900">
                    Interactive Practice Questions ({currentQuestions.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('multiple_choice')}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuestionPlanModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] border border-sky-200 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Question Plan & Prompt (v1.0)</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {currentQuestions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-2xl space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    No practice questions added yet for this lesson.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('multiple_choice')}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-xl text-xs font-bold"
                    >
                      + Add Question Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuestionPlanModal(true)}
                      className="px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create AI Question Plan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestions.map((q, qIdx) => {
                    const isFirstQ = qIdx === 0;
                    const isLastQ = qIdx === currentQuestions.length - 1;
                    const qType = q.question_type || 'multiple_choice';

                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200 space-y-3"
                      >
                        {/* Question Header & Controls */}
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">Q#{qIdx + 1}</span>
                            <select
                              value={qType}
                              onChange={e => handleUpdateQuestion(qIdx, 'question_type', e.target.value as QuestionType)}
                              className="px-2 py-0.5 rounded-md border border-stone-200 text-[11px] font-bold bg-white"
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="true_false">True / False</option>
                              <option value="fill_blank">Fill in the Blank</option>
                              <option value="cloze_passage">Cloze Passage</option>
                              <option value="matching">Matching</option>
                              <option value="ordering">Ordering</option>
                              <option value="short_answer">Short Answer</option>
                              <option value="essay">Essay / Descriptive Response</option>
                            </select>

                            <div className="flex items-center gap-1 ml-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Marks:</label>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={q.points || (qType === 'essay' || qType === 'cloze_passage' ? 20 : 10)}
                                onChange={e => handleUpdateQuestion(qIdx, 'points', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 px-1.5 py-0.5 rounded-md border border-stone-200 text-[11px] font-bold bg-white text-slate-800 text-center"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isFirstQ}
                              onClick={() => handleMoveQuestion(qIdx, 'up')}
                              className="p-1 rounded hover:bg-stone-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={isLastQ}
                              onClick={() => handleMoveQuestion(qIdx, 'down')}
                              className="p-1 rounded hover:bg-stone-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(qIdx)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Question Prompt Input */}
                        <input
                          type="text"
                          value={q.question_text}
                          onChange={e => handleUpdateQuestion(qIdx, 'question_text', e.target.value)}
                          placeholder="Enter question prompt..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-slate-900"
                        />

                        {/* Multiple Choice Options */}
                        {qType === 'multiple_choice' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {(Array.isArray(q.options) ? (q.options as string[]) : []).map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestion(qIdx, 'correct_answer', opt)}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs cursor-pointer ${
                                    q.correct_answer === opt
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-stone-200 text-slate-600 hover:bg-stone-300'
                                  }`}
                                  title="Mark as correct answer"
                                >
                                  {String.fromCharCode(65 + oIdx)}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...(q.options as string[])];
                                    newOpts[oIdx] = e.target.value;
                                    handleUpdateQuestion(qIdx, 'options', newOpts);
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* True / False Options */}
                        {qType === 'true_false' && (
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-xs font-bold text-slate-500">Correct Answer:</span>
                            {['True', 'False'].map(choice => (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => handleUpdateQuestion(qIdx, 'correct_answer', choice)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                  q.correct_answer.toLowerCase() === choice.toLowerCase()
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-stone-200'
                                }`}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Cloze Passage Editor */}
                        {qType === 'cloze_passage' && (
                          <div className="pt-2 space-y-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Passage Text (Use [word] for blanks):
                              </label>
                              <textarea
                                rows={4}
                                value={q.passage || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).passage : '')}
                                onChange={e => {
                                  const newPassage = e.target.value;
                                  const currentBlanks = q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : []);
                                  handleUpdateQuestion(qIdx, 'passage', newPassage);
                                  handleUpdateQuestion(qIdx, 'options', { passage: newPassage, blanks: currentBlanks });
                                }}
                                placeholder="The young bird looked at the [sky] every morning. He wanted to [fly]..."
                                className="w-full p-2.5 rounded-xl bg-white border border-stone-200 text-xs font-medium text-slate-800"
                              />
                            </div>

                            {/* Blanks List */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                                <span>Blanks & 4-Option Choices:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentBlanks = q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : []) || [];
                                    const newBlank = {
                                      id: `blank_${currentBlanks.length + 1}`,
                                      answer: 'new_word',
                                      options: ['new_word', 'distractor1', 'distractor2', 'distractor3']
                                    };
                                    const nextBlanks = [...currentBlanks, newBlank];
                                    const currentPassage = q.passage || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).passage : '');
                                    handleUpdateQuestion(qIdx, 'blanks', nextBlanks);
                                    handleUpdateQuestion(qIdx, 'options', { passage: currentPassage, blanks: nextBlanks });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-sky-50 text-[#026fc3] border border-sky-200 text-[10px] font-black cursor-pointer"
                                >
                                  + Add Blank
                                </button>
                              </div>

                              {((q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : [])) || []).map((blank: any, bIdx: number) => (
                                <div key={bIdx} className="p-3 rounded-xl bg-white border border-stone-200 space-y-2 shadow-2xs">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-[#026fc3]">Blank #{bIdx + 1} ({blank.id || `blank_${bIdx + 1}`})</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentBlanks = (q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : []) || []).filter((_: any, idx: number) => idx !== bIdx);
                                        const currentPassage = q.passage || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).passage : '');
                                        handleUpdateQuestion(qIdx, 'blanks', currentBlanks);
                                        handleUpdateQuestion(qIdx, 'options', { passage: currentPassage, blanks: currentBlanks });
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                                      title="Delete Blank"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Correct Answer Word:</label>
                                      <input
                                        type="text"
                                        value={blank.answer}
                                        onChange={e => {
                                          const currentBlanks = [...(q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : []) || [])];
                                          const newAns = e.target.value;
                                          const opts = [...(currentBlanks[bIdx].options || [newAns, 'distractor1', 'distractor2', 'distractor3'])];
                                          opts[0] = newAns;
                                          currentBlanks[bIdx] = { ...currentBlanks[bIdx], answer: newAns, options: opts };
                                          const currentPassage = q.passage || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).passage : '');
                                          handleUpdateQuestion(qIdx, 'blanks', currentBlanks);
                                          handleUpdateQuestion(qIdx, 'options', { passage: currentPassage, blanks: currentBlanks });
                                        }}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 text-xs font-bold text-emerald-900"
                                      />
                                    </div>

                                    <div className="space-y-0.5">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Distractors (3 options):</label>
                                      <div className="flex gap-1.5">
                                        {[1, 2, 3].map(optI => (
                                          <input
                                            key={optI}
                                            type="text"
                                            value={blank.options?.[optI] || ''}
                                            onChange={e => {
                                              const currentBlanks = [...(q.blanks || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).blanks : []) || [])];
                                              const newOpts = [...(currentBlanks[bIdx].options || [blank.answer, '', '', ''])];
                                              newOpts[optI] = e.target.value;
                                              currentBlanks[bIdx] = { ...currentBlanks[bIdx], options: newOpts };
                                              const currentPassage = q.passage || (typeof q.options === 'object' && !Array.isArray(q.options) ? (q.options as any).passage : '');
                                              handleUpdateQuestion(qIdx, 'blanks', currentBlanks);
                                              handleUpdateQuestion(qIdx, 'options', { passage: currentPassage, blanks: currentBlanks });
                                            }}
                                            placeholder={`Option ${optI + 1}`}
                                            className="flex-1 px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-[11px] font-medium"
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Essay Configuration Editor */}
                        {qType === 'essay' && (
                          <div className="pt-2 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Word Range:</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={20}
                                    max={500}
                                    value={q.min_words || 80}
                                    onChange={e => {
                                      const min = parseInt(e.target.value) || 50;
                                      handleUpdateQuestion(qIdx, 'min_words', min);
                                      handleUpdateQuestion(qIdx, 'options', { ...(typeof q.options === 'object' ? q.options : {}), min_words: min });
                                    }}
                                    className="w-20 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-slate-800"
                                  />
                                  <span className="text-xs text-slate-400 font-bold">to</span>
                                  <input
                                    type="number"
                                    min={30}
                                    max={1000}
                                    value={q.max_words || 100}
                                    onChange={e => {
                                      const max = parseInt(e.target.value) || 100;
                                      handleUpdateQuestion(qIdx, 'max_words', max);
                                      handleUpdateQuestion(qIdx, 'options', { ...(typeof q.options === 'object' ? q.options : {}), max_words: max });
                                    }}
                                    className="w-20 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-slate-800"
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium">words</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Attached Image URL (Optional):</label>
                                <input
                                  type="text"
                                  value={q.image_url || ''}
                                  onChange={e => {
                                    const url = e.target.value;
                                    handleUpdateQuestion(qIdx, 'image_url', url);
                                    handleUpdateQuestion(qIdx, 'options', { ...(typeof q.options === 'object' ? q.options : {}), image_url: url });
                                  }}
                                  placeholder="https://..."
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-slate-800"
                                />
                              </div>
                            </div>

                            {q.image_url && (
                              <div className="w-32 h-20 rounded-lg overflow-hidden border border-stone-200">
                                <img src={q.image_url} alt="Prompt visual" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ordering Sentence Blocks Editor (Canonical Order) */}
                        {qType === 'ordering' && (
                          <div className="pt-2 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <span>Canonical Correct Story Order:</span>
                              <span className="text-[#026fc3] font-semibold">{(q.options as string[])?.length || 0} Sentence Blocks</span>
                            </div>

                            <div className="space-y-2">
                              {((q.options as string[]) || []).map((sentence, sIdx) => {
                                const isFirstBlock = sIdx === 0;
                                const isLastBlock = sIdx === ((q.options as string[]) || []).length - 1;

                                return (
                                  <div
                                    key={sIdx}
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-[#026fc3] transition-all"
                                  >
                                    {/* Number Badge */}
                                    <span className="w-6 h-6 rounded-lg bg-stone-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                                      {String(sIdx + 1).padStart(2, '0')}
                                    </span>

                                    {/* Sentence Input */}
                                    <input
                                      type="text"
                                      value={sentence}
                                      onChange={e => {
                                        const newOptions = [...((q.options as string[]) || [])];
                                        newOptions[sIdx] = e.target.value;
                                        handleUpdateQuestion(qIdx, 'options', newOptions);
                                      }}
                                      placeholder={`Sentence block ${sIdx + 1}...`}
                                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-[#026fc3]"
                                    />

                                    {/* Move Up / Down Controls */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        disabled={isFirstBlock}
                                        onClick={() => {
                                          const newOptions = [...((q.options as string[]) || [])];
                                          const temp = newOptions[sIdx];
                                          newOptions[sIdx] = newOptions[sIdx - 1];
                                          newOptions[sIdx - 1] = temp;
                                          handleUpdateQuestion(qIdx, 'options', newOptions);
                                        }}
                                        aria-label="Move sentence up"
                                        className="p-1 rounded hover:bg-stone-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                                        title="Move sentence up"
                                      >
                                        <MoveUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLastBlock}
                                        onClick={() => {
                                          const newOptions = [...((q.options as string[]) || [])];
                                          const temp = newOptions[sIdx];
                                          newOptions[sIdx] = newOptions[sIdx + 1];
                                          newOptions[sIdx + 1] = temp;
                                          handleUpdateQuestion(qIdx, 'options', newOptions);
                                        }}
                                        aria-label="Move sentence down"
                                        className="p-1 rounded hover:bg-stone-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                                        title="Move sentence down"
                                      >
                                        <MoveDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newOptions = ((q.options as string[]) || []).filter((_, idx) => idx !== sIdx);
                                          handleUpdateQuestion(qIdx, 'options', newOptions);
                                        }}
                                        aria-label="Delete sentence block"
                                        className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                                        title="Delete block"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = [...((q.options as string[]) || []), ''];
                                handleUpdateQuestion(qIdx, 'options', newOptions);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-dashed border-stone-300 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3 text-[#026fc3]" />
                              <span>Add Sentence Block</span>
                            </button>
                          </div>
                        )}

                        {/* Fill in the Blank / Short Answer Correct Answer */}
                        {(qType === 'fill_blank' || qType === 'short_answer') && (
                          <div className="pt-1 space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Correct Expected Answer:</label>
                            <input
                              type="text"
                              value={q.correct_answer}
                              onChange={e => handleUpdateQuestion(qIdx, 'correct_answer', e.target.value)}
                              placeholder="e.g. mountain"
                              className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800 font-bold"
                            />
                          </div>
                        )}

                        {/* Explanation */}
                        <div className="pt-1">
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={e => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                            placeholder="Explanation shown to students after answering..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>

        {/* -------------------------------------------------------------------- */}
        {/* 3. RIGHT PANEL: OPTIONAL AI ASSISTANT & COURSE SETTINGS              */}
        {/* -------------------------------------------------------------------- */}
        <aside className="w-80 bg-white border-l border-stone-200/90 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-stone-100">
            <button
              type="button"
              onClick={() => setRightPanelTab('ai')}
              className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-all ${
                rightPanelTab === 'ai'
                  ? 'border-b-2 border-[#026fc3] text-[#026fc3] bg-sky-50/40'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              AI Assistant
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('settings')}
              className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-all ${
                rightPanelTab === 'settings'
                  ? 'border-b-2 border-[#026fc3] text-[#026fc3] bg-sky-50/40'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Settings
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rightPanelTab === 'ai' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs space-y-1.5">
                  <span className="font-black text-[#026fc3] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Optional AI Workflow</span>
                  </span>
                  <p className="text-slate-600 font-medium leading-relaxed text-[11px]">
                    Create questions, summarize text, or build grounded practice sets. AI is your assistant — you remain in 100% control of all content.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                  <span className="text-xs font-black text-slate-800 block">Question Plan Builder</span>
                  <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                    Formulate exact question types and counts, generate the v1.0 AI prompt, and import the returned JSON.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuestionPlanModal(true)}
                    className="w-full py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Question Planner</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                  <span className="text-xs font-black text-slate-800">Course Metadata</span>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">Subject</span>
                      <span className="font-bold text-slate-800">{course.subject}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">Course Type</span>
                      <span className="font-bold text-slate-800 uppercase">{course.course_type} Course</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">Status</span>
                      <span className="font-bold text-emerald-700 capitalize">{course.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* QUESTION PLAN & AI IMPORT MODAL */}
      <QuestionPlanModal
        isOpen={showQuestionPlanModal}
        onClose={() => setShowQuestionPlanModal(false)}
        courseTitle={course.title}
        unitTitle={currentUnit?.title || 'Unit 1'}
        episodeTitle={episodeTitle || 'Lesson 1'}
        episodeId={selectedEpisodeId || ''}
        courseId={course.id}
        lessonText={combinedLessonText}
        hasVideo={hasVideoInLesson}
        hasImage={hasImageInLesson}
        onImportQuestions={(importedQuestions) => {
          // Idempotent Question Import: Replace lesson practice questions with imported set
          // Deduplicate by question_type + question_text
          const seen = new Set<string>();
          const deduplicated: CourseQuestion[] = [];

          importedQuestions.forEach(q => {
            const key = `${q.question_type}_${(q.question_text || '').trim().toLowerCase()}`;
            if (!seen.has(key) && q.question_text && q.question_text.trim() && q.question_text !== 'New practice question' && q.question_text !== 'Statement based on the lesson') {
              seen.add(key);
              deduplicated.push(q);
            }
          });

          const normalized = deduplicated.map((q, idx) => ({ ...q, order_index: idx }));
          setCurrentQuestions(normalized);
          setSavingStatus('unsaved');

          // Summary counts for banner
          const mcqCount = normalized.filter(q => q.question_type === 'multiple_choice').length;
          const tfCount = normalized.filter(q => q.question_type === 'true_false').length;
          const ordCount = normalized.filter(q => q.question_type === 'ordering').length;
          
          const parts: string[] = [];
          if (mcqCount > 0) parts.push(`${mcqCount} Multiple Choice`);
          if (tfCount > 0) parts.push(`${tfCount} True / False`);
          if (ordCount > 0) parts.push(`${ordCount} Ordering Activity`);

          setSuccessBanner(`✓ Lesson Imported: ${parts.join(', ')} (${normalized.length} Activities / Questions Imported)`);
          setTimeout(() => setSuccessBanner(null), 4500);
        }}
      />

      {/* COURSE PUBLISH & ASSIGN MODAL */}
      <CoursePublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        course={course}
        onSuccess={() => {
          setCourse(prev => prev ? { ...prev, status: 'published' } : null);
          setPublishModalOpen(false);
          setSuccessBanner('Course successfully published and assigned to selected classrooms!');
          setTimeout(() => setSuccessBanner(null), 3500);
        }}
      />

    </div>
  );
};
