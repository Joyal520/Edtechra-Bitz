// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: TOP BAR
// Header control center with title edit, mode badge, undo/redo, autosave, & actions
// ============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Sparkles,
  Palette,
  Bot,
  FileCode2,
  BookMarked,
  Settings,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileQuestion
} from 'lucide-react';
import { AssessmentType } from '../shared/ExamSchema';

interface TopBarProps {
  title: string;
  assessmentType: AssessmentType;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt?: Date;
  onUndo: () => void;
  onRedo: () => void;
  onChangeTitle: (title: string) => void;
  onBack: () => void;
  onOpenAutoDesign: () => void;
  onOpenThemeEditor: () => void;
  onOpenAIAssistant: () => void;
  onOpenPromptBridge: () => void;
  onOpenQuestionBank: () => void;
  onOpenSettings: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  assessmentType,
  canUndo,
  canRedo,
  saveStatus,
  lastSavedAt,
  onUndo,
  onRedo,
  onChangeTitle,
  onBack,
  onOpenAutoDesign,
  onOpenThemeEditor,
  onOpenAIAssistant,
  onOpenPromptBridge,
  onOpenQuestionBank,
  onOpenSettings,
  onOpenPreview,
  onPublish
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onChangeTitle(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-16 border-b border-blue-900/60 bg-[#070e1e]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Left Section: Back, Title, Mode Badge, Undo/Redo */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to Classroom"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title and Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="px-2 py-1 text-sm font-bold bg-[#0a152e] border border-indigo-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[200px] sm:max-w-xs md:max-w-md"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempTitle(title);
                setIsEditingTitle(true);
              }}
              className="text-sm font-bold text-white hover:text-indigo-300 truncate max-w-[160px] sm:max-w-xs md:max-w-sm text-left transition-colors px-1 py-0.5 rounded hover:bg-white/5"
              title="Click to rename"
            >
              {title || 'Untitled Assessment'}
            </button>
          )}

          {/* Assessment Mode Badge */}
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              assessmentType === 'survey'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
            }`}
          >
            {assessmentType === 'survey' ? (
              <>
                <FileQuestion className="w-3 h-3" />
                <span>Survey</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Exam</span>
              </>
            )}
          </span>
        </div>

        {/* Undo / Redo */}
        <div className="hidden md:flex items-center gap-1 border-l border-blue-900/60 pl-3 ml-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Autosave Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 pl-2">
          {saveStatus === 'saving' && (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-300">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">
                {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
              </span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400">Unsaved changes</span>
            </>
          )}
        </div>
      </div>

      {/* Right Section: Tools & Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* ✨ Design with AI */}
        <button
          type="button"
          onClick={onOpenAutoDesign}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-200 hover:text-white hover:border-purple-400 transition-all shadow-sm"
          title="Auto-style with AI"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Design with AI</span>
        </button>

        {/* 🎨 Theme Editor */}
        <button
          type="button"
          onClick={onOpenThemeEditor}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-blue-950/60 border border-blue-800/80 text-slate-200 hover:text-white hover:border-blue-600 transition-all flex items-center gap-1.5"
          title="Themes & Styling"
        >
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Theme</span>
        </button>

        {/* In-Canvas AI Assistant */}
        <button
          type="button"
          onClick={onOpenAIAssistant}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-blue-950/60 border border-blue-800/80 text-slate-200 hover:text-white hover:border-blue-600 transition-all flex items-center gap-1.5"
          title="In-Canvas AI Question Generator"
        >
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="hidden lg:inline">AI Assist</span>
        </button>

        {/* External AI Bridge / JSON Import */}
        <button
          type="button"
          onClick={onOpenPromptBridge}
          className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-950/60 border border-blue-800/80 text-slate-200 hover:text-white hover:border-blue-600 transition-all"
          title="External AI Prompt & JSON Import"
        >
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <span>AI Bridge</span>
        </button>

        {/* Question Bank */}
        <button
          type="button"
          onClick={onOpenQuestionBank}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-blue-950/60 border border-blue-800/80 text-slate-200 hover:text-white hover:border-blue-600 transition-all flex items-center gap-1.5"
          title="Question Bank"
        >
          <BookMarked className="w-4 h-4 text-amber-400" />
          <span className="hidden xl:inline">Bank</span>
        </button>

        {/* Settings Drawer */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-blue-800/60 transition-colors"
          title="Assessment Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Live Preview Modal */}
        <button
          type="button"
          onClick={onOpenPreview}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1.5"
          title="Live Student Preview"
        >
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Publish / Action Button */}
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-indigo-500/25 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
};
