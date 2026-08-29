// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PREMIUM 3-PANEL COURSE STUDIO EDITOR
// Left: Course Outline | Center: Editorial Content Studio (Text+Image, Text+Video, Questions) | Right: Settings & AI
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Play,
  Send,
  Eye,
  Check,
  ChevronRight,
  ChevronDown,
  Clock,
  ArrowLeft,
  Image as ImageIcon,
  HelpCircle,
  Wand2,
  AlertCircle,
  FileText,
  Video,
  Save,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Quote,
  Upload
} from 'lucide-react';
import {
  Course,
  CourseEpisode,
  CourseBlock,
  CourseQuestion,
  BlockType
} from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';

export const CourseEditorPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);

  // Selection states
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Active Episode Content States
  const [currentBlocks, setCurrentBlocks] = useState<CourseBlock[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<CourseQuestion[]>([]);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);

  // Right Panel State
  const [rightPanelTab, setRightPanelTab] = useState<'ai' | 'settings'>('ai');
  const [rawPastedMaterial, setRawPastedMaterial] = useState('');
  const [aiGeneratingLesson, setAiGeneratingLesson] = useState(false);
  const [aiGeneratingQuestions, setAiGeneratingQuestions] = useState(false);
  const [aiReviewOutput, setAiReviewOutput] = useState<any>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Question AI Form
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiQuestionDifficulty, setAiQuestionDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Media uploading state
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ blockIndex: number; field: string } | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourseData(courseId);
    }
  }, [courseId]);

  const loadCourseData = async (id: string) => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourse(id);
      setCourse(data);

      const units = data.units || [];
      if (units.length > 0) {
        const firstUnit = units[0];
        setSelectedUnitId(firstUnit.id);
        setExpandedUnits({ [firstUnit.id]: true });

        const firstEp = (firstUnit.episodes || [])[0];
        if (firstEp) {
          selectEpisode(firstEp, firstUnit.id);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  const selectEpisode = (ep: CourseEpisode, unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedEpisodeId(ep.id);
    setEpisodeTitle(ep.title);
    setEstimatedMinutes(ep.estimated_minutes || 15);
    setCurrentBlocks(ep.blocks || []);
    setCurrentQuestions(ep.questions || []);
    setAiReviewOutput(null);
  };

  // --------------------------------------------------------------------------
  // DEBOUNCED AUTOSAVE EFFECT
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (savingStatus !== 'unsaved' || !course || !selectedEpisodeId) return;

    const timer = setTimeout(() => {
      handleSaveCurrentEpisode();
    }, 2200);

    return () => clearTimeout(timer);
  }, [savingStatus, episodeTitle, estimatedMinutes, currentBlocks, currentQuestions, selectedEpisodeId]);

  // --------------------------------------------------------------------------
  // OUTLINE ACTIONS (UNITS & EPISODES)
  // --------------------------------------------------------------------------

  const handleAddUnit = async () => {
    if (!course) return;
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
      setErrorBanner(err.message || 'Failed to add episode.');
    }
  };

  const handleDeleteUnit = async (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (!course || !confirm('Delete this unit and all its lessons?')) return;

    try {
      await courseStudioService.deleteUnit(course.id, unitId);
      const remainingUnits = (course.units || []).filter(u => u.id !== unitId);
      setCourse({ ...course, units: remainingUnits });

      if (remainingUnits.length > 0) {
        setSelectedUnitId(remainingUnits[0].id);
        if (remainingUnits[0].episodes?.[0]) {
          selectEpisode(remainingUnits[0].episodes[0], remainingUnits[0].id);
        }
      } else {
        setSelectedUnitId(null);
        setSelectedEpisodeId(null);
        setCurrentBlocks([]);
        setCurrentQuestions([]);
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
  // BLOCK STREAM ACTIONS
  // --------------------------------------------------------------------------

  const handleAddSection = (type: BlockType) => {
    let initialContent: any = {};

    if (type === 'text') {
      initialContent = { title: '', text: '' };
    } else if (type === 'text_image') {
      initialContent = {
        title: '',
        text: '',
        image: { url: '', caption: '', position: 'right', size: 'medium' }
      };
    } else if (type === 'text_video') {
      initialContent = {
        title: '',
        text: '',
        video: { url: '', position: 'right', is_short: false }
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

  const handleDeleteBlock = (bIndex: number) => {
    setCurrentBlocks(prev => prev.filter((_, idx) => idx !== bIndex));
    setSavingStatus('unsaved');
  };

  // --------------------------------------------------------------------------
  // INLINE FORMATTING TOOLBAR HELPER
  // --------------------------------------------------------------------------

  const handleInsertFormatting = (bIndex: number, field: string, tagBefore: string, tagAfter: string = '') => {
    const block = currentBlocks[bIndex];
    if (!block) return;
    const content = { ...(block.content as any) };
    const currentVal = content[field] || '';

    content[field] = currentVal ? `${currentVal}\n${tagBefore} ${tagAfter}` : `${tagBefore} ${tagAfter}`;
    handleUpdateBlockContent(bIndex, content);
  };

  // --------------------------------------------------------------------------
  // CLOUDFLARE R2 IMAGE UPLOAD HANDLER
  // --------------------------------------------------------------------------

  const handleTriggerUpload = (blockIndex: number, field: string = 'image') => {
    setActiveUploadTarget({ blockIndex, field });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget || !course) return;

    const { blockIndex, field } = activeUploadTarget;
    setUploadingBlockIndex(blockIndex);

    try {
      // 1. Optimize & Upload directly to Cloudflare R2
      const result = await courseStudioService.uploadCourseImage(file, course.id, false);

      // 2. Update Block Content with R2 URL
      const block = currentBlocks[blockIndex];
      const content = { ...(block.content as any) };

      if (field === 'image') {
        if (block.block_type === 'text_image') {
          content.image = { ...(content.image || {}), url: result.publicUrl, storage_key: result.storageKey };
        } else {
          content.url = result.publicUrl;
          content.storage_key = result.storageKey;
        }
      }

      handleUpdateBlockContent(blockIndex, content);
    } catch (err: any) {
      setErrorBanner(err.message || 'Image upload failed.');
    } finally {
      setUploadingBlockIndex(null);
      setActiveUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // QUESTION SECTION ACTIONS
  // --------------------------------------------------------------------------

  const handleAddQuestion = () => {
    const newQ: CourseQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      episode_id: selectedEpisodeId || '',
      course_id: course?.id || '',
      question_text: '',
      question_type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A',
      explanation: '',
      skill: course?.subject || 'General',
      concept: 'Concept Practice',
      difficulty: 'medium',
      points: 10,
      order_index: currentQuestions.length
    };

    setCurrentQuestions(prev => [...prev, newQ]);
    setSavingStatus('unsaved');
  };

  const handleUpdateQuestion = (qIndex: number, field: string, value: any) => {
    setCurrentQuestions(prev => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], [field]: value };
      return next;
    });
    setSavingStatus('unsaved');
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setCurrentQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
    setSavingStatus('unsaved');
  };

  // --------------------------------------------------------------------------
  // SAVE EPISODE DATA
  // --------------------------------------------------------------------------

  const handleSaveCurrentEpisode = async () => {
    if (!course || !selectedEpisodeId) return;

    setSavingStatus('saving');
    try {
      await courseStudioService.updateEpisode(course.id, selectedEpisodeId, {
        title: episodeTitle,
        estimated_minutes: estimatedMinutes,
        episode_type: 'lesson',
        order_index: 0
      });

      const savedBlocks = await courseStudioService.saveEpisodeBlocks(course.id, selectedEpisodeId, currentBlocks);
      setCurrentBlocks(savedBlocks);

      const savedQuestions = await courseStudioService.saveEpisodeQuestions(course.id, selectedEpisodeId, currentQuestions);
      setCurrentQuestions(savedQuestions);

      setCourse(prev => {
        if (!prev) return prev;
        const nextUnits = (prev.units || []).map(u => ({
          ...u,
          episodes: (u.episodes || []).map(ep => {
            if (ep.id === selectedEpisodeId) {
              return { ...ep, title: episodeTitle, estimated_minutes: estimatedMinutes, blocks: savedBlocks, questions: savedQuestions };
            }
            return ep;
          })
        }));
        return { ...prev, units: nextUnits };
      });

      setSavingStatus('saved');
    } catch (err: any) {
      setSavingStatus('unsaved');
      setErrorBanner(err.message || 'Failed to save episode changes.');
    }
  };

  // --------------------------------------------------------------------------
  // AI ACTIONS
  // --------------------------------------------------------------------------

  const handleBuildLessonWithAI = async () => {
    if (!course || !rawPastedMaterial.trim()) {
      setErrorBanner('Please paste teaching material to build the lesson.');
      return;
    }

    setAiGeneratingLesson(true);
    setErrorBanner(null);

    try {
      const res = await courseStudioService.buildLessonWithAI({
        course_id: course.id,
        raw_material: rawPastedMaterial,
        course_title: course.title,
        unit_title: course.units?.find(u => u.id === selectedUnitId)?.title || 'Unit 1',
        subject: course.subject,
        grade_level: course.grade_level
      });

      setAiReviewOutput({
        type: 'lesson',
        title: res.title,
        summary: res.summary,
        blocks: res.blocks || [],
        questions: res.suggested_questions || []
      });
      setRightPanelTab('ai');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to build lesson with AI.');
    } finally {
      setAiGeneratingLesson(false);
    }
  };

  const handleGenerateQuestionsWithAI = async () => {
    if (!course) return;
    const contentText = currentBlocks.map(b => (b.content as any)?.text || '').join('\n\n') || rawPastedMaterial;
    if (!contentText.trim()) {
      setErrorBanner('Please write or paste content in the lesson first so AI can generate grounded questions.');
      return;
    }

    setAiGeneratingQuestions(true);
    setErrorBanner(null);

    try {
      const res = await courseStudioService.generateQuestionsWithAI({
        course_id: course.id,
        episode_id: selectedEpisodeId || undefined,
        scope: 'episode',
        content_text: contentText,
        question_types: ['multiple_choice'],
        question_count: aiQuestionCount,
        difficulty: aiQuestionDifficulty,
        target_grade: course.grade_level,
        subject: course.subject
      });

      setAiReviewOutput({
        type: 'questions',
        questions: res.questions || []
      });
      setRightPanelTab('ai');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to generate questions with AI.');
    } finally {
      setAiGeneratingQuestions(false);
    }
  };

  const handleApplyAIOutput = () => {
    if (!aiReviewOutput) return;

    if (aiReviewOutput.type === 'lesson') {
      if (aiReviewOutput.title) setEpisodeTitle(aiReviewOutput.title);
      if (aiReviewOutput.blocks) {
        const formattedBlocks = aiReviewOutput.blocks.map((b: any, idx: number) => ({
          id: `blk_ai_${Date.now()}_${idx}`,
          episode_id: selectedEpisodeId || '',
          course_id: course?.id || '',
          block_type: b.block_type || 'text',
          order_index: idx,
          content: b.content || {}
        }));
        setCurrentBlocks(formattedBlocks);
      }

      if (aiReviewOutput.questions) {
        const formattedQuestions = aiReviewOutput.questions.map((q: any, idx: number) => ({
          id: `q_ai_${Date.now()}_${idx}`,
          episode_id: selectedEpisodeId || '',
          course_id: course?.id || '',
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          skill: q.skill || course?.subject || 'Grammar',
          concept: q.concept || 'General',
          difficulty: q.difficulty || 'medium',
          points: 10,
          order_index: idx
        }));
        setCurrentQuestions(formattedQuestions);
      }
    } else if (aiReviewOutput.type === 'questions') {
      const formattedQuestions = (aiReviewOutput.questions || []).map((q: any, idx: number) => ({
        id: `q_ai_${Date.now()}_${idx}`,
        episode_id: selectedEpisodeId || '',
        course_id: course?.id || '',
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        skill: q.skill || course?.subject || 'Grammar',
        concept: q.concept || 'General',
        difficulty: q.difficulty || 'medium',
        points: 10,
        order_index: currentQuestions.length + idx
      }));
      setCurrentQuestions(prev => [...prev, ...formattedQuestions]);
    }

    setAiReviewOutput(null);
    setSavingStatus('unsaved');
  };

  if (loading || !course) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fcfaf6]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#026fc3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading Course Studio Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#fcfaf6] font-sans antialiased text-slate-800 overflow-hidden">
      
      {/* Hidden File Input for R2 Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* TOP APP BAR */}
      <header className="h-16 bg-white border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/course-studio')}
            className="p-2 rounded-xl hover:bg-stone-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
            title="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-stone-200" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none truncate max-w-xs sm:max-w-md">
                {course.title}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#026fc3] text-[10px] font-black border border-sky-100 uppercase">
                {course.subject}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {course.grade_level} • {course.status === 'published' ? 'Published' : 'Draft'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-2">
            {savingStatus === 'saving' && (
              <span className="text-amber-600 flex items-center gap-1 font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" /> Saving...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {savingStatus === 'unsaved' && (
              <span className="text-slate-400 font-semibold">Unsaved changes</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/course-studio/${course.id}/preview`)}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentEpisode}
            disabled={savingStatus === 'saving'}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish & Assign</span>
          </button>
        </div>
      </header>

      {/* 3-PANEL WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. LEFT PANEL: COURSE OUTLINE */}
        <aside className="w-72 bg-white border-r border-stone-200/80 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#026fc3]" />
              <span>Course Outline</span>
            </div>
            <button
              type="button"
              onClick={handleAddUnit}
              className="p-1.5 rounded-lg hover:bg-sky-50 text-[#026fc3] transition-all cursor-pointer"
              title="Add Unit"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {(course.units || []).map((unit) => {
              const isExpanded = expandedUnits[unit.id] ?? true;

              return (
                <div key={unit.id} className="rounded-xl border border-stone-200/70 overflow-hidden bg-stone-50/50">
                  {/* Unit Title Header */}
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

                  {/* Episodes List */}
                  {isExpanded && (
                    <div className="p-1.5 space-y-1">
                      {(unit.episodes || []).map(ep => {
                        const isSelected = selectedEpisodeId === ep.id;

                        return (
                          <div
                            key={ep.id}
                            onClick={() => selectEpisode(ep, unit.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 border border-sky-200 text-[#026fc3] shadow-2xs'
                                : 'hover:bg-stone-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#026fc3]' : 'text-slate-400'}`} />
                              <span className="truncate">{ep.title}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {ep.estimated_minutes || 15}m
                              </span>
                              {(unit.episodes?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={e => handleDeleteEpisode(e, ep.id, unit.id)}
                                  className="p-1 hover:text-rose-600 text-slate-300"
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
          </div>
        </aside>

        {/* 2. CENTER PANEL: EDITORIAL CONTENT STUDIO */}
        <main className="flex-1 bg-[#fcfaf6] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-[760px] mx-auto space-y-6">

            {errorBanner && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
                <button onClick={() => setErrorBanner(null)} className="text-rose-600 font-black">✕</button>
              </div>
            )}

            {/* Lesson Title & Duration Header */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Lesson / Episode Title</label>
                <input
                  type="text"
                  value={episodeTitle}
                  onChange={e => {
                    setEpisodeTitle(e.target.value);
                    setSavingStatus('unsaved');
                  }}
                  placeholder="e.g. Day 1: Introduction to Simple Present"
                  className="w-full text-base font-black text-slate-900 bg-transparent border-0 border-b border-stone-200 focus:border-[#026fc3] focus:ring-0 px-0 py-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Duration</label>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={estimatedMinutes}
                      onChange={e => {
                        setEstimatedMinutes(parseInt(e.target.value, 10) || 15);
                        setSavingStatus('unsaved');
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs font-bold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500 font-bold">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PASTE TEACHING MATERIAL & AI BUILDER CARD (Assistive) */}
            <div className="bg-gradient-to-br from-[#0a213c] to-[#0f3460] text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#fbbf24]" />
                  <h3 className="text-sm font-black text-white">Paste Raw Material & Build with AI</h3>
                </div>
                <span className="text-[10px] font-black uppercase text-sky-200 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                  Optional AI
                </span>
              </div>

              <textarea
                rows={2}
                value={rawPastedMaterial}
                onChange={e => setRawPastedMaterial(e.target.value)}
                placeholder="Paste lesson text, notes, or article content to automatically structure into sections..."
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-xs font-medium text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400 focus:outline-none"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-300 font-bold">Quick Examples:</span>
                  <button
                    type="button"
                    onClick={() => setRawPastedMaterial('The simple present tense expresses habits, general truths, and repeated actions. For third-person singular (he, she, it), add -s or -es to the base verb (e.g. He walks, She watches). For negatives, use do not / does not + base verb.')}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-sky-200 border border-white/10 transition-all cursor-pointer"
                  >
                    Simple Present Rules
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawPastedMaterial('Photosynthesis is the process by which green plants convert light energy into chemical energy. Plants take in carbon dioxide and water to produce glucose and oxygen using sunlight absorbed by chlorophyll in chloroplasts.')}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-sky-200 border border-white/10 transition-all cursor-pointer"
                  >
                    Photosynthesis
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBuildLessonWithAI}
                  disabled={aiGeneratingLesson || !rawPastedMaterial.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-amber-400 text-slate-900 text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGeneratingLesson ? 'Building...' : '✨ Build with AI'}</span>
                </button>
              </div>
            </div>

            {/* INLINE AI PROPOSAL BANNER */}
            {aiReviewOutput && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-300 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-black text-slate-900">
                      ✨ AI Structured Lesson Proposal Ready
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiReviewOutput(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  AI parsed your material into <span className="font-extrabold text-slate-900">{aiReviewOutput.blocks?.length || 0} structured concept blocks</span> and <span className="font-extrabold text-slate-900">{aiReviewOutput.questions?.length || 0} practice questions</span> with concept metadata.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyAIOutput}
                    className="px-5 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept & Create Blocks in Lesson</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiReviewOutput(null)}
                    className="px-4 py-2.5 bg-white hover:bg-stone-100 text-slate-700 rounded-xl text-xs font-bold border border-stone-200 transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* CONTENT BLOCKS STREAM */}
            <div className="space-y-5">
              {currentBlocks.map((block, bIdx) => {
                const content = block.content as any;

                return (
                  <div
                    key={block.id || bIdx}
                    className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-4 relative group"
                  >
                    {/* Block Header Toolbar */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                          {block.block_type === 'text' && <FileText className="w-3.5 h-3.5 text-[#026fc3]" />}
                          {block.block_type === 'text_image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />}
                          {block.block_type === 'text_video' && <Video className="w-3.5 h-3.5 text-rose-500" />}
                          {block.block_type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />}
                          {block.block_type === 'youtube_video' && <Video className="w-3.5 h-3.5 text-rose-500" />}
                          {block.block_type === 'youtube_short' && <Play className="w-3.5 h-3.5 text-rose-600" />}
                          <span>{block.block_type.replace('_', ' + ')} Section</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Move Up/Down */}
                        <button
                          type="button"
                          disabled={bIdx === 0}
                          onClick={() => handleMoveBlock(bIdx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={bIdx === currentBlocks.length - 1}
                          onClick={() => handleMoveBlock(bIdx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(bIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete Block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Section Title (Optional) */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={content.title || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, title: e.target.value })}
                        placeholder="Section Heading (e.g. Introduction, Core Concepts) — Optional"
                        className="w-full text-xs font-bold text-slate-900 border-0 border-b border-stone-100 focus:border-[#026fc3] focus:ring-0 px-0 py-1"
                      />
                    </div>

                    {/* --- TYPE 1: PURE TEXT BLOCK --- */}
                    {block.block_type === 'text' && (
                      <div className="space-y-2">
                        {/* Formatting Toolbar */}
                        <div className="flex items-center gap-1 bg-stone-50 p-1.5 rounded-lg border border-stone-200/60 text-xs">
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '**Bold Text**')}
                            className="p-1 hover:bg-white rounded text-slate-700 font-bold"
                            title="Bold"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '*Italic Text*')}
                            className="p-1 hover:bg-white rounded text-slate-700 italic"
                            title="Italic"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '### Subheading')}
                            className="p-1 hover:bg-white rounded text-slate-700"
                            title="Heading"
                          >
                            <Heading className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '- Bullet item')}
                            className="p-1 hover:bg-white rounded text-slate-700"
                            title="Bullet List"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '1. Numbered item')}
                            className="p-1 hover:bg-white rounded text-slate-700"
                            title="Numbered List"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting(bIdx, 'text', '> Callout / Quote')}
                            className="p-1 hover:bg-white rounded text-slate-700"
                            title="Quote / Callout"
                          >
                            <Quote className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <textarea
                          rows={6}
                          value={content.text || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, text: e.target.value })}
                          placeholder="Write or paste reading passage here (paragraphs will be rendered with clean 14px typography)..."
                          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-[14px] leading-relaxed font-normal text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* --- TYPE 2: TEXT + IMAGE COMBINED SECTION --- */}
                    {block.block_type === 'text_image' && (
                      <div className="space-y-4">
                        {/* Image Controls Toolbar (Position, Size, Upload) */}
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            {/* Position Selector */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">Image Position:</span>
                              {(['left', 'right', 'above', 'below'] as const).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateBlockContent(bIdx, {
                                      ...content,
                                      image: { ...(content.image || {}), position: p }
                                    })
                                  }
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                                    (content.image?.position || 'right') === p
                                      ? 'bg-[#026fc3] text-white shadow-2xs'
                                      : 'bg-white text-slate-700 border border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>

                            {/* Size Selector */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">Size:</span>
                              {(['small', 'medium', 'large'] as const).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateBlockContent(bIdx, {
                                      ...content,
                                      image: { ...(content.image || {}), size: s }
                                    })
                                  }
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                                    (content.image?.size || 'medium') === s
                                      ? 'bg-slate-900 text-white shadow-2xs'
                                      : 'bg-white text-slate-700 border border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Image URL & Upload button */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={content.image?.url || ''}
                              onChange={e =>
                                handleUpdateBlockContent(bIdx, {
                                  ...content,
                                  image: { ...(content.image || {}), url: e.target.value }
                                })
                              }
                              placeholder="Image URL or upload directly via Cloudflare R2..."
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleTriggerUpload(bIdx, 'image')}
                              disabled={uploadingBlockIndex === bIdx}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingBlockIndex === bIdx ? 'Uploading...' : 'Upload'}</span>
                            </button>
                          </div>

                          {/* Optional Caption */}
                          <input
                            type="text"
                            value={content.image?.caption || ''}
                            onChange={e =>
                              handleUpdateBlockContent(bIdx, {
                                ...content,
                                image: { ...(content.image || {}), caption: e.target.value }
                              })
                            }
                            placeholder="Optional Image Caption (e.g. Figure 1: The young eagle...)"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-600"
                          />
                        </div>

                        {/* Text Area for the story / explanation */}
                        <textarea
                          rows={6}
                          value={content.text || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, text: e.target.value })}
                          placeholder="Write text that will wrap around the image in the student view (14px comfortable reading typography)..."
                          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-[14px] leading-relaxed font-normal text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* --- TYPE 3: TEXT + VIDEO COMBINED SECTION --- */}
                    {block.block_type === 'text_video' && (
                      <div className="space-y-4">
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">Video Position:</span>
                              {(['left', 'right', 'above', 'below'] as const).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateBlockContent(bIdx, {
                                      ...content,
                                      video: { ...(content.video || {}), position: p }
                                    })
                                  }
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                                    (content.video?.position || 'right') === p
                                      ? 'bg-[#026fc3] text-white shadow-2xs'
                                      : 'bg-white text-slate-700 border border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <input
                            type="text"
                            value={content.video?.url || ''}
                            onChange={e =>
                              handleUpdateBlockContent(bIdx, {
                                ...content,
                                video: {
                                  ...(content.video || {}),
                                  url: e.target.value,
                                  is_short: e.target.value.includes('/shorts/')
                                }
                              })
                            }
                            placeholder="Paste YouTube Video or YouTube Short URL..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800"
                          />
                        </div>

                        <textarea
                          rows={6}
                          value={content.text || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, text: e.target.value })}
                          placeholder="Write text that will accompany the video..."
                          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-[14px] leading-relaxed font-normal text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* --- TYPE 4: STANDALONE IMAGE --- */}
                    {block.block_type === 'image' && (
                      <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={content.url || ''}
                            onChange={e => handleUpdateBlockContent(bIdx, { ...content, url: e.target.value })}
                            placeholder="Image URL or upload..."
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(bIdx, 'image')}
                            disabled={uploadingBlockIndex === bIdx}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingBlockIndex === bIdx ? 'Uploading...' : 'Upload'}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={content.caption || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, caption: e.target.value })}
                          placeholder="Optional image caption..."
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-600"
                        />
                      </div>
                    )}

                    {/* --- TYPE 5: STANDALONE YOUTUBE / SHORTS --- */}
                    {(block.block_type === 'youtube_video' || block.block_type === 'youtube_short') && (
                      <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <input
                          type="text"
                          value={content.url || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, url: e.target.value })}
                          placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=... or https://youtube.com/shorts/...)"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-800"
                        />
                        <input
                          type="text"
                          value={content.title || ''}
                          onChange={e => handleUpdateBlockContent(bIdx, { ...content, title: e.target.value })}
                          placeholder="Video Title / Caption (Optional)"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-600"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* + ADD SECTION BUTTON & POLISHED VISUAL PICKER */}
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
                        Write or paste lesson text (14px)
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
                        Combine text with wrapped image
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
                        Combine explanation with video
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
                        16:9 widescreen video embed
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
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#fbbf24]" />
                  <h3 className="text-sm font-black text-slate-900">
                    Interactive Practice Questions ({currentQuestions.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateQuestionsWithAI}
                    disabled={aiGeneratingQuestions}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#026fc3] border border-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiGeneratingQuestions ? 'Generating...' : 'AI Generate'}</span>
                  </button>
                </div>
              </div>

              {currentQuestions.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-xl space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    No practice questions added yet for this lesson.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 bg-[#026fc3] text-white rounded-lg text-xs font-bold"
                  >
                    + Add First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-4 rounded-xl bg-stone-50/70 border border-stone-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">Question {qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="text-slate-400 hover:text-rose-600 text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>

                      <input
                        type="text"
                        value={q.question_text}
                        onChange={e => handleUpdateQuestion(qIdx, 'question_text', e.target.value)}
                        placeholder="Enter question text here..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs font-bold text-slate-900"
                      />

                      {/* Options & Correct Answer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options as string[]).map((opt, oIdx) => (
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

                      {/* Concept & Explanation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          value={q.concept || ''}
                          onChange={e => handleUpdateQuestion(qIdx, 'concept', e.target.value)}
                          placeholder="Concept (e.g. Subject-Verb Agreement)"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-[11px] text-slate-700"
                        />
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={e => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="Explanation shown after answering"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-[11px] text-slate-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>

        {/* 3. RIGHT PANEL: AI CO-PILOT & COURSE SETTINGS */}
        <aside className="w-80 bg-white border-l border-stone-200/80 flex flex-col shrink-0 overflow-hidden">
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
                <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 text-xs space-y-1">
                  <span className="font-black text-[#026fc3]">AI Assessment Co-Pilot</span>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Generate grounded multiple-choice questions from your lesson text with educational concept tags.
                  </p>
                </div>

                <div className="space-y-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                  <label className="text-xs font-bold text-slate-800">Question Count</label>
                  <div className="flex gap-2">
                    {[3, 5, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAiQuestionCount(cnt)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          aiQuestionCount === cnt
                            ? 'bg-[#026fc3] text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-stone-200'
                        }`}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>

                  <label className="text-xs font-bold text-slate-800 pt-1 block">Difficulty</label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as const).map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiQuestionDifficulty(diff)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                          aiQuestionDifficulty === diff
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-stone-200'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQuestionsWithAI}
                    disabled={aiGeneratingQuestions}
                    className="w-full py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiGeneratingQuestions ? 'Generating Questions...' : 'Generate Practice Questions'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Course Title</label>
                  <input
                    type="text"
                    value={course.title}
                    onChange={e => setCourse({ ...course, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Subject</label>
                  <input
                    type="text"
                    value={course.subject}
                    onChange={e => setCourse({ ...course, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Grade Level</label>
                  <input
                    type="text"
                    value={course.grade_level || 'Grade 8'}
                    onChange={e => setCourse({ ...course, grade_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Short Description</label>
                  <textarea
                    rows={3}
                    value={course.short_description || ''}
                    onChange={e => setCourse({ ...course, short_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Publish Modal */}
      {publishModalOpen && course && (
        <CoursePublishModal
          course={course}
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          onSuccess={() => {
            setPublishModalOpen(false);
            if (courseId) loadCourseData(courseId);
          }}
        />
      )}
    </div>
  );
};
