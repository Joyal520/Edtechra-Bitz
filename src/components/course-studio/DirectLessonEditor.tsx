// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIRECT LESSON PREVIEW EDITOR (CANVA-STYLE)
// In-place, visual "What You See Is What You Edit" Course Authoring.
// Features CanvaInlineTextEditor with floating contextual toolbar,
// 11+ visual block types (Headings, Quotes, Callouts, Images, Audio, Video),
// WCAG-compliant theme & contrast awareness, and Cloudflare R2 uploads.
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  Image as ImageIcon,
  UploadCloud,
  Video,
  FileText,
  Edit3,
  BookOpen,
  Quote,
  Heading,
  Volume2,
  Minus
} from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  BlockType,
  QuestionType
} from '@/types/courseStudio';
import { FormattedLessonText } from '@/utils/courseTextFormatting';
import { courseStudioService } from '@/services/courseStudioService';
import { MarkdownGuideModal } from '@/components/course-studio/MarkdownGuideModal';
import { CanvaInlineTextEditor } from '@/components/course-studio/CanvaInlineTextEditor';
import { getThemePreset } from '@/utils/courseThemes';
import {
  normalizeQuestionOptions,
  isOptionMatchingStudentAnswer
} from '@/utils/questionGrading';
import {
  QUESTION_CATEGORIES,
  QUESTION_TYPE_LABELS
} from '@/utils/questionSchemaValidator';

interface DirectLessonEditorProps {
  blocks: CourseBlock[];
  questions: CourseQuestion[];
  onChangeBlocks: (blocks: CourseBlock[]) => void;
  onChangeQuestions: (questions: CourseQuestion[]) => void;
  onOpenAiAssistant: () => void;
  onOpenAddQuestions?: () => void;
  themeId?: string;
}

export const DirectLessonEditor: React.FC<DirectLessonEditorProps> = ({
  blocks,
  questions,
  onChangeBlocks,
  onChangeQuestions,
  onOpenAiAssistant,
  onOpenAddQuestions,
  themeId = 'midnight-navy'
}) => {
  // Active editing block tracking (index)
  const [activeEditingBlockIdx, setActiveEditingBlockIdx] = useState<number | null>(null);
  const [activeEditingQuestionIdx, setActiveEditingQuestionIdx] = useState<number | null>(null);
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const [showAddQuestionMenu, setShowAddQuestionMenu] = useState(false);
  const [showMarkdownGuide, setShowMarkdownGuide] = useState(false);
  const [uploadingBlockIdx, setUploadingBlockIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTargetBlockIdxRef = useRef<number | null>(null);

  // Active theme properties for contrast awareness
  const activeTheme = getThemePreset(themeId);
  const surfaceHex = activeTheme.cardBgHex || '#ffffff';

  // --------------------------------------------------------------------------
  // 1. BLOCK ACTIONS: UPDATE, MOVE, DUPLICATE, DELETE
  // --------------------------------------------------------------------------
  const updateBlockContent = (idx: number, newContent: any) => {
    const next = [...blocks];
    next[idx] = { ...next[idx], content: newContent };
    onChangeBlocks(next);
  };

  const moveBlock = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeBlocks(next);
  };

  const duplicateBlock = (idx: number) => {
    const next = [...blocks];
    const cloned = JSON.parse(JSON.stringify(next[idx]));
    next.splice(idx + 1, 0, cloned);
    onChangeBlocks(next);
  };

  const deleteBlock = (idx: number) => {
    const next = blocks.filter((_, i) => i !== idx);
    onChangeBlocks(next);
    if (activeEditingBlockIdx === idx) setActiveEditingBlockIdx(null);
  };

  const handleAddSection = (type: BlockType) => {
    let content: any = { text: '' };
    if (type === 'text') {
      content = { title: '', text: 'Type or paste lesson content here...' };
    } else if (type === 'heading') {
      content = { level: 'h2', text: 'Section Heading' };
    } else if (type === 'quote') {
      content = { quote: 'Inspiring quote or key takeaway from this lesson...', author: 'Author or Speaker' };
    } else if (type === 'callout') {
      content = { type: 'tip', title: '💡 Pro Tip', text: 'Key takeaway or note for students to remember.' };
    } else if (type === 'divider') {
      content = {};
    } else if (type === 'audio') {
      content = { title: 'Lesson Narration', url: '' };
    } else if (type === 'text_image') {
      content = {
        title: '',
        text: 'Type story or explanation text here...',
        image: {
          url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
          position: 'above',
          caption: 'Visual story illustration'
        }
      };
    } else if (type === 'image') {
      content = {
        image: {
          url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
          caption: ''
        }
      };
    } else if (type === 'text_video' || type === 'youtube_video') {
      content = {
        title: '',
        text: 'Review the video lesson above.',
        video: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', position: 'above' }
      };
    }

    const next = [...blocks, { block_type: type, content, order_index: blocks.length } as CourseBlock];
    onChangeBlocks(next);
    setShowAddSectionMenu(false);
    setActiveEditingBlockIdx(next.length - 1);
  };

  // --------------------------------------------------------------------------
  // 2. IMAGE UPLOAD HANDLER (CLOUDFLARE R2)
  // --------------------------------------------------------------------------
  const triggerImageUpload = (bIdx: number) => {
    fileTargetBlockIdxRef.current = bIdx;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bIdx = fileTargetBlockIdxRef.current;
    if (!file || bIdx === null || bIdx >= blocks.length) return;

    setUploadingBlockIdx(bIdx);
    try {
      const res = await courseStudioService.uploadCourseImage(file, 'general', true);
      const curContent = blocks[bIdx].content as any;
      const nextImg = {
        ...(curContent?.image || {}),
        url: res.publicUrl,
        storageKey: res.storageKey
      };
      updateBlockContent(bIdx, { ...curContent, image: nextImg });
    } catch (err: any) {
      alert(err.message || 'Failed to upload image to Cloudflare R2.');
    } finally {
      setUploadingBlockIdx(null);
      fileTargetBlockIdxRef.current = null;
    }
  };

  // --------------------------------------------------------------------------
  // 3. QUESTION ACTIONS: ADD, EDIT, DELETE
  // --------------------------------------------------------------------------
  const handleAddQuestion = (type: QuestionType) => {
    let initialOptions: any = ['Option A', 'Option B', 'Option C', 'Option D'];
    let initialCorrect = 'A';
    let whType: any = undefined;
    let expectedAnswer: string | undefined = undefined;
    let acceptableAnswers: string[] | undefined = undefined;
    let evaluation: any = undefined;

    if (type === 'multiple_choice') {
      initialOptions = [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' }
      ];
      initialCorrect = 'A';
    } else if (type === 'true_false') {
      initialOptions = ['True', 'False'];
      initialCorrect = 'True';
    } else if (type === 'yes_no') {
      initialOptions = ['Yes', 'No'];
      initialCorrect = 'Yes';
    } else if (type === 'wh_question') {
      initialOptions = ['London', 'She is from London'];
      initialCorrect = 'Emily is from London.';
      expectedAnswer = 'Emily is from London.';
      acceptableAnswers = ['London', 'She is from London', 'She lives in London'];
      whType = 'where';
      evaluation = {
        ai_evaluated: true,
        criteria: ['comprehension', 'accuracy', 'key_details']
      };
    } else if (type === 'fill_blank') {
      initialOptions = [];
      initialCorrect = 'sky';
    }

    const newQ: CourseQuestion = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}`,
      course_id: '',
      episode_id: '',
      question_text: type === 'wh_question' ? 'Where is Emily from?' : 'New practice question based on this lesson',
      question_type: type,
      options: initialOptions,
      correct_answer: initialCorrect,
      expected_answer: expectedAnswer,
      acceptable_answers: acceptableAnswers,
      wh_type: whType,
      evaluation,
      explanation: 'Explanation of why this answer is correct.',
      skill: type === 'wh_question' ? 'Reading Comprehension' : 'Comprehension',
      concept: 'Core Lesson Takeaway',
      difficulty: 'medium',
      points: 10,
      order_index: questions.length
    };
    const next = [...questions, newQ];
    onChangeQuestions(next);
    setShowAddQuestionMenu(false);
    setActiveEditingQuestionIdx(next.length - 1);
  };

  const updateQuestion = (qIdx: number, updates: Partial<CourseQuestion>) => {
    const next = [...questions];
    next[qIdx] = { ...next[qIdx], ...updates };
    onChangeQuestions(next);
  };

  const deleteQuestion = (qIdx: number) => {
    const next = questions.filter((_, i) => i !== qIdx);
    onChangeQuestions(next);
    if (activeEditingQuestionIdx === qIdx) setActiveEditingQuestionIdx(null);
  };

  const moveQuestion = (qIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(qIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChangeQuestions(next);
    if (activeEditingQuestionIdx === qIdx) {
      setActiveEditingQuestionIdx(targetIdx);
    }
  };

  const duplicateQuestion = (qIdx: number) => {
    const original = questions[qIdx];
    const duplicated: CourseQuestion = {
      ...JSON.parse(JSON.stringify(original)),
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}`,
      order_index: questions.length
    };
    const next = [...questions];
    next.splice(qIdx + 1, 0, duplicated);
    onChangeQuestions(next);
    setActiveEditingQuestionIdx(qIdx + 1);
  };

  return (
    <div className="w-full space-y-8 font-sans antialiased text-theme-primary">
      {/* Hidden File Input for R2 Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* ------------------------------------------------------------------- */}
      {/* 1. INTERACTIVE CONTENT BLOCKS STREAM                                */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-6">
        {blocks.map((block, bIdx) => {
          const isEditing = activeEditingBlockIdx === bIdx;
          const blockContent = block.content as any;

          return (
            <div
              key={bIdx}
              className={`group relative rounded-2xl sm:rounded-3xl border transition-all duration-200 surface-card ${
                isEditing
                  ? 'border-[#026fc3] ring-2 ring-[#026fc3]/30 shadow-xl p-4 sm:p-6'
                  : 'border-[var(--theme-border-primary)] hover:border-[#026fc3]/50 shadow-xs p-3 sm:p-5'
              }`}
            >
              {/* BLOCK TOOLBAR (TOP ROW) */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--theme-border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--theme-surface-subtle)] text-theme-secondary border border-[var(--theme-border-subtle)]">
                    {block.block_type.replace('_', ' + ')}
                  </span>
                  {blockContent.title && (
                    <span className="text-xs font-bold text-theme-primary truncate max-w-xs">
                      {blockContent.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveEditingBlockIdx(isEditing ? null : bIdx)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      isEditing
                        ? 'bg-[#026fc3] text-white shadow-xs'
                        : 'bg-[var(--theme-surface-subtle)] text-theme-primary hover:bg-[var(--theme-surface-interactive-hover)]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Done' : 'Edit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, bIdx - 1)}
                    disabled={bIdx === 0}
                    className="p-1 rounded-md text-theme-muted hover:text-theme-primary disabled:opacity-20 cursor-pointer"
                    title="Move Up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, bIdx + 1)}
                    disabled={bIdx === blocks.length - 1}
                    className="p-1 rounded-md text-theme-muted hover:text-theme-primary disabled:opacity-20 cursor-pointer"
                    title="Move Down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateBlock(bIdx)}
                    className="p-1 rounded-md text-theme-muted hover:text-theme-primary cursor-pointer"
                    title="Duplicate Section"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteBlock(bIdx)}
                    className="p-1 rounded-md text-theme-muted hover:text-rose-600 cursor-pointer"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: HEADING                                           */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'heading' && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={blockContent.level || 'h2'}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, level: e.target.value })}
                        className="px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-bold"
                      >
                        <option value="h1">H1 (Title)</option>
                        <option value="h2">H2 (Section)</option>
                        <option value="h3">H3 (Subsection)</option>
                      </select>
                      <input
                        type="text"
                        value={blockContent.text || blockContent.title || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, text: e.target.value, title: e.target.value })}
                        placeholder="Enter section heading..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-sm font-black focus:outline-none focus:ring-1 focus:ring-[#026fc3]"
                      />
                    </div>
                  ) : (
                    <div onClick={() => setActiveEditingBlockIdx(bIdx)} className="cursor-pointer">
                      {blockContent.level === 'h1' ? (
                        <h1 className="text-2xl font-black text-theme-primary">{blockContent.text || 'Untitled Heading'}</h1>
                      ) : blockContent.level === 'h3' ? (
                        <h3 className="text-base font-bold text-theme-primary">{blockContent.text || 'Untitled Heading'}</h3>
                      ) : (
                        <h2 className="text-xl font-bold text-theme-primary">{blockContent.text || 'Untitled Heading'}</h2>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT                                              */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'text' && (
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--theme-border-subtle)]">
                        <span className="text-[11px] font-bold text-theme-muted">Canva-Style In-Place Text Editor</span>
                        <button
                          type="button"
                          onClick={() => setShowMarkdownGuide(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-theme-accent hover:underline cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Markdown Guide</span>
                        </button>
                      </div>
                      <CanvaInlineTextEditor
                        value={blockContent.text || ''}
                        onChange={newText => updateBlockContent(bIdx, { ...blockContent, text: newText })}
                        surfaceBgColor={surfaceHex}
                        placeholder="Type or format lesson text directly..."
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveEditingBlockIdx(bIdx)}
                      className="cursor-pointer hover:bg-sky-50/10 p-2 rounded-xl transition-colors"
                      title="Click to edit text"
                    >
                      <FormattedLessonText text={blockContent.text || ''} />
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT + IMAGE                                      */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'text_image' && (
                <div className="space-y-3">
                  {/* Semantic Image Zone Selector (When Editing) */}
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-primary)] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Story Illustration</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-[11px] font-bold text-theme-muted">Position:</span>
                            <select
                              value={blockContent.image?.position || 'above'}
                              onChange={e => {
                                const nextImg = { ...(blockContent.image || {}), position: e.target.value };
                                updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                              }}
                              className="px-2 py-1 rounded-lg border border-[var(--theme-border-primary)] text-xs font-bold bg-[var(--theme-surface-input)] text-theme-primary"
                            >
                              <option value="above">Above Text</option>
                              <option value="below">Below Text</option>
                              <option value="left">Float Left</option>
                              <option value="right">Float Right</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => triggerImageUpload(bIdx)}
                            disabled={uploadingBlockIdx === bIdx}
                            className="px-2.5 py-1 rounded-lg bg-[var(--theme-surface-interactive)] hover:bg-[var(--theme-surface-interactive-hover)] border border-[var(--theme-border-primary)] text-xs font-bold text-theme-primary flex items-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-[#026fc3]" />
                            <span>{uploadingBlockIdx === bIdx ? 'Uploading...' : 'Upload Image'}</span>
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={blockContent.image?.caption || ''}
                        onChange={e => {
                          const nextImg = { ...(blockContent.image || {}), caption: e.target.value };
                          updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                        }}
                        placeholder="Image Caption (Optional)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--theme-surface-input)] border border-[var(--theme-border-primary)] text-xs text-theme-primary"
                      />
                    </div>
                  )}

                  {/* In-Place Text Editor when editing */}
                  {isEditing ? (
                    <div className="space-y-3">
                      {blockContent.image?.url && (
                        <figure className="text-center my-2">
                          <img
                            src={blockContent.image.url}
                            alt={blockContent.image.caption || 'Illustration'}
                            className="w-full max-h-[360px] object-cover rounded-xl shadow-xs mx-auto"
                          />
                          {blockContent.image.caption && (
                            <figcaption className="text-xs text-theme-muted italic mt-1 font-serif">
                              {blockContent.image.caption}
                            </figcaption>
                          )}
                        </figure>
                      )}
                      <CanvaInlineTextEditor
                        value={blockContent.text || ''}
                        onChange={newText => updateBlockContent(bIdx, { ...blockContent, text: newText })}
                        surfaceBgColor={surfaceHex}
                        placeholder="Type story explanation..."
                      />
                    </div>
                  ) : (
                    /* Position-aware preview when closed / not editing */
                    <div onClick={() => setActiveEditingBlockIdx(bIdx)} className="cursor-pointer">
                      {(() => {
                        const img = blockContent.image || {};
                        const pos = img.position || 'above';
                        const renderFigure = (extraClasses = '') => (
                          <figure className={`text-center my-2 ${extraClasses}`}>
                            <img
                              src={img.url}
                              alt={img.caption || 'Illustration'}
                              className="w-full max-h-[360px] object-cover rounded-xl shadow-xs mx-auto"
                            />
                            {img.caption && (
                              <figcaption className="text-xs text-theme-muted italic mt-1 font-serif">
                                {img.caption}
                              </figcaption>
                            )}
                          </figure>
                        );

                        if (!img.url) {
                          return <FormattedLessonText text={blockContent.text || ''} />;
                        }

                        if (pos === 'above') {
                          return (
                            <div className="space-y-3">
                              {renderFigure()}
                              <FormattedLessonText text={blockContent.text || ''} />
                            </div>
                          );
                        }

                        if (pos === 'below') {
                          return (
                            <div className="space-y-3">
                              <FormattedLessonText text={blockContent.text || ''} />
                              {renderFigure()}
                            </div>
                          );
                        }

                        if (pos === 'left') {
                          return (
                            <div className="flex flex-col md:flex-row items-start gap-4 my-2">
                              <div className="w-full md:w-[40%] shrink-0">
                                {renderFigure('my-0')}
                              </div>
                              <div className="w-full flex-1 min-w-0">
                                <FormattedLessonText text={blockContent.text || ''} />
                              </div>
                            </div>
                          );
                        }

                        if (pos === 'right') {
                          return (
                            <div className="flex flex-col md:flex-row-reverse items-start gap-4 my-2">
                              <div className="w-full md:w-[40%] shrink-0">
                                {renderFigure('my-0')}
                              </div>
                              <div className="w-full flex-1 min-w-0">
                                <FormattedLessonText text={blockContent.text || ''} />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {renderFigure()}
                            <FormattedLessonText text={blockContent.text || ''} />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: STANDALONE IMAGE                                  */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'image' && (
                <div className="space-y-3">
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-primary)] flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={blockContent.image?.url || ''}
                        onChange={e => {
                          const nextImg = { ...(blockContent.image || {}), url: e.target.value };
                          updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                        }}
                        placeholder="Image URL"
                        className="px-2.5 py-1.5 rounded-lg bg-[var(--theme-surface-input)] border border-[var(--theme-border-primary)] text-xs text-theme-primary flex-1 min-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerImageUpload(bIdx)}
                        disabled={uploadingBlockIdx === bIdx}
                        className="px-3 py-1.5 rounded-lg bg-[var(--theme-surface-interactive)] hover:bg-[var(--theme-surface-interactive-hover)] border border-[var(--theme-border-primary)] text-xs font-bold text-theme-primary flex items-center gap-1 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#026fc3]" />
                        <span>Upload (R2)</span>
                      </button>
                    </div>
                  )}

                  {blockContent.image?.url && (
                    <figure className="text-center">
                      <img
                        src={blockContent.image.url}
                        alt={blockContent.image.caption || 'Image'}
                        className="w-full max-h-[400px] object-cover rounded-xl shadow-xs mx-auto"
                      />
                      {blockContent.image.caption && (
                        <figcaption className="text-xs text-theme-muted italic mt-1 font-serif">
                          {blockContent.image.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: QUOTE                                             */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'quote' && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={blockContent.quote || blockContent.text || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, quote: e.target.value, text: e.target.value })}
                        placeholder="Enter inspirational quote or takeaway..."
                        className="w-full p-2.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-serif italic focus:outline-none"
                      />
                      <input
                        type="text"
                        value={blockContent.author || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, author: e.target.value })}
                        placeholder="Author or Speaker (Optional)"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-bold focus:outline-none"
                      />
                    </div>
                  ) : (
                    <figure onClick={() => setActiveEditingBlockIdx(bIdx)} className="p-4 rounded-xl bg-[var(--theme-surface-subtle)] border-l-4 border-l-[var(--theme-accent)] cursor-pointer">
                      <blockquote className="text-sm font-serif italic text-theme-primary leading-relaxed">
                        “{blockContent.quote || blockContent.text || 'Quote text'}”
                      </blockquote>
                      {blockContent.author && (
                        <figcaption className="text-xs font-bold text-theme-accent text-right mt-1">— {blockContent.author}</figcaption>
                      )}
                    </figure>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: CALLOUT / INFO BOX                                */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'callout' && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={blockContent.type || 'tip'}
                          onChange={e => updateBlockContent(bIdx, { ...blockContent, type: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-bold"
                        >
                          <option value="tip">💡 Pro Tip</option>
                          <option value="note">📌 Note</option>
                          <option value="important">⭐ Important</option>
                          <option value="warning">⚠️ Warning</option>
                        </select>
                        <input
                          type="text"
                          value={blockContent.title || ''}
                          onChange={e => updateBlockContent(bIdx, { ...blockContent, title: e.target.value })}
                          placeholder="Callout title..."
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-bold"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={blockContent.text || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, text: e.target.value })}
                        placeholder="Callout message..."
                        className="w-full p-2.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs"
                      />
                    </div>
                  ) : (
                    <div onClick={() => setActiveEditingBlockIdx(bIdx)} className="p-3.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-subtle)] cursor-pointer space-y-1">
                      <span className="text-xs font-black uppercase text-theme-accent">{blockContent.title || 'Callout Box'}</span>
                      <p className="text-xs text-theme-primary leading-relaxed">{blockContent.text || 'Message text'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: DIVIDER                                           */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'divider' && (
                <div onClick={() => setActiveEditingBlockIdx(bIdx)} className="py-4 flex items-center justify-center gap-3 cursor-pointer select-none opacity-50">
                  <span className="w-16 h-px bg-current" />
                  <span className="text-xs text-theme-accent">✦</span>
                  <span className="w-16 h-px bg-current" />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: AUDIO NARRATION                                   */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'audio' && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={blockContent.title || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, title: e.target.value })}
                        placeholder="Narration Title"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={blockContent.url || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, url: e.target.value })}
                        placeholder="Audio File URL (https://...mp3)"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <div onClick={() => setActiveEditingBlockIdx(bIdx)} className="p-3 rounded-xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-primary)] flex items-center gap-3 cursor-pointer">
                      <Volume2 className="w-5 h-5 text-theme-accent" />
                      <span className="text-xs font-bold text-theme-primary">{blockContent.title || 'Audio Narration'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT + VIDEO                                      */}
              {/* ------------------------------------------------------------- */}
              {(block.block_type === 'text_video' || block.block_type === 'youtube_video') && (
                <div className="space-y-3">
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-primary)] space-y-2">
                      <input
                        type="text"
                        value={blockContent.video?.url || ''}
                        onChange={e => {
                          const nextVid = { ...(blockContent.video || {}), url: e.target.value };
                          updateBlockContent(bIdx, { ...blockContent, video: nextVid });
                        }}
                        placeholder="YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--theme-surface-input)] border border-[var(--theme-border-primary)] text-xs text-theme-primary font-mono"
                      />
                    </div>
                  )}

                  {isEditing ? (
                    <CanvaInlineTextEditor
                      value={blockContent.text || ''}
                      onChange={newText => updateBlockContent(bIdx, { ...blockContent, text: newText })}
                      surfaceBgColor={surfaceHex}
                      placeholder="Type video notes or instructions..."
                    />
                  ) : (
                    <div
                      onClick={() => setActiveEditingBlockIdx(bIdx)}
                      className="cursor-pointer hover:bg-sky-50/10 p-2 rounded-xl transition-colors"
                    >
                      <FormattedLessonText text={blockContent.text || ''} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. ADD SECTION COMPACT MENU BUTTON                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="pt-2 flex items-center justify-center relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--theme-surface-card)] hover:bg-[var(--theme-surface-interactive-hover)] border-2 border-dashed border-[#026fc3]/50 text-theme-accent text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Section</span>
          </button>

          {showAddSectionMenu && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 bg-[var(--theme-surface-card)] text-theme-primary rounded-2xl shadow-2xl border border-[var(--theme-border-primary)] p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-theme-muted">
                Typography & Content
              </div>
              <div className="grid grid-cols-2 gap-1 pb-2 border-b border-[var(--theme-border-subtle)]">
                <button
                  type="button"
                  onClick={() => handleAddSection('heading')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Heading className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('text')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rich Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('quote')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('callout')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Callout Box</span>
                </button>
              </div>

              <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-theme-muted">
                Media & Visuals
              </div>
              <div className="grid grid-cols-2 gap-1 pb-2 border-b border-[var(--theme-border-subtle)]">
                <button
                  type="button"
                  onClick={() => handleAddSection('text_image')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Text + Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('image')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>Image Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('text_video')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-rose-500" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('audio')}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Audio Narration</span>
                </button>
              </div>

              <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-theme-muted">
                Divider & AI
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleAddSection('divider')}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-bold text-theme-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 text-theme-muted" />
                  <span>Decorative Divider</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSectionMenu(false);
                    onOpenAiAssistant();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-left text-xs font-bold text-theme-accent flex items-center gap-2 cursor-pointer border border-sky-400/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>✨ Generate Section with AI</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. PRACTICE QUESTIONS DIRECT EDITOR                                 */}
      {/* ------------------------------------------------------------------- */}
      <div className="pt-8 border-t border-[var(--theme-border-primary)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-theme-primary tracking-tight flex items-center gap-2">
              <span>Practice Questions & Quizzes</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent">
                {questions.length} Questions
              </span>
            </h3>
            <p className="text-xs text-theme-muted">
              Interactive assessment activities students complete after reading.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddQuestions || onOpenAiAssistant}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ADD QUESTIONS</span>
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.map((q, qIdx) => {
            const isEditingQ = activeEditingQuestionIdx === qIdx;
            return (
              <div
                key={q.id || qIdx}
                className={`p-4 rounded-2xl border transition-all surface-card ${
                  isEditingQ
                    ? 'border-[#026fc3] ring-2 ring-[#026fc3]/30 shadow-md'
                    : 'border-[var(--theme-border-primary)] hover:border-[#026fc3]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#026fc3] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-theme-accent bg-[var(--theme-accent-soft)] px-2 py-0.5 rounded-md">
                      {q.question_type}
                    </span>
                    {q.skill && (
                      <span className="text-[10px] text-theme-muted">
                        • {q.skill}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {q.points || 10} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(qIdx, 'up')}
                      disabled={qIdx === 0}
                      className="p-1 text-theme-muted hover:text-theme-primary disabled:opacity-25 rounded cursor-pointer disabled:cursor-not-allowed"
                      title="Move Question Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(qIdx, 'down')}
                      disabled={qIdx === questions.length - 1}
                      className="p-1 text-theme-muted hover:text-theme-primary disabled:opacity-25 rounded cursor-pointer disabled:cursor-not-allowed"
                      title="Move Question Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateQuestion(qIdx)}
                      className="p-1 text-theme-muted hover:text-[#026fc3] rounded cursor-pointer"
                      title="Duplicate Question"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEditingQuestionIdx(isEditingQ ? null : qIdx)}
                      className="px-2 py-1 text-xs font-bold text-theme-muted hover:text-theme-primary rounded cursor-pointer"
                    >
                      {isEditingQ ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(qIdx)}
                      className="p-1 text-theme-muted hover:text-rose-500 rounded cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt Preview */}
                {!isEditingQ && (
                  <p className="mt-2 text-xs font-bold text-theme-primary line-clamp-1">
                    {q.question_text}
                  </p>
                )}

                {/* Question Editor Fields */}
                {isEditingQ && (
                  <div className="mt-3 space-y-3 pt-2 border-t border-[var(--theme-border-subtle)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-theme-muted uppercase">Question Type</span>
                        <select
                          value={q.question_type}
                          onChange={e => {
                            const newType = e.target.value as QuestionType;
                            let newOpts = q.options;
                            let newCorrect = q.correct_answer;
                            let whType = q.wh_type;
                            let expected = q.expected_answer;

                            if (newType === 'multiple_choice') {
                              newOpts = normalizeQuestionOptions(q.options || ['Option A', 'Option B', 'Option C', 'Option D']);
                              newCorrect = 'A';
                            } else if (newType === 'true_false') {
                              newOpts = ['True', 'False'];
                              newCorrect = 'True';
                            } else if (newType === 'yes_no') {
                              newOpts = ['Yes', 'No'];
                              newCorrect = 'Yes';
                            } else if (newType === 'wh_question') {
                              whType = 'what';
                              expected = q.correct_answer || 'Expected answer based on lesson';
                              newCorrect = expected;
                            }

                            updateQuestion(qIdx, {
                              question_type: newType,
                              options: newOpts,
                              correct_answer: newCorrect,
                              wh_type: whType,
                              expected_answer: expected
                            });
                          }}
                          className="w-full p-2 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs font-bold text-theme-primary"
                        >
                          {QUESTION_CATEGORIES.map(cat => (
                            <optgroup key={cat.id} label={`Category ${cat.code}: ${cat.name}`}>
                              {cat.types.map(t => (
                                <option key={t} value={t}>
                                  {QUESTION_TYPE_LABELS[t] || t}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-theme-muted uppercase">Points</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.points || 10}
                          onChange={e => updateQuestion(qIdx, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full p-2 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs font-bold text-theme-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-theme-muted">Question Prompt</span>
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={e => updateQuestion(qIdx, { question_text: e.target.value })}
                        placeholder="Question prompt"
                        className="w-full p-2.5 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs sm:text-sm font-bold text-theme-primary focus:outline-none focus:ring-1 focus:ring-[#026fc3]"
                      />
                    </div>

                    {/* Passage / Content Ref */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-theme-muted">Passage Reference (Optional)</span>
                      <input
                        type="text"
                        value={q.passage || q.content_ref || ''}
                        onChange={e => updateQuestion(qIdx, { passage: e.target.value, content_ref: e.target.value })}
                        placeholder="Quote or paragraph excerpt from lesson..."
                        className="w-full p-2 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs text-theme-primary"
                      />
                    </div>

                    {/* Options Editor for Multiple Choice */}
                    {q.question_type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-[#026fc3]/40">
                        <span className="text-[11px] font-bold text-theme-muted">Answer Options & Correct Answer</span>
                        {normalizeQuestionOptions(q.options).map((normOpt, oIdx) => {
                          const isOptionCorrect = isOptionMatchingStudentAnswer(normOpt, q.correct_answer);
                          return (
                            <div key={normOpt.id || oIdx} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-black flex items-center justify-center shrink-0">
                                {normOpt.id}
                              </span>
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={isOptionCorrect}
                                onChange={() => updateQuestion(qIdx, { correct_answer: normOpt.id })}
                                className="accent-[#10b981] cursor-pointer"
                                title={`Mark option ${normOpt.id} as correct`}
                              />
                              <input
                                type="text"
                                value={normOpt.text}
                                onChange={e => {
                                  const nextOpts = [...(q.options as any[])];
                                  if (typeof nextOpts[oIdx] === 'object' && nextOpts[oIdx] !== null) {
                                    nextOpts[oIdx] = { ...nextOpts[oIdx], text: e.target.value };
                                  } else {
                                    nextOpts[oIdx] = e.target.value;
                                  }
                                  updateQuestion(qIdx, { options: nextOpts });
                                }}
                                className="flex-1 p-2 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs text-theme-primary"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* WH Question Specific Fields */}
                    {q.question_type === 'wh_question' && (
                      <div className="space-y-3 p-3 rounded-xl bg-sky-50/50 border border-sky-200/60">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700">WH Question Focus</span>
                            <select
                              value={q.wh_type || 'what'}
                              onChange={e => updateQuestion(qIdx, { wh_type: e.target.value as any })}
                              className="w-full p-2 rounded-lg border border-stone-200 text-xs font-bold text-slate-800 bg-white"
                            >
                              <option value="who">Who (Person / Character)</option>
                              <option value="what">What (Fact / Object / Action)</option>
                              <option value="where">Where (Place / Origin)</option>
                              <option value="when">When (Time / Sequence)</option>
                              <option value="why">Why (Reason / Motive)</option>
                              <option value="how">How (Process / Manner)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700">Expected Model Answer</span>
                            <input
                              type="text"
                              value={q.expected_answer || q.correct_answer || ''}
                              onChange={e => updateQuestion(qIdx, { expected_answer: e.target.value, correct_answer: e.target.value })}
                              placeholder="e.g. Emily is from London."
                              className="w-full p-2 rounded-lg border border-stone-200 text-xs font-medium text-slate-800 bg-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-700">Acceptable Variations (comma separated)</span>
                          <input
                            type="text"
                            value={Array.isArray(q.acceptable_answers) ? q.acceptable_answers.join(', ') : ''}
                            onChange={e => {
                              const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              updateQuestion(qIdx, { acceptable_answers: list });
                            }}
                            placeholder="e.g. London, She is from London, She lives in London"
                            className="w-full p-2 rounded-lg border border-stone-200 text-xs font-medium text-slate-800 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Generic Options for other types */}
                    {q.question_type !== 'multiple_choice' && q.question_type !== 'wh_question' && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-[#026fc3]/40">
                        <span className="text-[11px] font-bold text-theme-muted">Options & Correct Answer</span>
                        {(q.options as any[]).map((rawOpt, oIdx) => {
                          const opt = typeof rawOpt === 'string' ? rawOpt : (rawOpt?.text || String(rawOpt));
                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={q.correct_answer === opt}
                                onChange={() => updateQuestion(qIdx, { correct_answer: opt })}
                                className="accent-[#10b981] cursor-pointer"
                                title="Mark as correct answer"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const nextOpts = [...(q.options as any[])];
                                  nextOpts[oIdx] = e.target.value;
                                  updateQuestion(qIdx, { options: nextOpts });
                                }}
                                className="flex-1 p-2 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs text-theme-primary"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-theme-muted">Explanation</span>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={e => updateQuestion(qIdx, { explanation: e.target.value })}
                        placeholder="Explanation shown after answering..."
                        className="w-full p-2 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-xs text-theme-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Question Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 relative">
          <button
            type="button"
            onClick={onOpenAddQuestions || onOpenAiAssistant}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ADD QUESTIONS (AI BUILDER)</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddQuestionMenu(!showAddQuestionMenu)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--theme-surface-card)] hover:bg-[var(--theme-surface-interactive-hover)] border border-[var(--theme-border-primary)] text-theme-primary text-xs font-bold shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Manually</span>
            </button>

            {showAddQuestionMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-h-80 overflow-y-auto bg-[var(--theme-surface-card)] text-theme-primary rounded-xl shadow-xl border border-[var(--theme-border-primary)] p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                {QUESTION_CATEGORIES.map(cat => (
                  <div key={cat.id} className="mb-2">
                    <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-theme-muted block border-b border-stone-100 dark:border-slate-800">
                      Cat {cat.code}: {cat.name}
                    </span>
                    <div className="space-y-0.5 pt-1">
                      {cat.types.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleAddQuestion(t)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--theme-surface-interactive-hover)] text-left text-xs font-medium flex items-center justify-between"
                        >
                          <span>{QUESTION_TYPE_LABELS[t] || t}</span>
                          {t === 'wh_question' && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-100 text-sky-700">AI</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Markdown Guide Modal */}
      {showMarkdownGuide && (
        <MarkdownGuideModal
          isOpen={showMarkdownGuide}
          onClose={() => setShowMarkdownGuide(false)}
        />
      )}
    </div>
  );
};
