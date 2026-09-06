// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: TEACHER EXAM CREATION STUDIO
// Seamless multi-step wizard replacing legacy monolithic modal
// ============================================================================

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { CanonicalExamV1, ExamMetadata, PedagogicalRequirements } from '../shared/ExamSchema';
import { QuestionTypeConfigItem } from './promptBuilder';
import { ExamDetails } from './ExamDetails';
import { QuestionConfiguration } from './QuestionConfiguration';
import { ExamRequirements } from './ExamRequirements';
import { ExamSettings } from './ExamSettings';
import { AIPromptGenerator } from './AIPromptGenerator';
import { JSONImporter } from './JSONImporter';
import { ExamPreview } from './ExamPreview';
import { ExamPublishing } from './ExamPublishing';

export type StudioStep =
  | 'details'
  | 'questions'
  | 'requirements'
  | 'settings'
  | 'prompt'
  | 'import'
  | 'preview'
  | 'publish';

interface ExamStudioProps {
  classroomId: string;
  initialExam?: CanonicalExamV1 | null;
  onClose: () => void;
  onPublishExam: (exam: CanonicalExamV1, schedule?: { startsAt?: string; endsAt?: string }) => Promise<void>;
  onPreviewAsStudent: (exam: CanonicalExamV1) => void;
}

const STEPS_NAV: { step: StudioStep; label: string; number: number }[] = [
  { step: 'details', label: 'Details', number: 1 },
  { step: 'questions', label: 'Questions', number: 2 },
  { step: 'requirements', label: 'Objectives', number: 3 },
  { step: 'settings', label: 'Delivery', number: 4 },
  { step: 'prompt', label: 'AI Prompt', number: 5 },
  { step: 'import', label: 'Import JSON', number: 6 },
  { step: 'preview', label: 'Review', number: 7 },
  { step: 'publish', label: 'Publish', number: 8 }
];

export const ExamStudio: React.FC<ExamStudioProps> = ({
  classroomId,
  initialExam,
  onClose,
  onPublishExam,
  onPreviewAsStudent
}) => {
  const [currentStep, setCurrentStep] = useState<StudioStep>(initialExam ? 'preview' : 'details');
  const [isPublishing, setIsPublishing] = useState(false);

  // Metadata State
  const [metadata, setMetadata] = useState<ExamMetadata>(
    initialExam?.exam || {
      title: '',
      subject: '',
      grade: '',
      examType: 'Unit Test',
      difficulty: 'Mixed',
      topic: '',
      description: '',
      durationMinutes: 45,
      passPercentage: 40,
      maxAttempts: 1,
      scorePolicy: 'highest',
      randomizeQuestions: false,
      randomizeOptions: false,
      showMarksImmediately: true,
      showCorrectAnswers: true
    }
  );

  // Question Config State
  const [questionConfigs, setQuestionConfigs] = useState<QuestionTypeConfigItem[]>([
    { id: 'c1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
    { id: 'c2', type: 'true_false', count: 3, difficulty: 'easy' },
    { id: 'c3', type: 'fill_in_blank', count: 2, difficulty: 'medium' }
  ]);

  // Requirements State
  const [requirements, setRequirements] = useState<PedagogicalRequirements>(
    initialExam?.requirements || {
      learningObjectives: [],
      topicsToInclude: [],
      topicsToAvoid: [],
      cefrLevel: 'General'
    }
  );

  // Source Material
  const [sourceMaterial, setSourceMaterial] = useState('');

  // Imported or Generated Canonical Exam State
  const [importedExam, setImportedExam] = useState<CanonicalExamV1 | null>(initialExam || null);

  const handleMetadataChange = (updates: Partial<ExamMetadata>) => {
    setMetadata(prev => ({ ...prev, ...updates }));
    if (importedExam) {
      setImportedExam(prev => (prev ? { ...prev, exam: { ...prev.exam, ...updates } } : null));
    }
  };

  const handleRequirementsChange = (updates: Partial<PedagogicalRequirements>) => {
    setRequirements(prev => ({ ...prev, ...updates }));
    if (importedExam) {
      setImportedExam(prev => (prev ? { ...prev, requirements: { ...prev.requirements, ...updates } } : null));
    }
  };

  const handleExamImported = (parsed: CanonicalExamV1) => {
    setImportedExam(parsed);
    setMetadata(parsed.exam);
    if (parsed.requirements) setRequirements(parsed.requirements);
    setCurrentStep('preview');
  };

  const handlePublish = async (schedule?: { startsAt?: string; endsAt?: string }) => {
    if (!importedExam) return;
    setIsPublishing(true);
    try {
      await onPublishExam(importedExam, schedule);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentStepNumber = STEPS_NAV.find(s => s.step === currentStep)?.number || 1;

  return (
    <div className="bg-[#070e1f] text-slate-100 min-h-screen flex flex-col font-sans">
      {/* Studio Header Bar */}
      <header className="sticky top-0 z-40 bg-[#091124]/90 backdrop-blur-md border-b border-blue-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-indigo-400">EdTechra</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/50 text-indigo-200">
                Studio
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-white truncate max-w-[200px] sm:max-w-md">
              {metadata.title || 'New Assessment'}
            </h1>
          </div>
        </div>

        {/* Step Navigation Dots on Desktop */}
        <div className="hidden lg:flex items-center gap-1.5">
          {STEPS_NAV.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = s.number < currentStepNumber;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.number <= currentStepNumber || importedExam) {
                    setCurrentStep(s.step);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isCompleted
                    ? 'bg-blue-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-blue-900/60'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>{s.number}.</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-blue-900/40 rounded-xl transition-all cursor-pointer"
          title="Exit Studio"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Studio Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {currentStep === 'details' && (
          <ExamDetails
            metadata={metadata}
            sourceMaterial={sourceMaterial}
            onChangeMetadata={handleMetadataChange}
            onChangeSourceMaterial={setSourceMaterial}
          />
        )}

        {currentStep === 'questions' && (
          <QuestionConfiguration
            configs={questionConfigs}
            onChangeConfigs={setQuestionConfigs}
          />
        )}

        {currentStep === 'requirements' && (
          <ExamRequirements
            requirements={requirements}
            onChangeRequirements={handleRequirementsChange}
          />
        )}

        {currentStep === 'settings' && (
          <ExamSettings
            metadata={metadata}
            onChangeMetadata={handleMetadataChange}
          />
        )}

        {currentStep === 'prompt' && (
          <AIPromptGenerator
            metadata={metadata}
            questionConfigs={questionConfigs}
            requirements={requirements}
            sourceMaterial={sourceMaterial}
            onProceedToImport={() => setCurrentStep('import')}
          />
        )}

        {currentStep === 'import' && (
          <JSONImporter
            onExamImported={handleExamImported}
            onBackToPrompt={() => setCurrentStep('prompt')}
          />
        )}

        {currentStep === 'preview' && importedExam && (
          <ExamPreview
            exam={importedExam}
            onUpdateExam={setImportedExam}
            onPreviewAsStudent={() => onPreviewAsStudent(importedExam)}
            onProceedToPublish={() => setCurrentStep('publish')}
          />
        )}

        {currentStep === 'publish' && importedExam && (
          <ExamPublishing
            exam={importedExam}
            classroomId={classroomId}
            isPublishing={isPublishing}
            onPublish={handlePublish}
            onPreviewAsStudent={() => onPreviewAsStudent(importedExam)}
            onBackToPreview={() => setCurrentStep('preview')}
          />
        )}
      </main>

      {/* Persistent Bottom Stepper Bar (For Steps 1-4) */}
      {(currentStep === 'details' ||
        currentStep === 'questions' ||
        currentStep === 'requirements' ||
        currentStep === 'settings') && (
        <footer className="sticky bottom-0 z-30 bg-[#091124]/95 backdrop-blur-md border-t border-blue-800/80 px-4 sm:px-8 py-3.5 shadow-2xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 'details'}
              onClick={() => {
                if (currentStep === 'questions') setCurrentStep('details');
                if (currentStep === 'requirements') setCurrentStep('questions');
                if (currentStep === 'settings') setCurrentStep('requirements');
              }}
              className="px-5 py-2.5 rounded-2xl border border-blue-800/70 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-xs font-bold text-slate-400">
              Step {currentStepNumber} of 8
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentStep === 'details') {
                  if (!metadata.title.trim() || !metadata.subject.trim()) {
                    alert('Please enter an exam title and subject.');
                    return;
                  }
                  setCurrentStep('questions');
                } else if (currentStep === 'questions') {
                  if (questionConfigs.length === 0) {
                    alert('Please configure at least one question type.');
                    return;
                  }
                  setCurrentStep('requirements');
                } else if (currentStep === 'requirements') {
                  setCurrentStep('settings');
                } else if (currentStep === 'settings') {
                  setCurrentStep('prompt');
                }
              }}
              className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <span>{currentStep === 'settings' ? 'Generate AI Prompt' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
