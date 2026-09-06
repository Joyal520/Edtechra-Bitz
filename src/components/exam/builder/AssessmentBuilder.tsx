// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: MASTER WORKSPACE (PREMIUM LIGHT)
// Light modern digital assessment studio with Exam Outline, Activities,
// Categorized Add Modal, Exam Blueprint, 3 Creation Modes & Student Preview
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CanonicalAssessmentV2,
  CanonicalQuestion,
  ExamMetadata,
  ExamSection,
  ExamActivity,
  ActivityType,
  SupportedQuestionType,
  BrandKitConfig,
  SurveySettings,
  MultipleChoiceQuestion,
  ExamBlueprintConfig
} from '../shared/ExamSchema';
import { THEME_PRESETS } from '../shared/themePresets';
import { getQuestionTypeDefinition } from '../shared/QuestionTypeRegistry';

// Subcomponents
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { RightPropertyPanel } from './RightPropertyPanel';
import { AssessmentCanvas } from './canvas/AssessmentCanvas';
import { LivePreviewModal } from './preview/LivePreviewModal';
import { AddQuestionModal, AddItemType } from './modals/AddQuestionModal';
import { ExamBlueprintModal } from './modals/ExamBlueprintModal';
import { CreationModeModal, CreationMode } from './modals/CreationModeModal';
import { AIAssessmentSuiteModal } from './ai/AIAssessmentSuiteModal';
import { QuestionBankModal } from './question-bank/QuestionBankModal';
import { AssessmentSettingsDrawer } from './settings/AssessmentSettingsDrawer';
import { PublishValidationModal } from './publishing/PublishValidationModal';

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
  // Default Initial Assessment Generator (Light Theme)
  const createDefaultAssessment = (): CanonicalAssessmentV2 => {
    return {
      schemaVersion: '2.0',
      assessmentType: 'exam',
      exam: {
        title: 'Unit Examination',
        subject: 'English Language',
        grade: 'Grade 10',
        examType: 'Unit Test',
        difficulty: 'Medium',
        durationMinutes: 60,
        passPercentage: 50,
        maxAttempts: 1,
        randomizeQuestions: false,
        randomizeOptions: false,
        showMarksImmediately: true,
        showCorrectAnswers: true
      },
      theme: THEME_PRESETS.edtechra_light,
      brandKit: {
        enabled: false,
        watermark: false
      },
      surveySettings: {
        isAnonymous: false,
        collectEmail: true,
        oneResponsePerUser: true,
        thankYouMessage: 'Thank you for submitting your examination!'
      },
      sections: [
        {
          id: 'sec_1',
          title: 'Section A — Grammar & Vocabulary',
          description: 'Answer all questions in this section.',
          questions: [
            {
              id: 'q_init_1',
              type: 'multiple_choice',
              question: 'Which of the following sentences uses the correct form of the present perfect tense?',
              options: [
                { id: 'a', text: 'She has lived in Colombo for five years.' },
                { id: 'b', text: 'She have lived in Colombo for five years.' },
                { id: 'c', text: 'She has living in Colombo for five years.' },
                { id: 'd', text: 'She was lived in Colombo for five years.' }
              ],
              correctAnswer: ['a'],
              difficulty: 'medium',
              marks: 1,
              required: true,
              explanation: 'Third-person singular "She" requires the auxiliary verb "has" followed by the past participle "lived".'
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

  // Selection state (Section, Activity, Question)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    assessment.sections?.[0]?.id || 'sec_1'
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    assessment.sections?.[0]?.questions?.[0]?.id || null
  );
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Sidebar and Modal Visibility States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTargetSectionId, setAddModalTargetSectionId] = useState<string>(
    assessment.sections?.[0]?.id || 'sec_1'
  );
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isCreationModeOpen, setIsCreationModeOpen] = useState(false);
  const [isAISuiteOpen, setIsAISuiteOpen] = useState(false);
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

  // Assessment updater triggering debounced autosave
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

  // Debounced Autosave
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

  // Ensure document uses clean light theme without dark class leakage while in Exam Builder
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    const prevThemeMode = root.getAttribute('data-theme-mode');

    root.classList.remove('dark');
    root.setAttribute('data-theme-mode', 'light');

    return () => {
      if (hadDark) root.classList.add('dark');
      if (prevThemeMode) root.setAttribute('data-theme-mode', prevThemeMode);
    };
  }, []);

  // Active theme and brand kit - guarantee high-contrast light theme
  const activeTheme =
    !assessment.theme || assessment.theme.category === 'dark' || assessment.theme.textColor === '#f8fafc'
      ? THEME_PRESETS.edtechra_light
      : assessment.theme;
  const activeBrandKit: BrandKitConfig = assessment.brandKit || { enabled: false, watermark: false };

  // Currently selected entities
  const selectedSection = assessment.sections.find((s) => s.id === selectedSectionId) || null;
  const selectedActivity = assessment.sections
    .flatMap((s) => s.activities || [])
    .find((a) => a.id === selectedActivityId) || null;

  const selectedQuestion = assessment.sections
    .flatMap((s) => [
      ...(s.questions || []),
      ...(s.activities?.flatMap((a) => a.questions || []) || [])
    ])
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

  // Section Actions
  const handleAddSection = () => {
    const newSecNumber = assessment.sections.length + 1;
    const newSecId = `sec_${Date.now().toString(36)}`;
    const newSection: ExamSection = {
      id: newSecId,
      title: `Section ${String.fromCharCode(64 + newSecNumber)}`,
      description: '',
      questions: [],
      activities: []
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setSelectedSectionId(newSecId);
    setSelectedQuestionId(null);
    setSelectedActivityId(null);
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
      id: `q_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    }));

    const duplicatedSection: ExamSection = {
      ...target,
      id: newSecId,
      title: `${target.title} (Copy)`,
      questions: duplicatedQuestions,
      activities: (target.activities || []).map((a) => ({
        ...a,
        id: `act_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 4)}`,
        questions: (a.questions || []).map((q) => ({
          ...q,
          id: `q_act_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
        }))
      }))
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: [...prev.sections, duplicatedSection]
    }));

    setSelectedSectionId(newSecId);
  };

  // Activity Actions
  const handleAddActivity = (sectionId: string, type: ActivityType) => {
    const actId = `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    let title = 'Reading Activity';
    let defaultPassage = '';
    let defaultAudio = '';
    let defaultImage = '';

    if (type === 'listening_activity') {
      title = 'Listening Activity';
      defaultAudio = 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg';
    } else if (type === 'video_activity') {
      title = 'Video Activity';
    } else if (type === 'reading_activity') {
      title = 'Reading Comprehension';
      defaultPassage = 'Read the passage carefully before answering the questions below.';
    } else if (type === 'picture_description_activity') {
      title = 'Picture Description Activity';
      defaultImage = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80';
    }

    const newActivity: ExamActivity = {
      id: actId,
      activityType: type,
      title,
      passage: defaultPassage || undefined,
      audioUrl: defaultAudio || undefined,
      imageUrl: defaultImage || undefined,
      showTranscriptToStudents: false,
      pictureTaskType: type === 'picture_description_activity' ? 'describe' : undefined,
      rubric:
        type === 'picture_description_activity'
          ? { content: 4, vocabulary: 2, grammar: 2, organization: 2 }
          : undefined,
      questions: []
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, activities: [...(sec.activities || []), newActivity] }
          : sec
      )
    }));

    setSelectedSectionId(sectionId);
    setSelectedActivityId(actId);
    setSelectedQuestionId(null);
  };

  const handleUpdateActivity = (sectionId: string, updated: ExamActivity) => {
    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              activities: (sec.activities || []).map((a) => (a.id === updated.id ? updated : a))
            }
          : sec
      )
    }));
  };

  const handleDeleteActivity = (sectionId: string, activityId: string) => {
    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              activities: (sec.activities || []).filter((a) => a.id !== activityId)
            }
          : sec
      )
    }));
    if (selectedActivityId === activityId) {
      setSelectedActivityId(null);
    }
  };

  const handleDuplicateActivity = (sectionId: string, activityId: string) => {
    const sec = assessment.sections.find((s) => s.id === sectionId);
    const act = sec?.activities?.find((a) => a.id === activityId);
    if (!act) return;

    const newActId = `act_dup_${Date.now().toString(36)}`;
    const duplicated: ExamActivity = {
      ...act,
      id: newActId,
      title: `${act.title} (Copy)`,
      questions: (act.questions || []).map((q) => ({
        ...q,
        id: `q_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
      }))
    };

    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, activities: [...(s.activities || []), duplicated] }
          : s
      )
    }));
    setSelectedActivityId(newActId);
  };

  const handleAddQuestionToActivity = (
    sectionId: string,
    activityId: string,
    type: SupportedQuestionType = 'multiple_choice'
  ) => {
    const def = getQuestionTypeDefinition(type);
    const newId = `q_act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    const newQ: CanonicalQuestion = {
      id: newId,
      type,
      question: `Comprehension Question on Activity`,
      options: [
        { id: 'a', text: 'First option' },
        { id: 'b', text: 'Second option' },
        { id: 'c', text: 'Third option' },
        { id: 'd', text: 'Fourth option' }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: def.defaultMarks || 1,
      required: true
    } as any;

    updateAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              activities: (sec.activities || []).map((act) =>
                act.id === activityId
                  ? { ...act, questions: [...(act.questions || []), newQ] }
                  : act
              )
            }
          : sec
      )
    }));

    setSelectedSectionId(sectionId);
    setSelectedActivityId(activityId);
    setSelectedQuestionId(newId);
  };

  // Standalone Question Actions
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
    setSelectedActivityId(null);
  };

  const handleUpdateQuestion = (updated: CanonicalQuestion) => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => {
        // Direct section questions
        const questions = (sec.questions || []).map((q) => (q.id === updated.id ? updated : q));

        // Questions nested inside activities
        const activities = (sec.activities || []).map((act) => ({
          ...act,
          questions: (act.questions || []).map((q) => (q.id === updated.id ? updated : q))
        }));

        return { ...sec, questions, activities };
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    updateAssessment((prev) => {
      const updatedSections = prev.sections.map((sec) => ({
        ...sec,
        questions: (sec.questions || []).filter((q) => q.id !== questionId),
        activities: (sec.activities || []).map((act) => ({
          ...act,
          questions: (act.questions || []).filter((q) => q.id !== questionId)
        }))
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

  // Add Question / Activity Modal Trigger
  const handleOpenAddModal = (sectionId: string) => {
    setAddModalTargetSectionId(sectionId);
    setIsAddModalOpen(true);
  };

  const handleSelectAddItem = (item: AddItemType) => {
    if (item.kind === 'activity') {
      handleAddActivity(addModalTargetSectionId, item.type);
    } else {
      handleAddQuestion(addModalTargetSectionId, undefined, item.type);
    }
  };

  // Blueprint Generator
  const handleGenerateFromBlueprint = (blueprint: ExamBlueprintConfig) => {
    const timestamp = Date.now().toString(36).slice(-4);
    const newSections: ExamSection[] = [];

    // 1. Objective Grammar & Vocabulary Section
    const sec1Questions: CanonicalQuestion[] = [];
    let qCount = 1;

    for (let i = 0; i < (blueprint.questionDistribution.multipleChoice || 0); i++) {
      sec1Questions.push({
        id: `q_bp_${timestamp}_${qCount}`,
        type: 'multiple_choice',
        question: `Based on ${blueprint.topic}, which of the following is correct?`,
        options: [
          { id: 'a', text: 'Accurately reflects the standard grammatical rule' },
          { id: 'b', text: 'Common learner distractor with incorrect syntax' },
          { id: 'c', text: 'Partially correct statement' },
          { id: 'd', text: 'Unrelated distractor option' }
        ],
        correctAnswer: ['a'],
        difficulty: blueprint.difficulty.toLowerCase() as any,
        marks: 1,
        required: true,
        explanation: 'Option A matches standard syllabus principles.'
      } as any);
      qCount++;
    }

    for (let i = 0; i < (blueprint.questionDistribution.trueFalse || 0); i++) {
      sec1Questions.push({
        id: `q_bp_${timestamp}_${qCount}`,
        type: 'true_false',
        question: `The main principle regarding ${blueprint.topic} applies universally across formal and informal registers.`,
        correctAnswer: i % 2 === 0,
        difficulty: blueprint.difficulty.toLowerCase() as any,
        marks: 1,
        required: true,
        explanation: 'Verified through curriculum guidelines.'
      } as any);
      qCount++;
    }

    for (let i = 0; i < (blueprint.questionDistribution.fillInBlank || 0); i++) {
      sec1Questions.push({
        id: `q_bp_${timestamp}_${qCount}`,
        type: 'fill_in_blank',
        question: `Fill in the blank with the appropriate term: "In formal composition, the _____ of ideas must remain coherent."`,
        acceptedAnswers: ['flow', 'progression', 'sequence'],
        difficulty: blueprint.difficulty.toLowerCase() as any,
        marks: 1,
        required: true,
        explanation: 'Accepts contextually appropriate synonyms.'
      } as any);
      qCount++;
    }

    newSections.push({
      id: `sec_bp_1`,
      title: 'Section A — Grammar & Concepts',
      description: `Objective questions assessing ${blueprint.topic}.`,
      questions: sec1Questions
    });

    // 2. Reading Comprehension Activity if requested
    if ((blueprint.questionDistribution.reading || 0) > 0) {
      newSections.push({
        id: `sec_bp_2`,
        title: 'Section B — Reading Comprehension',
        description: 'Read the text and answer the questions that follow.',
        questions: [],
        activities: [
          {
            id: `act_bp_reading_${timestamp}`,
            activityType: 'reading_activity',
            title: `Reading Passage: ${blueprint.topic}`,
            passage: `Educational research indicates that systematic practice in ${blueprint.topic} leads to substantial improvements in communication and analytical capability. Effective language acquisition occurs when students encounter vocabulary in varied authentic contexts. Furthermore, engaging with multifaceted prompts allows learners to develop critical thinking, self-correction, and higher-order cognitive agility.`,
            questions: [
              {
                id: `q_bp_read_${timestamp}_1`,
                type: 'multiple_choice',
                question: 'What is the primary factor leading to improved communication according to the passage?',
                options: [
                  { id: 'a', text: `Systematic practice in ${blueprint.topic}` },
                  { id: 'b', text: 'Passive reading without review' },
                  { id: 'c', text: 'Rote memorization exclusively' },
                  { id: 'd', text: 'Infrequent vocabulary exposure' }
                ],
                correctAnswer: ['a'],
                difficulty: 'medium',
                marks: 2,
                required: true,
                explanation: 'Directly stated in paragraph 1.'
              },
              {
                id: `q_bp_read_${timestamp}_2`,
                type: 'short_answer',
                question: 'Mention two benefits of engaging with multifaceted prompts described in the text.',
                difficulty: 'medium',
                marks: 2,
                required: true,
                explanation: 'Critical thinking, self-correction, and higher-order agility.'
              }
            ]
          }
        ]
      });
    }

    // 3. Listening Activity if requested
    if ((blueprint.questionDistribution.listening || 0) > 0) {
      newSections.push({
        id: `sec_bp_3`,
        title: 'Section C — Listening Activity',
        description: 'Listen to the audio track and answer the comprehension questions.',
        questions: [],
        activities: [
          {
            id: `act_bp_listen_${timestamp}`,
            activityType: 'listening_activity',
            title: `Audio Presentation: ${blueprint.topic}`,
            audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
            transcript: `Good afternoon students. Today we examine the core pillars of ${blueprint.topic}. In our first review, notice how sentence structures vary between narrative and expository styles. Always pay close attention to transitional signals and key adjectives.`,
            showTranscriptToStudents: false,
            questions: [
              {
                id: `q_bp_listen_${timestamp}_1`,
                type: 'multiple_choice',
                question: 'What two styles of sentence structures are highlighted by the speaker?',
                options: [
                  { id: 'a', text: 'Narrative and expository styles' },
                  { id: 'b', text: 'Poetic and dramatic styles' },
                  { id: 'c', text: 'Archaic and dialectal styles' },
                  { id: 'd', text: 'Informal and slang styles' }
                ],
                correctAnswer: ['a'],
                difficulty: 'easy',
                marks: 2,
                required: true,
                explanation: 'The speaker explicitly specifies narrative and expository styles.'
              }
            ]
          }
        ]
      });
    }

    // 4. Writing & Open Response
    if ((blueprint.questionDistribution.writing || 0) > 0) {
      newSections.push({
        id: `sec_bp_4`,
        title: 'Section D — Written Composition',
        description: 'Extended writing task testing vocabulary, grammar, and organization.',
        questions: [
          {
            id: `q_bp_write_${timestamp}`,
            type: 'paragraph',
            question: `Write a well-structured essay discussing: "${blueprint.topic}". Provide specific reasons, real-world examples, and a clear conclusion (approx. 150 words).`,
            difficulty: 'hard',
            marks: 10,
            required: true,
            explanation: 'Graded according to standard content, grammar, vocabulary, and cohesion criteria.'
          }
        ]
      });
    }

    const generatedExam: CanonicalAssessmentV2 = {
      ...assessment,
      exam: {
        ...assessment.exam,
        title: `${blueprint.topic} — ${blueprint.examType}`,
        subject: blueprint.subject,
        grade: blueprint.grade,
        topic: blueprint.topic,
        examType: blueprint.examType,
        difficulty: blueprint.difficulty,
        totalMarks: blueprint.totalMarks,
        durationMinutes: blueprint.durationMinutes,
        passPercentage: blueprint.passPercentage
      },
      sections: newSections
    };

    updateAssessment(() => generatedExam);
    setSelectedSectionId(newSections[0]?.id || 'sec_bp_1');
    setSelectedQuestionId(null);
    setSelectedActivityId(null);
  };

  // O/L Style Exam Template Loader
  const handleLoadOLPracticeTemplate = () => {
    const olAssessment: CanonicalAssessmentV2 = {
      schemaVersion: '2.0',
      assessmentType: 'exam',
      exam: {
        title: 'G.C.E. O/L Practice Examination — English Language',
        subject: 'English Language',
        grade: 'Grade 11 (O/L)',
        examType: 'O/L Practice',
        difficulty: 'Medium',
        description: 'Comprehensive Sri Lankan O/L style practice examination covering Vocabulary, Grammar, Reading Comprehension, Picture Description, Guided Writing & Listening.',
        instructions: 'Answer all questions on this question paper. Pay attention to handwriting, grammar, and punctuation.',
        durationMinutes: 90,
        passPercentage: 50,
        maxAttempts: 1,
        showMarksImmediately: true,
        showCorrectAnswers: true
      },
      theme: THEME_PRESETS.edtechra_light,
      sections: [
        {
          id: 'sec_ol_1',
          title: 'Section A — Grammar & Vocabulary',
          description: 'Fill in the blanks and choose the most appropriate words.',
          questions: [
            {
              id: 'q_ol_1',
              type: 'multiple_choice',
              question: 'Fill in the blank: "The students were looking forward _____ the annual English Day exhibition."',
              options: [
                { id: 'a', text: 'to' },
                { id: 'b', text: 'for' },
                { id: 'c', text: 'at' },
                { id: 'd', text: 'with' }
              ],
              correctAnswer: ['a'],
              difficulty: 'easy',
              marks: 1,
              required: true,
              explanation: '"Look forward to" is a standard phrasal verb requiring the preposition "to".'
            },
            {
              id: 'q_ol_2',
              type: 'fill_in_blank',
              question: 'Complete the sentence with the correct past tense: "By the time the bell rang, the teacher _____ (already / arrive) in the classroom."',
              acceptedAnswers: ['had already arrived'],
              difficulty: 'medium',
              marks: 1,
              required: true,
              explanation: 'Past perfect tense "had already arrived" is required.'
            },
            {
              id: 'q_ol_3',
              type: 'multiple_choice',
              question: 'Select the synonym for "PRESERVE":',
              options: [
                { id: 'a', text: 'Protect and maintain' },
                { id: 'b', text: 'Consume rapidly' },
                { id: 'c', text: 'Damage intentionally' },
                { id: 'd', text: 'Discard' }
              ],
              correctAnswer: ['a'],
              difficulty: 'easy',
              marks: 1,
              required: true,
              explanation: 'Preserve means to protect and keep in original condition.'
            }
          ]
        },
        {
          id: 'sec_ol_2',
          title: 'Section B — Reading Comprehension',
          description: 'Read the passage below and answer the questions.',
          questions: [],
          activities: [
            {
              id: 'act_ol_reading',
              activityType: 'reading_activity',
              title: 'Mangrove Ecosystems of Sri Lanka',
              passage: 'Mangroves are unique coastal wetlands found in the tropical lagoons and estuaries of Sri Lanka, notably in Negombo, Puttalam, and Batticaloa. These dense salt-tolerant forests provide a critical breeding sanctuary for fish, crabs, and migratory birds. Furthermore, their intricate root systems act as natural buffers against severe coastal erosion, storm surges, and tsunamis. In recent decades, conservation programs led by schools and community groups have helped restore degraded mangrove habitats across the island.',
              questions: [
                {
                  id: 'q_ol_read_1',
                  type: 'multiple_choice',
                  question: 'Where are mangrove wetlands primarily situated in Sri Lanka according to the text?',
                  options: [
                    { id: 'a', text: 'Tropical lagoons and estuaries such as Negombo and Puttalam' },
                    { id: 'b', text: 'Central highland tea plantations' },
                    { id: 'c', text: 'Arid scrubland sanctuaries' },
                    { id: 'd', text: 'High-altitude mountain summits' }
                  ],
                  correctAnswer: ['a'],
                  difficulty: 'easy',
                  marks: 2,
                  required: true,
                  explanation: 'Passage explicitly states: "tropical lagoons and estuaries of Sri Lanka, notably in Negombo, Puttalam, and Batticaloa".'
                },
                {
                  id: 'q_ol_read_2',
                  type: 'true_false',
                  question: 'Mangrove root systems serve as natural shoreline buffers against storm surges and coastal erosion.',
                  correctAnswer: true,
                  difficulty: 'easy',
                  marks: 2,
                  required: true,
                  explanation: 'Directly verified from the passage.'
                }
              ]
            }
          ]
        },
        {
          id: 'sec_ol_3',
          title: 'Section C — Picture Description Activity',
          description: 'Study the picture and write complete sentences.',
          questions: [],
          activities: [
            {
              id: 'act_ol_picture',
              activityType: 'picture_description_activity',
              title: 'A Busy Village Fair (Pola)',
              imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
              pictureTaskType: 'describe',
              instructions: 'Look at the picture of the village marketplace. Write 5 complete and meaningful sentences describing what is happening. Include details about people, activities, goods being sold, and the environment.',
              marks: 10,
              rubric: {
                content: 4,
                vocabulary: 2,
                grammar: 2,
                organization: 2
              },
              questions: []
            }
          ]
        },
        {
          id: 'sec_ol_4',
          title: 'Section D — Guided Writing',
          description: 'Functional writing task.',
          questions: [
            {
              id: 'q_ol_write_1',
              type: 'paragraph',
              question: 'Write a notice on behalf of the English Literary Association inviting students of Grades 10 and 11 to participate in the Annual Debating Championship. Mention the date, time, venue, eligibility, and the registration deadline (approx. 50 words).',
              difficulty: 'medium',
              marks: 10,
              required: true,
              explanation: 'Evaluate based on format of a notice, clear details (date, time, venue), register, and grammar.'
            }
          ]
        },
        {
          id: 'sec_ol_5',
          title: 'Section E — Listening Activity',
          description: 'Listen to the audio and answer the questions.',
          questions: [],
          activities: [
            {
              id: 'act_ol_listening',
              activityType: 'listening_activity',
              title: 'School Sports Meet Announcement',
              audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
              transcript: 'Good morning students and teachers. This is an announcement regarding the Inter-House Sports Meet. Due to unexpected weather forecasts, the track heats originally scheduled for Thursday afternoon will now take place on Friday morning starting at 8:30 AM at the municipal grounds.',
              showTranscriptToStudents: false,
              questions: [
                {
                  id: 'q_ol_listen_1',
                  type: 'multiple_choice',
                  question: 'Why were the track heats postponed?',
                  options: [
                    { id: 'a', text: 'Due to unexpected weather forecasts' },
                    { id: 'b', text: 'The municipal grounds were unavailable' },
                    { id: 'c', text: 'Equipment was missing' },
                    { id: 'd', text: 'School bus schedule changes' }
                  ],
                  correctAnswer: ['a'],
                  difficulty: 'easy',
                  marks: 2,
                  required: true,
                  explanation: 'Speaker explicitly notes unexpected weather forecasts.'
                }
              ]
            }
          ]
        }
      ]
    };

    updateAssessment(() => olAssessment);
    setSelectedSectionId('sec_ol_1');
    setSelectedQuestionId(null);
    setSelectedActivityId(null);
    setIsCreationModeOpen(false);
  };

  // Creation Mode Selector Handler
  const handleSelectCreationMode = (mode: CreationMode) => {
    setIsCreationModeOpen(false);
    if (mode === 'manual') {
      // Keep blank draft
    } else if (mode === 'ai_blueprint') {
      setIsBlueprintOpen(true);
    } else if (mode === 'ol_style') {
      handleLoadOLPracticeTemplate();
    }
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
    <div
      data-exam-builder="true"
      data-theme-mode="light"
      className="edtechra-exam-builder h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans [color-scheme:light]"
      style={{ colorScheme: 'light' }}
    >
      {/* 1. TopBar Control Center (Light Theme) */}
      <TopBar
        title={assessment.exam.title}
        subject={assessment.exam.subject}
        grade={assessment.exam.grade}
        assessmentType={assessment.assessmentType}
        sections={assessment.sections}
        activeSectionId={selectedSectionId}
        onSelectSection={(secId) => {
          setSelectedSectionId(secId);
          setSelectedQuestionId(null);
          setSelectedActivityId(null);
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onChangeTitle={(title) => handleChangeMetadata({ title })}
        onBack={onBack}
        onOpenBlueprint={() => setIsBlueprintOpen(true)}
        onOpenAISuite={() => setIsAISuiteOpen(true)}
        onOpenSettings={() => setIsSettingsDrawerOpen(true)}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onPublish={() => setIsPublishModalOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Exam Outline) */}
        <LeftSidebar
          assessment={assessment}
          activeSectionId={selectedSectionId}
          selectedQuestionId={selectedQuestionId}
          selectedSectionId={selectedSectionId}
          selectedActivityId={selectedActivityId}
          onSelectQuestion={(qId) => {
            setSelectedQuestionId(qId);
            setSelectedActivityId(null);
          }}
          onSelectSection={(secId) => {
            setSelectedSectionId(secId);
            setSelectedQuestionId(null);
            setSelectedActivityId(null);
          }}
          onSelectActivity={(actId) => {
            setSelectedActivityId(actId);
            setSelectedQuestionId(null);
          }}
          onAddQuestion={handleAddQuestion}
          onAddSection={handleAddSection}
          onOpenAddModal={handleOpenAddModal}
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
            selectedActivityId={selectedActivityId}
            onSelectQuestion={(qId) => {
              setSelectedQuestionId(qId);
              setSelectedActivityId(null);
            }}
            onSelectSection={(secId) => {
              setSelectedSectionId(secId);
              setSelectedQuestionId(null);
              setSelectedActivityId(null);
            }}
            onSelectActivity={(actId) => {
              setSelectedActivityId(actId);
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
            onOpenAddModal={handleOpenAddModal}
            onUpdateActivity={handleUpdateActivity}
            onDeleteActivity={handleDeleteActivity}
            onDuplicateActivity={handleDuplicateActivity}
            onAddQuestionToActivity={handleAddQuestionToActivity}
            onSaveToQuestionBank={() => setIsQuestionBankOpen(true)}
          />
        </main>

        {/* Right Property Panel (Context-Sensitive Inspector) */}
        <RightPropertyPanel
          assessmentType={assessment.assessmentType}
          selectedQuestion={selectedQuestion}
          selectedSection={selectedSection}
          selectedActivity={selectedActivity}
          allSections={assessment.sections}
          isOpen={isRightPanelOpen}
          onToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onDuplicateQuestion={handleDuplicateQuestion}
          onUpdateSection={handleUpdateSection}
          onUpdateActivity={selectedActivityId ? (upd) => handleUpdateActivity(selectedSectionId, upd) : undefined}
          onDeleteActivity={selectedActivityId ? (actId) => handleDeleteActivity(selectedSectionId, actId) : undefined}
        />
      </div>

      {/* 3. Categorized Add Question & Activity Modal */}
      <AddQuestionModal
        isOpen={isAddModalOpen}
        targetSectionTitle={selectedSection?.title || 'Current Section'}
        onClose={() => setIsAddModalOpen(false)}
        onSelectType={handleSelectAddItem}
      />

      {/* 4. Exam Blueprint Modal */}
      <ExamBlueprintModal
        isOpen={isBlueprintOpen}
        initialBlueprint={{
          subject: assessment.exam.subject,
          grade: assessment.exam.grade,
          topic: assessment.exam.topic || assessment.exam.title,
          examType: assessment.exam.examType,
          difficulty: assessment.exam.difficulty,
          durationMinutes: assessment.exam.durationMinutes,
          passPercentage: assessment.exam.passPercentage
        }}
        onClose={() => setIsBlueprintOpen(false)}
        onGenerateExam={handleGenerateFromBlueprint}
      />

      {/* 5. 3 Creation Modes Entry Modal */}
      <CreationModeModal
        isOpen={isCreationModeOpen}
        onClose={() => setIsCreationModeOpen(false)}
        onSelectMode={handleSelectCreationMode}
      />

      {/* 6. AI Assessment Suite Modal */}
      <AIAssessmentSuiteModal
        isOpen={isAISuiteOpen}
        assessment={assessment}
        onClose={() => setIsAISuiteOpen(false)}
        onOpenBlueprint={() => {
          setIsAISuiteOpen(false);
          setIsBlueprintOpen(true);
        }}
      />

      {/* 7. Live Student Digital Examination Preview Modal */}
      <LivePreviewModal
        isOpen={isPreviewModalOpen}
        assessment={assessment}
        theme={activeTheme}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      {/* 8. Question Bank Modal */}
      {isQuestionBankOpen && (
        <QuestionBankModal
          isOpen={isQuestionBankOpen}
          onClose={() => setIsQuestionBankOpen(false)}
          onInsertQuestion={(q) => {
            handleAddQuestion(selectedSectionId, undefined, q.type);
            setIsQuestionBankOpen(false);
          }}
        />
      )}

      {/* 9. Assessment Settings Drawer */}
      <AssessmentSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        assessmentType={assessment.assessmentType}
        metadata={assessment.exam}
        surveySettings={assessment.surveySettings}
        onClose={() => setIsSettingsDrawerOpen(false)}
        onUpdateMetadata={handleChangeMetadata}
        onUpdateSurveySettings={(settings) =>
          updateAssessment((prev) => ({
            ...prev,
            surveySettings: { ...(prev.surveySettings || {}), ...settings } as SurveySettings
          }))
        }
      />

      {/* 10. Publish Validation Modal */}
      <PublishValidationModal
        isOpen={isPublishModalOpen}
        assessment={assessment}
        onClose={() => setIsPublishModalOpen(false)}
        onSelectQuestion={(qId) => {
          setSelectedQuestionId(qId);
          setIsPublishModalOpen(false);
        }}
        onConfirmPublish={handleConfirmPublish}
        onSaveDraft={async () => {
          await onSaveAssessment(assessment, false);
          setIsPublishModalOpen(false);
        }}
      />
    </div>
  );
};
