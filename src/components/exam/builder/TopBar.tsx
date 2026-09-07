// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: TOP BAR (PREMIUM LIGHT)
// Header control center with title, section navigation strip, AI tools, Preview & Publish
// ============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  FileSpreadsheet,
  Bot,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Settings,
  Sliders,
  Sparkles
} from 'lucide-react';
import { AssessmentType, ExamSection } from '../shared/ExamSchema';

interface TopBarProps {
  title: string;
  subject?: string;
  grade?: string;
  assessmentType: AssessmentType;
  sections?: ExamSection[];
  activeSectionId?: string;
  onSelectSection?: (sectionId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt?: Date;
  onUndo: () => void;
  onRedo: () => void;
  onChangeTitle: (title: string) => void;
  onBack: () => void;
  onOpenBlueprint: () => void;
  onOpenAdjustExam?: () => void;
  onOpenCreationMode?: () => void;
  onOpenAIWizard?: () => void;
  onOpenAISuite: () => void;
  onOpenSettings: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subject = 'English Language',
  grade = 'Grade 10',
  assessmentType: _assessmentType,
  sections = [],
  activeSectionId,
  onSelectSection,
  canUndo,
  canRedo,
  saveStatus,
  lastSavedAt,
  onUndo,
  onRedo,
  onChangeTitle,
  onBack,
  onOpenBlueprint,
  onOpenAdjustExam,
  onOpenCreationMode,
  onOpenAIWizard,
  onOpenAISuite,
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
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xs select-none">
      {/* Left Section: Back, Brand, Title, Subject/Grade */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title="Back to Classroom"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title & Metadata Editor */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-black text-sm text-indigo-600 tracking-tight">
              EdTechra
            </span>
            <span className="text-slate-300">|</span>
          </div>

          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="px-2.5 py-1 text-sm font-black bg-white border-2 border-indigo-600 rounded-lg text-slate-900 shadow-xs focus:outline-hidden max-w-[200px] sm:max-w-xs md:max-w-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempTitle(title);
                setIsEditingTitle(true);
              }}
              className="text-sm font-black text-slate-900 hover:text-indigo-600 truncate max-w-[160px] sm:max-w-xs text-left transition-colors flex items-center gap-1.5 group"
              title="Click to rename"
            >
              <span className="truncate">{title || 'Untitled Assessment'}</span>
              <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          {/* Subject & Grade Badges */}
          <div className="hidden lg:flex items-center gap-1.5 text-slate-600 text-xs">
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-800">{subject}</span>
            <span className="text-slate-300">•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-black">
              {grade}
            </span>
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="hidden xl:flex items-center gap-1 border-l border-slate-200 pl-3 ml-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Autosave Status Indicator */}
        <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-slate-600 pl-2">
          {saveStatus === 'saving' && (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-amber-700 font-bold">Saving draft...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-600 font-medium">
                {lastSavedAt
                  ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'All changes saved'}
              </span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-700 font-bold">Unsaved</span>
            </>
          )}
        </div>
      </div>

      {/* Middle: Clean Section Navigation Pills (Desktop) */}
      {sections.length > 0 && onSelectSection && (
        <div className="hidden md:flex items-center gap-1.5 max-w-md overflow-x-auto py-1 px-2">
          {sections.map((sec, sIdx) => {
            const isSecActive = activeSectionId === sec.id;
            const secLetter = String.fromCharCode(65 + sIdx);
            const qCount = (sec.questions?.length || 0) + (sec.activities?.reduce((acc, a) => acc + (a.questions?.length || 0), 0) || 0);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSecActive
                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 shadow-2xs font-black'
                    : 'bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 border border-slate-200'
                }`}
                title={`Jump to Section ${secLetter}`}
              >
                <span className="text-[10px] font-black">{secLetter}</span>
                <span className="truncate max-w-[100px]">{sec.title || `Section ${secLetter}`}</span>
                <span className="text-[10px] text-slate-500 font-semibold">({qCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right Section: Action Controls */}
      <div className="flex items-center gap-2">
        {/* 🎛️ Adjust Exam */}
        {onOpenAdjustExam && (
          <button
            type="button"
            onClick={onOpenAdjustExam}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Adjust exam difficulty, duration, and question distribution"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Adjust Exam</span>
          </button>
        )}

        {/* 🪄 AI Exam Generator Wizard */}
        {onOpenAIWizard && (
          <button
            type="button"
            onClick={onOpenAIWizard}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Open 5-Step AI Exam Generator Wizard"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">AI Generator</span>
          </button>
        )}

        {/* ✨ Creation Flow / Mode */}
        {onOpenCreationMode && (
          <button
            type="button"
            onClick={onOpenCreationMode}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Switch Creation Workflow (Standard, O/L Style, Custom)"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Modes</span>
          </button>
        )}

        {/* 📋 Exam Blueprint */}
        <button
          type="button"
          onClick={onOpenBlueprint}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          title="Configure Exam Blueprint Matrix"
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline">Blueprint</span>
        </button>

        {/* 🤖 AI Assessment Tools */}
        <button
          type="button"
          onClick={onOpenAISuite}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-2xs"
          title="AI Assessment Suite"
        >
          <Bot className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline">AI Tools</span>
        </button>

        {/* ⚙️ Assessment Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-indigo-600 hover:border-indigo-400 transition-all flex items-center gap-1.5 shadow-2xs"
          title="Assessment Settings"
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* 👁️ Student Preview */}
        <button
          type="button"
          onClick={onOpenPreview}
          className="p-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-indigo-600 hover:border-indigo-400 transition-all flex items-center gap-1.5 shadow-2xs"
          title="Preview Student Experience"
        >
          <Eye className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* 🚀 Publish */}
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
};
