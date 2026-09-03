// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIRECT LESSON PREVIEW EDITOR
// "What You See Is What You Edit" In-Place Course Authoring Experience.
// Teacher edits Markdown, moves images between semantic zones (above, left,
// right, below), uploads R2 media, adds sections & questions directly in preview.
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
  BookOpen
} from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  BlockType,
  QuestionType
} from '@/types/courseStudio';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { courseStudioService } from '@/services/courseStudioService';
import { MarkdownGuideModal } from '@/components/course-studio/MarkdownGuideModal';

interface DirectLessonEditorProps {
  blocks: CourseBlock[];
  questions: CourseQuestion[];
  onChangeBlocks: (blocks: CourseBlock[]) => void;
  onChangeQuestions: (questions: CourseQuestion[]) => void;
  onOpenAiAssistant: () => void;
}

export const DirectLessonEditor: React.FC<DirectLessonEditorProps> = ({
  blocks,
  questions,
  onChangeBlocks,
  onChangeQuestions,
  onOpenAiAssistant
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
      content = { title: '', text: 'Type or paste lesson content here (Markdown supported)...' };
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
    const newQ: CourseQuestion = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}`,
      course_id: '',
      episode_id: '',
      question_text: 'New practice question based on this lesson',
      question_type: type,
      options: type === 'true_false' ? ['True', 'False'] : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: type === 'true_false' ? 'True' : 'Option A',
      explanation: 'Explanation of why this answer is correct.',
      skill: 'Comprehension',
      concept: 'Core Lesson Takeaway',
      difficulty: 'easy',
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

  return (
    <div className="w-full space-y-8 font-sans antialiased text-slate-800">
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
              className={`group relative rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
                isEditing
                  ? 'border-[#026fc3] bg-white shadow-xl ring-2 ring-[#026fc3]/20 p-4 sm:p-6'
                  : 'border-stone-200/80 hover:border-sky-300 bg-white/70 hover:bg-white shadow-xs p-3 sm:p-5'
              }`}
            >
              {/* BLOCK TOOLBAR (TOP ROW) */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                    {block.block_type.replace('_', ' + ')}
                  </span>
                  {blockContent.title && (
                    <span className="text-xs font-bold text-slate-700 truncate max-w-xs">
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
                        : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Done Editing' : 'Edit Section'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, bIdx - 1)}
                    disabled={bIdx === 0}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    title="Move Up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock(bIdx, bIdx + 1)}
                    disabled={bIdx === blocks.length - 1}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    title="Move Down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateBlock(bIdx)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Duplicate Section"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteBlock(bIdx)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SECTION HEADING (EDITABLE WHEN ACTIVE) */}
              {isEditing ? (
                <div className="mb-3 space-y-1">
                  <input
                    type="text"
                    value={blockContent.title || ''}
                    onChange={e => updateBlockContent(bIdx, { ...blockContent, title: e.target.value })}
                    placeholder="Section Heading (Optional)"
                    className="w-full text-sm font-bold text-slate-900 border-b border-stone-200 focus:border-[#026fc3] focus:outline-none pb-1"
                  />
                </div>
              ) : (
                blockContent.title && (
                  <h3 className="text-sm font-black text-slate-800 tracking-tight mb-2">
                    {blockContent.title}
                  </h3>
                )
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT                                              */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'text' && (
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-400">Lesson Markdown Text</span>
                        <button
                          type="button"
                          onClick={() => setShowMarkdownGuide(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#026fc3] hover:underline cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Markdown Guide</span>
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={blockContent.text || ''}
                        onChange={e => updateBlockContent(bIdx, { ...blockContent, text: e.target.value })}
                        placeholder="Type or paste lesson content here..."
                        className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm leading-relaxed text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none font-sans"
                      />
                      <p className="text-[11px] text-slate-500">
                        Markdown supported: headings (# H1, ## H2), bold (**text**), lists, and tables.
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveEditingBlockIdx(bIdx)}
                      className="cursor-pointer hover:bg-sky-50/40 p-2 rounded-xl transition-colors"
                      title="Click to edit text"
                    >
                      <MarkdownRenderer content={blockContent.text || ''} />
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT + IMAGE                                      */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'text_image' && (
                <div className="space-y-3">
                  {/* Interactive Semantic Image Zone Toolbar (When Editing) */}
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Image Position:</span>
                        </span>

                        {/* Semantic Position Buttons */}
                        <div className="inline-flex items-center rounded-lg bg-stone-200/70 p-0.5 text-xs font-bold">
                          {(['above', 'left', 'right', 'below'] as const).map(pos => {
                            const isCurrent = (blockContent.image?.position || 'above') === pos;
                            return (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => {
                                  const nextImg = { ...(blockContent.image || {}), position: pos };
                                  updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                                }}
                                className={`px-2 py-1 rounded-md capitalize transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {pos}
                              </button>
                            );
                          })}
                        </div>

                        {/* R2 Upload Button */}
                        <button
                          type="button"
                          onClick={() => triggerImageUpload(bIdx)}
                          disabled={uploadingBlockIdx === bIdx}
                          className="px-3 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#026fc3]" />
                          <span>{uploadingBlockIdx === bIdx ? 'Uploading...' : 'Upload Image (R2)'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={blockContent.image?.url || ''}
                          onChange={e => {
                            const nextImg = { ...(blockContent.image || {}), url: e.target.value };
                            updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                          }}
                          placeholder="Image URL or upload above"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                        />
                        <input
                          type="text"
                          value={blockContent.image?.caption || ''}
                          onChange={e => {
                            const nextImg = { ...(blockContent.image || {}), caption: e.target.value };
                            updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                          }}
                          placeholder="Optional caption"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Rendered Visual Layout */}
                  {(() => {
                    const pos = blockContent.image?.position || 'above';
                    const imgUrl = blockContent.image?.url;
                    const caption = blockContent.image?.caption;

                    const ImageEl = imgUrl ? (
                      <figure className="space-y-1.5 text-center">
                        <img
                          src={imgUrl}
                          alt={caption || 'Lesson visual'}
                          className="w-full max-h-[360px] object-cover rounded-xl shadow-xs mx-auto"
                        />
                        {caption && (
                          <figcaption className="text-xs text-slate-500 italic">
                            {caption}
                          </figcaption>
                        )}
                      </figure>
                    ) : null;

                    const TextEl = isEditing ? (
                      <div className="space-y-1">
                        <textarea
                          rows={5}
                          value={blockContent.text || ''}
                          onChange={e => updateBlockContent(bIdx, { ...blockContent, text: e.target.value })}
                          placeholder="Type or paste lesson content here..."
                          className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm leading-relaxed text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => setActiveEditingBlockIdx(bIdx)}
                        className="cursor-pointer hover:bg-sky-50/40 p-2 rounded-xl transition-colors flex-1"
                        title="Click to edit text"
                      >
                        <MarkdownRenderer content={blockContent.text || ''} />
                      </div>
                    );

                    if (pos === 'above') {
                      return (
                        <div className="space-y-4">
                          {ImageEl}
                          {TextEl}
                        </div>
                      );
                    } else if (pos === 'below') {
                      return (
                        <div className="space-y-4">
                          {TextEl}
                          {ImageEl}
                        </div>
                      );
                    } else if (pos === 'left') {
                      return (
                        <div className="flex flex-col md:flex-row gap-5 items-start">
                          <div className="w-full md:w-[42%] md:max-w-[300px] shrink-0">{ImageEl}</div>
                          <div className="w-full flex-1">{TextEl}</div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex flex-col md:flex-row-reverse gap-5 items-start">
                          <div className="w-full md:w-[42%] md:max-w-[300px] shrink-0">{ImageEl}</div>
                          <div className="w-full flex-1">{TextEl}</div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: STANDALONE IMAGE                                  */}
              {/* ------------------------------------------------------------- */}
              {block.block_type === 'image' && (
                <div className="space-y-3">
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={blockContent.image?.url || ''}
                        onChange={e => {
                          const nextImg = { ...(blockContent.image || {}), url: e.target.value };
                          updateBlockContent(bIdx, { ...blockContent, image: nextImg });
                        }}
                        placeholder="Image URL"
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs flex-1 min-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={() => triggerImageUpload(bIdx)}
                        disabled={uploadingBlockIdx === bIdx}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
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
                        <figcaption className="text-xs text-slate-500 italic mt-1">
                          {blockContent.image.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BLOCK TYPE: TEXT + VIDEO                                      */}
              {/* ------------------------------------------------------------- */}
              {(block.block_type === 'text_video' || block.block_type === 'youtube_video') && (
                <div className="space-y-3">
                  {isEditing && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                      <input
                        type="text"
                        value={blockContent.video?.url || ''}
                        onChange={e => {
                          const nextVid = { ...(blockContent.video || {}), url: e.target.value };
                          updateBlockContent(bIdx, { ...blockContent, video: nextVid });
                        }}
                        placeholder="YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-mono"
                      />
                    </div>
                  )}

                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={blockContent.text || ''}
                      onChange={e => updateBlockContent(bIdx, { ...blockContent, text: e.target.value })}
                      placeholder="Type video instructions or notes..."
                      className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm"
                    />
                  ) : (
                    <div
                      onClick={() => setActiveEditingBlockIdx(bIdx)}
                      className="cursor-pointer hover:bg-sky-50/40 p-2 rounded-xl transition-colors"
                    >
                      <MarkdownRenderer content={blockContent.text || ''} />
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-stone-50 border-2 border-dashed border-[#026fc3]/40 text-[#026fc3] hover:border-[#026fc3] text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Section</span>
          </button>

          {showAddSectionMenu && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Lesson Content
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleAddSection('text')}
                  className="w-full px-3 py-2 rounded-xl hover:bg-sky-50 text-left text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>Text (Markdown)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('text_image')}
                  className="w-full px-3 py-2 rounded-xl hover:bg-emerald-50 text-left text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Text + Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('image')}
                  className="w-full px-3 py-2 rounded-xl hover:bg-stone-100 text-left text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-stone-600" />
                  <span>Standalone Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('text_video')}
                  className="w-full px-3 py-2 rounded-xl hover:bg-rose-50 text-left text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-rose-600" />
                  <span>YouTube Video</span>
                </button>
              </div>

              <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-t border-stone-100 mt-1">
                AI Assistance
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSectionMenu(false);
                  onOpenAiAssistant();
                }}
                className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-left text-xs font-bold text-[#026fc3] flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>✨ Generate Content with AI</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. PRACTICE QUESTIONS DIRECT EDITOR                                 */}
      {/* ------------------------------------------------------------------- */}
      <div className="pt-8 border-t border-stone-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Practice Questions & Quizzes</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {questions.length} Questions
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive assessment activities students complete after reading.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] text-xs font-black border border-sky-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate Questions with AI</span>
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.map((q, qIdx) => {
            const isEditingQ = activeEditingQuestionIdx === qIdx;
            return (
              <div
                key={qIdx}
                className={`p-4 rounded-2xl border transition-all ${
                  isEditingQ
                    ? 'border-[#026fc3] bg-white ring-2 ring-[#026fc3]/20 shadow-md'
                    : 'border-stone-200 bg-stone-50/60 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#026fc3] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                      {q.question_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveEditingQuestionIdx(isEditingQ ? null : qIdx)}
                      className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                    >
                      {isEditingQ ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(qIdx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditingQ ? (
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={e => updateQuestion(qIdx, { question_text: e.target.value })}
                      placeholder="Question prompt"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold text-slate-800"
                    />

                    {/* Options Editor */}
                    {Array.isArray(q.options) && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-sky-200">
                        <span className="text-[11px] font-bold text-slate-400">Answer Options & Key</span>
                        {(q.options as any[]).map((rawOpt, oIdx) => {
                          const opt = typeof rawOpt === 'string' ? rawOpt : (rawOpt?.text || String(rawOpt));
                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={q.correct_answer === opt}
                                onChange={() => updateQuestion(qIdx, { correct_answer: opt })}
                                className="accent-[#10b981]"
                                title="Mark as correct answer"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...(q.options as any[])];
                                  newOpts[oIdx] = e.target.value;
                                  const updates: any = { options: newOpts };
                                  if (q.correct_answer === opt) updates.correct_answer = e.target.value;
                                  updateQuestion(qIdx, updates);
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={e => updateQuestion(qIdx, { explanation: e.target.value })}
                      placeholder="Answer explanation for learners"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-slate-600"
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-700">
                    <p className="font-bold text-slate-900">{q.question_text}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Correct Answer: {q.correct_answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Question Button */}
        <div className="pt-2 relative inline-block">
          <button
            type="button"
            onClick={() => setShowAddQuestionMenu(!showAddQuestionMenu)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#026fc3]" />
            <span>+ Add Question</span>
          </button>

          {showAddQuestionMenu && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 p-1.5 z-30 animate-in fade-in duration-100">
              {(['multiple_choice', 'true_false', 'short_answer'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddQuestion(t)}
                  className="w-full px-3 py-2 rounded-xl hover:bg-sky-50 text-left text-xs font-bold text-slate-700 capitalize cursor-pointer"
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* IN-EDITOR MARKDOWN GUIDE MODAL */}
      <MarkdownGuideModal
        isOpen={showMarkdownGuide}
        onClose={() => setShowMarkdownGuide(false)}
      />
    </div>
  );
};
