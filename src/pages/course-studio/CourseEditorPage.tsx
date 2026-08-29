// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: 3-PANEL COURSE STUDIO EDITOR
// Left: Outline & Hierarchy | Center: Modular Block Stream | Right: AI Co-Pilot
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  Settings,
  AlertCircle,
  FileText,
  Video,
  Save,
  CheckCircle2
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

  // Cover image upload
  const [uploadingCover, setUploadingCover] = useState(false);

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
      alert(err.message || 'Failed to add unit.');
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
      alert(err.message || 'Failed to add episode.');
    }
  };

  const handleDeleteEpisode = async (e: React.MouseEvent, epId: string, unitId: string) => {
    e.stopPropagation();
    if (!course || !window.confirm('Delete this lesson?')) return;

    try {
      await courseStudioService.deleteEpisode(course.id, epId);
      const updatedUnits = (course.units || []).map(u => {
        if (u.id === unitId) {
          return { ...u, episodes: (u.episodes || []).filter(ep => ep.id !== epId) };
        }
        return u;
      });
      setCourse({ ...course, units: updatedUnits });

      if (selectedEpisodeId === epId) {
        const remainingEp = updatedUnits.find(u => u.id === unitId)?.episodes?.[0];
        if (remainingEp) selectEpisode(remainingEp, unitId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete episode.');
    }
  };

  // --------------------------------------------------------------------------
  // BLOCK EDITING & SAVING
  // --------------------------------------------------------------------------

  const handleAddBlock = (blockType: BlockType) => {
    let initialContent: any = {};
    if (blockType === 'text') initialContent = { title: 'Introduction', text: '' };
    else if (blockType === 'image') initialContent = { url: '', caption: '', alt: '' };
    else if (blockType === 'youtube_video') initialContent = { url: '', title: '', is_short: false };
    else if (blockType === 'youtube_short') initialContent = { url: '', title: '', is_short: true };

    const newBlock: CourseBlock = {
      id: `blk_${Date.now()}`,
      episode_id: selectedEpisodeId || '',
      course_id: course?.id || '',
      block_type: blockType,
      order_index: currentBlocks.length,
      content: initialContent
    };

    setCurrentBlocks(prev => [...prev, newBlock]);
    setSavingStatus('unsaved');
  };

  const handleUpdateBlockContent = (blockIndex: number, newContent: any) => {
    setCurrentBlocks(prev => {
      const next = [...prev];
      next[blockIndex] = { ...next[blockIndex], content: newContent };
      return next;
    });
    setSavingStatus('unsaved');
  };

  const handleDeleteBlock = (blockIndex: number) => {
    setCurrentBlocks(prev => prev.filter((_, idx) => idx !== blockIndex));
    setSavingStatus('unsaved');
  };

  const handleImageUploadForBlock = async (file: File, blockIndex: number) => {
    if (!course) return;
    try {
      const res = await courseStudioService.uploadCourseImage(file, course.id, false);
      handleUpdateBlockContent(blockIndex, {
        ...currentBlocks[blockIndex]?.content,
        url: res.publicUrl,
        storage_key: res.storageKey,
        width: res.width,
        height: res.height
      });
    } catch (err: any) {
      alert(err.message || 'Image upload failed.');
    }
  };

  // --------------------------------------------------------------------------
  // QUESTION EDITING
  // --------------------------------------------------------------------------

  const handleAddQuestion = () => {
    const newQ: CourseQuestion = {
      id: `q_${Date.now()}`,
      episode_id: selectedEpisodeId || '',
      course_id: course?.id || '',
      question_text: '',
      question_type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A',
      explanation: '',
      skill: course?.subject || 'Grammar',
      concept: 'Key Principle',
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
      alert(err.message || 'Failed to save episode content.');
      setSavingStatus('unsaved');
    }
  };

  // --------------------------------------------------------------------------
  // AI TOOLS & ACTIONS
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

  // --------------------------------------------------------------------------
  // COURSE SETTINGS & COVER
  // --------------------------------------------------------------------------

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !course) return;

    setUploadingCover(true);
    try {
      const res = await courseStudioService.uploadCourseImage(file, course.id, true);
      await courseStudioService.updateCourse(course.id, {
        cover_image_url: res.publicUrl,
        cover_image_key: res.storageKey
      });
      setCourse({ ...course, cover_image_url: res.publicUrl, cover_image_key: res.storageKey });
    } catch (err: any) {
      alert(err.message || 'Failed to upload cover.');
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-slate-800">Opening Course Studio...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-lg font-black text-slate-900">Course Not Found</h2>
        <button
          onClick={() => navigate('/course-studio')}
          className="px-5 py-2.5 bg-[#026fc3] text-white text-xs font-black rounded-xl"
        >
          Return to Studio Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#fcfaf6] font-sans antialiased text-slate-800 overflow-hidden">
      
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
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-black text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Lesson</span>
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish & Assign</span>
          </button>
        </div>
      </header>

      {/* 3-PANEL WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. LEFT PANEL: COURSE OUTLINE & HIERARCHY */}
        <aside className="w-72 bg-[#f4efe6] border-r border-stone-200/90 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-stone-200/80 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#026fc3]" />
              <span>Course Outline</span>
            </h2>
            <button
              type="button"
              onClick={handleAddUnit}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-[#026fc3] text-xs font-black transition-all cursor-pointer flex items-center gap-1"
              title="Add Unit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Unit</span>
            </button>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {(course.units || []).map((unit) => {
              const isExpanded = expandedUnits[unit.id] ?? true;

              return (
                <div
                  key={unit.id}
                  className="bg-white/80 rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs"
                >
                  {/* Unit Header */}
                  <div
                    onClick={() => setExpandedUnits(p => ({ ...p, [unit.id]: !isExpanded }))}
                    className="p-3 bg-stone-50 hover:bg-stone-100/70 border-b border-stone-100 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs font-black text-slate-900 truncate">
                        {unit.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleAddEpisode(unit.id);
                      }}
                      className="p-1 rounded hover:bg-white text-[#026fc3] font-black"
                      title="Add Lesson"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Episodes List inside Unit */}
                  {isExpanded && (
                    <div className="p-1.5 space-y-1">
                      {(unit.episodes || []).map((ep) => {
                        const isSelected = selectedEpisodeId === ep.id;

                        return (
                          <div
                            key={ep.id}
                            onClick={() => selectEpisode(ep, unit.id)}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 border border-sky-200 text-[#026fc3] shadow-xs'
                                : 'hover:bg-stone-50 text-slate-700'
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

        {/* 2. CENTER PANEL: MODULAR CONTENT BLOCK STREAM */}
        <main className="flex-1 bg-[#fcfaf6] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {errorBanner && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button onClick={() => setErrorBanner(null)} className="text-rose-600 font-black">✕</button>
            </div>
          )}

          {/* Episode Header & Duration Editor */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Lesson / Day Title</label>
              <input
                type="text"
                value={episodeTitle}
                onChange={e => {
                  setEpisodeTitle(e.target.value);
                  setSavingStatus('unsaved');
                }}
                placeholder="Day 1: Title..."
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

          {/* PASTE TEACHING MATERIAL & AI BUILDER CARD */}
          <div className="bg-gradient-to-br from-[#0a213c] to-[#0f3460] text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#fbbf24]" />
                <h3 className="text-sm font-black text-white">Paste Raw Teaching Material & Build with AI</h3>
              </div>
              <span className="text-[11px] font-black uppercase text-sky-200 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                AI Co-Pilot
              </span>
            </div>

            <textarea
              rows={3}
              value={rawPastedMaterial}
              onChange={e => setRawPastedMaterial(e.target.value)}
              placeholder="Paste lesson text, grammar rules, textbook summary, or class notes here..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-xs font-medium text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400 focus:outline-none"
            />

            {/* Quick Template Chips */}
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

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-300 font-medium">
                AI will organize into structured concept blocks + generate 2-3 practice questions.
              </p>
              <button
                type="button"
                onClick={handleBuildLessonWithAI}
                disabled={aiGeneratingLesson || !rawPastedMaterial.trim()}
                className="px-4 py-2 rounded-xl bg-[#fbbf24] hover:bg-amber-400 text-slate-900 text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiGeneratingLesson ? 'Building Lesson...' : '✨ Build Lesson with AI'}</span>
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
          <div className="space-y-4">
            {currentBlocks.map((block, bIdx) => {
              const content = block.content as any;

              return (
                <div
                  key={block.id || bIdx}
                  className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      {block.block_type === 'text' && <FileText className="w-3.5 h-3.5 text-[#026fc3]" />}
                      {block.block_type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />}
                      {block.block_type === 'youtube_video' && <Video className="w-3.5 h-3.5 text-rose-500" />}
                      {block.block_type === 'youtube_short' && <Play className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{block.block_type.replace('_', ' ')} Block</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(bIdx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-all"
                      title="Remove Block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {block.block_type === 'text' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={content?.title || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, title: e.target.value })}
                        placeholder="Section Title (e.g. Core Rules, Examples)..."
                        className="w-full text-xs font-black text-slate-900 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                      <textarea
                        rows={4}
                        value={content?.text || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, text: e.target.value })}
                        placeholder="Write lesson text or bullet points here..."
                        className="w-full text-xs font-medium text-slate-700 bg-stone-50 p-3 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {block.block_type === 'image' && (
                    <div className="space-y-3">
                      {content?.url ? (
                        <div className="relative rounded-xl overflow-hidden bg-stone-100 max-h-64 flex items-center justify-center">
                          <img src={content.url} alt="Uploaded" className="max-h-64 object-contain rounded-xl" />
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:bg-stone-50 transition-all cursor-pointer block space-y-2">
                          <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">Click to upload visual material (Compressed to WebP)</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUploadForBlock(f, bIdx);
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                      <input
                        type="text"
                        value={content?.caption || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, caption: e.target.value })}
                        placeholder="Optional image caption..."
                        className="w-full text-xs font-medium text-slate-700 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  )}

                  {block.block_type === 'youtube_video' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={content?.title || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, title: e.target.value })}
                        placeholder="Video Title..."
                        className="w-full text-xs font-black text-slate-900 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={content?.url || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, url: e.target.value })}
                        placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                        className="w-full text-xs font-medium text-slate-700 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  )}

                  {block.block_type === 'youtube_short' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={content?.title || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, title: e.target.value })}
                        placeholder="Short Lesson Title..."
                        className="w-full text-xs font-black text-slate-900 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={content?.url || ''}
                        onChange={e => handleUpdateBlockContent(bIdx, { ...content, url: e.target.value, is_short: true })}
                        placeholder="Paste YouTube Short URL (e.g. https://www.youtube.com/shorts/...)"
                        className="w-full text-xs font-medium text-slate-700 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Add Block Bar */}
          <div className="bg-[#f4efe6] rounded-2xl p-3 border border-stone-200/80 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider mr-2">+ Add Block:</span>
            <button
              type="button"
              onClick={() => handleAddBlock('text')}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-800 rounded-xl text-xs font-bold border border-stone-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#026fc3]" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('image')}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-800 rounded-xl text-xs font-bold border border-stone-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Image (R2)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('youtube_video')}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-800 rounded-xl text-xs font-bold border border-stone-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span>YouTube Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('youtube_short')}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-800 rounded-xl text-xs font-bold border border-stone-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-rose-600" />
              <span>YouTube Short</span>
            </button>
          </div>

          {/* QUESTIONS SECTION */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Interactive Practice Questions ({currentQuestions.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {currentQuestions.map((q, qIdx) => {
                const options: string[] = Array.isArray(q.options)
                  ? q.options.map(o => (typeof o === 'string' ? o : (o as any).text || ''))
                  : [];

                return (
                  <div
                    key={q.id || qIdx}
                    className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Question {qIdx + 1}</span>
                        <input
                          type="text"
                          value={q.question_text}
                          onChange={e => handleUpdateQuestion(qIdx, 'question_text', e.target.value)}
                          placeholder="Enter question text..."
                          className="w-full text-xs font-bold text-slate-900 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Concept</label>
                        <input
                          type="text"
                          value={q.concept || ''}
                          onChange={e => handleUpdateQuestion(qIdx, 'concept', e.target.value)}
                          placeholder="e.g. Subject-verb agreement"
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Skill</label>
                        <input
                          type="text"
                          value={q.skill || ''}
                          onChange={e => handleUpdateQuestion(qIdx, 'skill', e.target.value)}
                          placeholder="e.g. Grammar"
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Difficulty</label>
                        <select
                          value={q.difficulty || 'medium'}
                          onChange={e => handleUpdateQuestion(qIdx, 'difficulty', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-semibold text-slate-800"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Points (XP)</label>
                        <input
                          type="number"
                          value={q.points || 10}
                          onChange={e => handleUpdateQuestion(qIdx, 'points', parseInt(e.target.value, 10) || 10)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Answer Options (Select the correct radio button)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((opt, optIdx) => {
                          const isCorrect = opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-xl border flex items-center gap-2 ${
                                isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-stone-50 border-stone-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct_q_${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateQuestion(qIdx, 'correct_answer', opt)}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const nextOpts = [...options];
                                  nextOpts[optIdx] = e.target.value;
                                  handleUpdateQuestion(qIdx, 'options', nextOpts);
                                  if (isCorrect) handleUpdateQuestion(qIdx, 'correct_answer', e.target.value);
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="w-full text-xs font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 p-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">Educational Explanation</label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={e => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                        placeholder="Why is this answer correct? Explain the rule to the student..."
                        className="w-full text-xs font-medium text-slate-700 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </main>

        {/* 3. RIGHT PANEL: AI CO-PILOT & COURSE INSPECTOR */}
        <aside className="w-80 bg-[#f4efe6] border-l border-stone-200/90 flex flex-col shrink-0 overflow-y-auto">
          
          <div className="p-3 border-b border-stone-200/80 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setRightPanelTab('ai')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'ai'
                  ? 'bg-white text-[#026fc3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('settings')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'settings'
                  ? 'bg-white text-[#026fc3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </button>
          </div>

          {rightPanelTab === 'ai' && (
            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              
              {aiReviewOutput && (
                <div className="bg-white rounded-2xl p-4 border-2 border-amber-300 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      ✨ AI Proposal Ready
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiReviewOutput(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      Discard
                    </button>
                  </div>

                  <p className="text-xs font-black text-slate-900">
                    {aiReviewOutput.title || 'Generated AI Content'}
                  </p>

                  <div className="text-[11px] text-slate-600 font-medium space-y-1 max-h-32 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                    {aiReviewOutput.blocks && <p>• {aiReviewOutput.blocks.length} structured content blocks</p>}
                    {aiReviewOutput.questions && <p>• {aiReviewOutput.questions.length} concept questions with metadata</p>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApplyAIOutput}
                      className="w-full py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept & Apply to Lesson</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#026fc3]" />
                  <h4 className="text-xs font-black text-slate-900">Generate Questions</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">Question Count</label>
                    <div className="flex items-center gap-1">
                      {[3, 5, 10].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setAiQuestionCount(cnt)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            aiQuestionCount === cnt ? 'bg-[#026fc3] text-white' : 'bg-stone-100 text-slate-600'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">Difficulty</label>
                    <select
                      value={aiQuestionDifficulty}
                      onChange={e => setAiQuestionDifficulty(e.target.value as any)}
                      className="px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs font-bold text-slate-800"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateQuestionsWithAI}
                  disabled={aiGeneratingQuestions}
                  className="w-full py-2 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGeneratingQuestions ? 'Generating...' : 'Generate with AI'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs font-medium text-slate-700 space-y-1.5 leading-relaxed">
                <p className="font-black text-[#026fc3]">Teacher Course Studio</p>
                <p className="text-[11px] text-slate-500">
                  Every lesson and question set created here is stored once under your account. When you publish, it is assigned seamlessly across classrooms.
                </p>
              </div>

            </div>
          )}

          {rightPanelTab === 'settings' && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase">Course Title</label>
                <input
                  type="text"
                  value={course.title}
                  onChange={async e => {
                    const newTitle = e.target.value;
                    setCourse({ ...course, title: newTitle });
                    await courseStudioService.updateCourse(course.id, { title: newTitle });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase">Subject</label>
                <input
                  type="text"
                  value={course.subject}
                  onChange={async e => {
                    const newSub = e.target.value;
                    setCourse({ ...course, subject: newSub });
                    await courseStudioService.updateCourse(course.id, { subject: newSub });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase">Grade Level</label>
                <input
                  type="text"
                  value={course.grade_level}
                  onChange={async e => {
                    const newGrade = e.target.value;
                    setCourse({ ...course, grade_level: newGrade });
                    await courseStudioService.updateCourse(course.id, { grade_level: newGrade });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="text-[11px] font-black text-slate-600 uppercase">Cover Image (R2)</label>
                {course.cover_image_url && (
                  <img
                    src={course.cover_image_url}
                    alt="Cover"
                    className="w-full h-24 rounded-xl object-cover border border-stone-200"
                  />
                )}
                <label className="w-full py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-slate-700 text-xs font-bold text-center block cursor-pointer">
                  <span>{uploadingCover ? 'Uploading...' : 'Change Cover Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

        </aside>

      </div>

      <CoursePublishModal
        course={course}
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onSuccess={() => {
          loadCourseData(course.id);
          setPublishModalOpen(false);
        }}
      />

    </div>
  );
};
