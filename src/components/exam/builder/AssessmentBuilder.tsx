// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: MASTER WORKSPACE
// "Canva for Educational Assessments" + "Google Forms for Structure"
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CanonicalAssessmentV2,
  CanonicalQuestion,
  ExamMetadata,
  ExamSection,
  SupportedQuestionType,
  BrandKitConfig,
  SurveySettings,
  MultipleChoiceQuestion
} from '../shared/ExamSchema';
import { AssessmentThemeConfig, THEME_PRESETS } from '../shared/themePresets';
import { getQuestionTypeDefinition } from '../shared/QuestionTypeRegistry';

// Subcomponents
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { RightPropertyPanel } from './RightPropertyPanel';
import { AssessmentCanvas } from './canvas/AssessmentCanvas';
import { ThemeEditor } from './design/ThemeEditor';
import { BrandKitEditor } from './design/BrandKitEditor';
import { AutoDesignModal } from './design/AutoDesignModal';
import { InCanvasAIAssistant } from './ai/InCanvasAIAssistant';
import { AIPromptBridge } from './ai/AIPromptBridge';
import { JSONImportModal } from './ai/JSONImportModal';
import { QuestionBankModal } from './question-bank/QuestionBankModal';
import { AssessmentSettingsDrawer } from './settings/AssessmentSettingsDrawer';
import { PublishValidationModal } from './publishing/PublishValidationModal';
import { LivePreviewModal } from './preview/LivePreviewModal';

interface AssessmentBuilderProps {
  initialAssessment?: CanonicalAssessmentV2;
  classroomId: string;
  onSaveAssessment: (assessment: CanonicalAssessmentV2, isPublished: boolean) => Promise<void>;
  onBack: () => void;
}

export const AssessmentBuilder: React.FC<AssessmentBuilderProps> = ({
  initialAssessment,
  classroomId,
  onSaveAssessment,
  onBack
}) => {
  // Default Initial Assessment Generator
  const createDefaultAssessment = (): CanonicalAssessmentV2 => {
    return {
      schemaVersion: '2.0',
      assessmentType: 'exam',
      exam: {
        title: 'Untitled Assessment',
        subject: 'General Knowledge',
        grade: 'Grade 10',
        examType: 'quiz',
        difficulty: 'Medium',
        durationMinutes: 60,
        passPercentage: 60,
        maxAttempts: 1,
        randomizeQuestions: false,
        randomizeOptions: false,
        showMarksImmediately: true,
        showCorrectAnswers: true
      },
      theme: THEME_PRESETS.modern_academy,
      brandKit: {
        enabled: false,
        watermark: false
      },
      surveySettings: {
        isAnonymous: false,
        collectEmail: true,
        oneResponsePerUser: true,
        thankYouMessage: 'Thank you for submitting your responses!'
      },
      sections: [
        {
          id: 'sec_1',
          title: 'Section 1',
          description: 'Basic Knowledge & Concepts',
          questions: [
            {
              id: 'q_init_1',
              type: 'multiple_choice',
              question: 'Which of the following best describes the main concept?',
              options: [
                { id: 'a', text: 'First foundational principle' },
                { id: 'b', text: 'Second supporting observation' },
                { id: 'c', text: 'Alternative hypothesis' },
                { id: 'd', text: 'None of the above' }
              ],
              correctAnswer: ['a'],
              difficulty: 'medium',
              marks: 2,
              required: true
            } as MultipleChoiceQuestion
          ]
        }
      ]
    };
  };

  // Main Assessment State
  const [assessment, setAssessment] = useState<CanonicalAssessmentV2>(
    initialAssessment || createDefaultAssessment()
  );

  // Undo / Redo History Stack
  const [history, setHistory] = useState<CanonicalAssessmentV2[]>([
    initialAssessment || createDefaultAssessment()
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection state
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    assessment.sections?.[0]?.id || 'sec_1'
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    assessment.sections?.[0]?.questions?.[0]?.id || null
  );

  // Sidebar and Modal Visibility States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
  const [isBrandKitDrawerOpen, setIsBrandKitDrawerOpen] = useState(false);
  const [isAutoDesignOpen, setIsAutoDesignOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isPromptBridgeOpen, setIsPromptBridgeOpen] = useState(false);
  const [isJSONImportOpen, setIsJSONImportOpen] = useState(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Autosave Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date());
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Push state to undo/redo history
  const pushToHistory = useCallback((newAssessment: CanonicalAssessmentV2) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      if (next.length >= 30) next.shift();
      return [...next, newAssessment];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Unified assessment updater that triggers history push and debounced autosave
  const updateAssessment = useCallback((
    updater: (prev: CanonicalAssessmentV2) => CanonicalAssessmentV2
  ) => {
    setAssessment((prev) => {
      const next = updater(prev);
      pushToHistory(next);
      setSaveStatus('saving');
      return next;
    });
  }, [pushToHistory]);

  // Debounced Autosave to localStorage and memory
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      try {
        const storageKey = `edtechra_builder_draft_${classroomId}`;
        localStorage.setItem(storageKey, JSON.stringify(assessment));
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setSaveStatus('error');
      }
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [assessment, classroomId]);

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setAssessment(history[targetIndex]);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setAssessment(history[targetIndex]);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSaveAssessment(assessment, false);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, onSaveAssessment, assessment]);

  // Active theme and brand kit
  const activeTheme = assessment.theme || THEME_PRESETS.modern_academy;
  const activeBrandKit: BrandKitConfig = assessment.brandKit || { enabled: false, watermark: false };

  // Currently selected question & section objects
  const selectedSection = assessment.sections.find((s) => s.id === selectedSectionId) || null;
  const selectedQuestion = assessment.sections
    .flatMap((s) => s.questions || [])
    .find((q) => q.id === selectedQuestionId) || null;

  // Metadata Updates
  const handleChangeMetadata = (updates: Partial<ExamMetadata>) => {
    updateAssessment((prev) => ({
      ...prev,
      exam: {
        ...prev.exam,
        ...updates
      }
    }));
  };

  // Question Actions
  const handleAddQuestion = (
    sectionId: string,
    index?: number,
    type: SupportedQuestionType = 'multiple_choice'
  ) => {
    const def = getQuestionTypeDefinition(type);
    const newId = `q_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    let newQuestion: CanonicalQuestion;

    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) {
      newQuestion = {
        id: newId,
        type,
        question: `Untitled ${def.title}`,
        options: [
          { id: 'a', text: 'Option 1' },
          { id: 'b', text: 'Option 2' },
          { id: 'c', text: 'Option 3' },
          { id: 'd', text: 'Option 4' }
        ],
        correctAnswer: ['a'],
        difficulty: 'medium',
        marks: assessment.assessmentType === 'survey' ? 0 : def.defaultMarks,
        required: true
      } as MultipleChoiceQuestion;
    } else if (type === 'true_false') {
      newQuestion = {
        id: newId,
        type: 'true_false',
        question: 'Is this statement true or false?',
        correctAnswer: true,
        difficulty: 'medium',
        marks: assessment.assessmentType === 'survey' ? 0 : 1,
        required: true
      };
    } else {
      newQuestion = {
        id: newId,
        type,
        question: `Untitled ${def.title}`,
        difficulty: 'medium',
        marks: assessment.assessmentType === 'survey' ? 0 : def.defaultMarks,
        required: true
      } as any;
    }

    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const questions = [...(sec.questions || [])];
        if (typeof index === 'number') {
          questions.splice(index, 0, newQuestion);
        } else {
          questions.push(newQuestion);
        }
        return { ...sec, questions };
      });
      return { ...prev, sections: updatedSections };
    });

    setSelectedSectionId(sectionId);
    setSelectedQuestionId(newId);
  };

  const handleUpdateQuestion = (updated: CanonicalQuestion) => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => {
        const questions = (sec.questions || []).map((q) =>
          q.id === updated.id ? updated : q
        );
        return { ...sec, questions };
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => ({
        ...sec,
        questions: (sec.questions || []).filter((q) => q.id !== questionId)
      }));
      return { ...prev, sections: updatedSections };
    });
    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
    }
  };

  const handleDuplicateQuestion = (questionId: string) => {
    let duplicated: CanonicalQuestion | null = null;
    let targetSectionId: string | null = null;
    let targetIndex = -1;

    for (const sec of assessment.sections) {
      const idx = (sec.questions || []).findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        targetSectionId = sec.id;
        targetIndex = idx;
        const original = sec.questions[idx];
        const newId = `q_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 4)}`;
        duplicated = {
          ...original,
          id: newId,
          question: `${original.question} (Copy)`
        };
        break;
      }
    }

    if (duplicated && targetSectionId) {
      const finalDuplicated = duplicated;
      const finalTargetSecId = targetSectionId;
      updateAssessment((prev) => {
        const updatedSections = prev.sections.map((sec) => {
          if (sec.id !== finalTargetSecId) return sec;
          const questions = [...(sec.questions || [])];
          questions.splice(targetIndex + 1, 0, finalDuplicated);
          return { ...sec, questions };
        });
        return { ...prev, sections: updatedSections };
      });
      setSelectedQuestionId(duplicated.id);
    }
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => {
        const questions = [...(sec.questions || [])];
        const idx = questions.findIndex((q) => q.id === questionId);
        if (idx === -1) return sec;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= questions.length) return sec;

        const [moved] = questions.splice(idx, 1);
        questions.splice(targetIdx, 0, moved);
        return { ...sec, questions };
      });
      return { ...prev, sections: updatedSections };
    });
  };

  // Section Actions
  const handleAddSection = () => {
    const newSecNumber = assessment.sections.length + 1;
    const newSecId = `sec_${Date.now().toString(36)}`;
    const newSection: ExamSection = {
      id: newSecId,
      title: `Section ${newSecNumber}`,
      description: '',
      questions: []
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setSelectedSectionId(newSecId);
    setSelectedQuestionId(null);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<ExamSection>) => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      );
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (assessment.sections.length <= 1) return;
    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId)
    }));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(assessment.sections[0]?.id || 'sec_1');
    }
  };

  const handleDuplicateSection = (sectionId: string) => {
    const target = assessment.sections.find((s) => s.id === sectionId);
    if (!target) return;

    const newSecId = `sec_dup_${Date.now().toString(36)}`;
    const duplicatedQuestions: CanonicalQuestion[] = (target.questions || []).map((q) => ({
      ...q,
      id: `q_sec_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    }));

    const duplicatedSection: ExamSection = {
      ...target,
      id: newSecId,
      title: `${target.title} (Copy)`,
      questions: duplicatedQuestions
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: [...prev.sections, duplicatedSection]
    }));

    setSelectedSectionId(newSecId);
  };

  // Theme & Brand Kit Handlers
  const handleApplyTheme = (theme: AssessmentThemeConfig) => {
    updateAssessment((prev) => ({
      ...prev,
      theme
    }));
  };

  const handleChangeBrandKit = (brandKit: BrandKitConfig) => {
    updateAssessment((prev) => ({
      ...prev,
      brandKit
    }));
  };

  // Survey Settings Handlers
  const handleUpdateSurveySettings = (updates: Partial<SurveySettings>) => {
    updateAssessment((prev) => ({
      ...prev,
      surveySettings: {
        ...(prev.surveySettings || {
          isAnonymous: false,
          collectEmail: true,
          oneResponsePerUser: true
        }),
        ...updates
      }
    }));
  };

  // AI Assistant Question Insertion
  const handleInsertAIQuestions = (questions: CanonicalQuestion[]) => {
    updateAssessment((prev) => {
      const targetSecId = selectedSectionId || prev.sections[0]?.id || 'sec_1';
      const updatedSections = prev.sections.map((sec) => {
        if (sec.id !== targetSecId) return sec;
        return {
          ...sec,
          questions: [...(sec.questions || []), ...questions]
        };
      });
      return { ...prev, sections: updatedSections };
    });
    setIsAIAssistantOpen(false);
  };

  // JSON Import handler
  const handleImportSections = (sections: ExamSection[], updatedExamMeta?: any) => {
    updateAssessment((prev) => ({
      ...prev,
      sections,
      exam: updatedExamMeta ? { ...prev.exam, ...updatedExamMeta } : prev.exam
    }));
  };

  // Publish flow execution
  const handleConfirmPublish = async (publishSettings: { startsAt?: string; endsAt?: string }) => {
    const finalAssessment: CanonicalAssessmentV2 = {
      ...assessment,
      exam: {
        ...assessment.exam,
        startsAt: publishSettings.startsAt || null,
        endsAt: publishSettings.endsAt || null
      }
    };
    await onSaveAssessment(finalAssessment, true);
    setIsPublishModalOpen(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050b18] text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Control Center (TopBar) */}
      <TopBar
        title={assessment.exam.title}
        assessmentType={assessment.assessmentType}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onChangeTitle={(title) => handleChangeMetadata({ title })}
        onBack={onBack}
        onOpenAutoDesign={() => setIsAutoDesignOpen(true)}
        onOpenThemeEditor={() => setIsThemeDrawerOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenPromptBridge={() => setIsPromptBridgeOpen(true)}
        onOpenQuestionBank={() => setIsQuestionBankOpen(true)}
        onOpenSettings={() => setIsSettingsDrawerOpen(true)}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onPublish={() => setIsPublishModalOpen(true)}
      />

      {/* 2. Workspace Layout: Left Sidebar + Central Document Canvas + Right Property Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Question Palette & Outline) */}
        <LeftSidebar
          assessment={assessment}
          activeSectionId={selectedSectionId}
          selectedQuestionId={selectedQuestionId}
          selectedSectionId={selectedSectionId}
          onSelectQuestion={(qId) => setSelectedQuestionId(qId)}
          onSelectSection={(secId) => {
            setSelectedSectionId(secId);
            setSelectedQuestionId(null);
          }}
          onAddQuestion={handleAddQuestion}
          onAddSection={handleAddSection}
          isOpen={isLeftSidebarOpen}
          onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        />

        {/* Central Document Workspace (AssessmentCanvas) */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative">
          <AssessmentCanvas
            assessment={assessment}
            theme={activeTheme}
            brandKit={activeBrandKit}
            selectedQuestionId={selectedQuestionId}
            selectedSectionId={selectedSectionId}
            onSelectQuestion={(qId) => setSelectedQuestionId(qId)}
            onSelectSection={(secId) => {
              setSelectedSectionId(secId);
              setSelectedQuestionId(null);
            }}
            onChangeMetadata={handleChangeMetadata}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onDuplicateQuestion={handleDuplicateQuestion}
            onMoveQuestion={handleMoveQuestion}
            onAddQuestion={handleAddQuestion}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onDuplicateSection={handleDuplicateSection}
            onAddSection={handleAddSection}
          />
        </main>

        {/* Right Property Panel (Contextual Inspector) */}
        <RightPropertyPanel
          assessmentType={assessment.assessmentType}
          selectedQuestion={selectedQuestion}
          selectedSection={selectedSection}
          allSections={assessment.sections}
          isOpen={isRightPanelOpen}
          onToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onDuplicateQuestion={handleDuplicateQuestion}
          onUpdateSection={handleUpdateSection}
        />
      </div>

      {/* 3. Sliding Theme & Brand Kit Studio Drawer */}
      {isThemeDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsThemeDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#070e1e] border-l border-blue-900/60 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-blue-900/60 flex items-center justify-between bg-[#050b18]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBrandKitDrawerOpen(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !isBrandKitDrawerOpen
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theme Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBrandKitDrawerOpen(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isBrandKitDrawerOpen
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Brand Kit
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThemeDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {isBrandKitDrawerOpen ? (
                  <BrandKitEditor
                    brandKit={activeBrandKit}
                    onChangeBrandKit={handleChangeBrandKit}
                  />
                ) : (
                  <ThemeEditor
                    currentTheme={activeTheme}
                    onChangeTheme={handleApplyTheme}
                    onOpenAutoDesign={() => {
                      setIsThemeDrawerOpen(false);
                      setIsAutoDesignOpen(true);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. AI Modals & Tools */}
      <AutoDesignModal
        isOpen={isAutoDesignOpen}
        onClose={() => setIsAutoDesignOpen(false)}
        onApplyTheme={handleApplyTheme}
      />

      {isAIAssistantOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAIAssistantOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#070e1e] border-l border-blue-900/60 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-blue-900/60 flex items-center justify-between bg-[#050b18]">
                <span className="text-sm font-bold text-white">In-Canvas AI Assistant</span>
                <button
                  type="button"
                  onClick={() => setIsAIAssistantOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <InCanvasAIAssistant
                  activeSectionTitle={selectedSection?.title || 'Active Section'}
                  onInsertQuestions={handleInsertAIQuestions}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isPromptBridgeOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPromptBridgeOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-[#070e1e] border-l border-blue-900/60 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-blue-900/60 flex items-center justify-between bg-[#050b18]">
                <span className="text-sm font-bold text-white">AI Prompt Bridge (Level 3)</span>
                <button
                  type="button"
                  onClick={() => setIsPromptBridgeOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <AIPromptBridge
                  metadata={assessment.exam}
                  requirements={assessment.requirements}
                  onOpenJSONImporter={() => {
                    setIsPromptBridgeOpen(false);
                    setIsJSONImportOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <JSONImportModal
        isOpen={isJSONImportOpen}
        onClose={() => setIsJSONImportOpen(false)}
        onImportSections={handleImportSections}
      />

      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        onInsertQuestion={(q) => {
          const targetSecId = selectedSectionId || assessment.sections[0]?.id || 'sec_1';
          updateAssessment((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === targetSecId ? { ...s, questions: [...(s.questions || []), q] } : s
            )
          }));
          setIsQuestionBankOpen(false);
        }}
      />

      {/* 5. Settings, Validation & Preview Modals */}
      <AssessmentSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        assessmentType={assessment.assessmentType}
        metadata={assessment.exam}
        surveySettings={assessment.surveySettings}
        onClose={() => setIsSettingsDrawerOpen(false)}
        onUpdateMetadata={handleChangeMetadata}
        onUpdateSurveySettings={handleUpdateSurveySettings}
      />

      <PublishValidationModal
        isOpen={isPublishModalOpen}
        assessment={assessment}
        onClose={() => setIsPublishModalOpen(false)}
        onSelectQuestion={(qId) => {
          setSelectedQuestionId(qId);
          setIsPublishModalOpen(false);
        }}
        onConfirmPublish={handleConfirmPublish}
        onSaveDraft={() => {
          onSaveAssessment(assessment, false);
          setIsPublishModalOpen(false);
        }}
      />

      <LivePreviewModal
        isOpen={isPreviewModalOpen}
        assessment={assessment}
        theme={activeTheme}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
};
