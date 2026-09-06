// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: SETTINGS DRAWER
// Comprehensive configuration for Exam (proctoring, duration, passing) & Survey (anonymity, emails)
// ============================================================================

import React from 'react';
import {
  X,
  Settings,
  Clock,
  Award,
  Key,
  MessageSquare,
  FileQuestion
} from 'lucide-react';
import {
  AssessmentType,
  ExamMetadata,
  SurveySettings
} from '../../shared/ExamSchema';

interface AssessmentSettingsDrawerProps {
  isOpen: boolean;
  assessmentType: AssessmentType;
  metadata: ExamMetadata;
  surveySettings?: SurveySettings;
  onClose: () => void;
  onUpdateMetadata: (updates: Partial<ExamMetadata>) => void;
  onUpdateSurveySettings: (updates: Partial<SurveySettings>) => void;
}

export const AssessmentSettingsDrawer: React.FC<AssessmentSettingsDrawerProps> = ({
  isOpen,
  assessmentType,
  metadata,
  surveySettings,
  onClose,
  onUpdateMetadata,
  onUpdateSurveySettings
}) => {
  if (!isOpen) return null;

  const isSurvey = assessmentType === 'survey';

  const defaultSurveySettings: SurveySettings = {
    isAnonymous: false,
    collectEmail: true,
    oneResponsePerUser: true,
    thankYouMessage: 'Thank you for your valuable feedback!',
    ...surveySettings
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-2xs">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {isSurvey ? 'Survey Settings' : 'Exam Settings'}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Configure execution policies and behavior
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-white">
            {/* Mode-Specific Settings */}
            {isSurvey ? (
              /* SURVEY MODE SETTINGS */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                  <FileQuestion className="w-4 h-4 text-amber-600" />
                  <span>Survey Response Collection</span>
                </div>

                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-300 shadow-2xs">
                  {/* Anonymous Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Anonymous Responses
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Do not record student names with submissions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSurveySettings({
                          ...defaultSurveySettings,
                          isAnonymous: !defaultSurveySettings.isAnonymous
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        defaultSurveySettings.isAnonymous ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          defaultSurveySettings.isAnonymous ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Collect Email Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Collect Email Addresses
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Require students to provide or verify email
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSurveySettings({
                          ...defaultSurveySettings,
                          collectEmail: !defaultSurveySettings.collectEmail
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        defaultSurveySettings.collectEmail ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          defaultSurveySettings.collectEmail ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Limit to 1 response */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Limit to 1 Response per Student
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Prevent duplicate survey entries
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSurveySettings({
                          ...defaultSurveySettings,
                          oneResponsePerUser: !defaultSurveySettings.oneResponsePerUser
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        defaultSurveySettings.oneResponsePerUser ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          defaultSurveySettings.oneResponsePerUser ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Thank You Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    <span>Completion Confirmation Message</span>
                  </label>
                  <textarea
                    rows={3}
                    value={defaultSurveySettings.thankYouMessage || ''}
                    onChange={(e) =>
                      onUpdateSurveySettings({
                        ...defaultSurveySettings,
                        thankYouMessage: e.target.value
                      })
                    }
                    placeholder="Message displayed after student submits..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              /* EXAM MODE SETTINGS */
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-indigo-950 text-xs font-black uppercase tracking-wider">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Exam Execution & Grading</span>
                </div>

                {/* Duration & Passing Score */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-2xl border border-slate-300 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Duration</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="360"
                        value={metadata.durationMinutes || 60}
                        onChange={(e) =>
                          onUpdateMetadata({
                            durationMinutes: Math.max(1, parseInt(e.target.value, 10) || 1)
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 font-bold">mins</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-300 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pass Mark</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={metadata.passPercentage || 60}
                        onChange={(e) =>
                          onUpdateMetadata({
                            passPercentage: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Attempts Allowed */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Max Attempts Allowed
                  </label>
                  <select
                    value={metadata.maxAttempts || 1}
                    onChange={(e) =>
                      onUpdateMetadata({
                        maxAttempts: parseInt(e.target.value, 10) || 1
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Attempt (Strict)</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={999}>Unlimited Attempts (Practice Mode)</option>
                  </select>
                </div>

                {/* Shuffling & Feedback Toggles */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-300 shadow-2xs">
                  {/* Shuffle Questions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Shuffle Questions
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Randomize order of questions per student
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMetadata({
                          randomizeQuestions: !metadata.randomizeQuestions
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        metadata.randomizeQuestions ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          metadata.randomizeQuestions ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Shuffle Options */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Shuffle Choices
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Randomize options inside multiple choice questions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMetadata({
                          randomizeOptions: !metadata.randomizeOptions
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        metadata.randomizeOptions ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          metadata.randomizeOptions ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Immediate Marks Display */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Show Score Immediately
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Display total points as soon as student submits
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMetadata({
                          showMarksImmediately: !metadata.showMarksImmediately
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        metadata.showMarksImmediately ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          metadata.showMarksImmediately ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Correct Answers */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Reveal Answer Keys
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Show correct answers and explanations after submission
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMetadata({
                          showCorrectAnswers: !metadata.showCorrectAnswers
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        metadata.showCorrectAnswers ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          metadata.showCorrectAnswers ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Optional Access Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Access Code / Password (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={metadata.password || ''}
                    onChange={(e) =>
                      onUpdateMetadata({
                        password: e.target.value.trim() || undefined
                      })
                    }
                    placeholder="Leave empty for open classroom access"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
