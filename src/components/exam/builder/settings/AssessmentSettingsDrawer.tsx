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
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#070e1e] border-l border-blue-900/60 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-blue-900/60 flex items-center justify-between bg-[#050b18]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isSurvey ? 'Survey Settings' : 'Exam Settings'}
                </h2>
                <p className="text-xs text-slate-400">
                  Configure execution policies and behavior
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            {/* Mode-Specific Settings */}
            {isSurvey ? (
              /* SURVEY MODE SETTINGS */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                  <FileQuestion className="w-4 h-4" />
                  <span>Survey Response Collection</span>
                </div>

                <div className="space-y-3 bg-[#091124] p-4 rounded-2xl border border-blue-900/60">
                  {/* Anonymous Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Anonymous Responses
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        defaultSurveySettings.isAnonymous ? 'bg-amber-500' : 'bg-slate-700'
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
                  <div className="flex items-center justify-between pt-3 border-t border-blue-900/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Collect Email Addresses
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        defaultSurveySettings.collectEmail ? 'bg-amber-500' : 'bg-slate-700'
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
                  <div className="flex items-center justify-between pt-3 border-t border-blue-900/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Limit to 1 Response per Student
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        defaultSurveySettings.oneResponsePerUser ? 'bg-amber-500' : 'bg-slate-700'
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
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
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
                    className="w-full bg-[#091124] border border-blue-800/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              /* EXAM MODE SETTINGS */
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>Exam Execution & Grading</span>
                </div>

                {/* Duration & Passing Score */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#091124] rounded-2xl border border-blue-900/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
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
                        className="w-full bg-[#050b18] border border-blue-800/60 rounded-xl px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-slate-400 font-semibold">mins</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#091124] rounded-2xl border border-blue-900/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
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
                        className="w-full bg-[#050b18] border border-blue-800/60 rounded-xl px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-slate-400 font-semibold">%</span>
                    </div>
                  </div>
                </div>

                {/* Attempts Allowed */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Max Attempts Allowed
                  </label>
                  <select
                    value={metadata.maxAttempts || 1}
                    onChange={(e) =>
                      onUpdateMetadata({
                        maxAttempts: parseInt(e.target.value, 10) || 1
                      })
                    }
                    className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Attempt (Strict)</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={999}>Unlimited Attempts (Practice Mode)</option>
                  </select>
                </div>

                {/* Shuffling & Feedback Toggles */}
                <div className="space-y-3 bg-[#091124] p-4 rounded-2xl border border-blue-900/60">
                  {/* Shuffle Questions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Shuffle Questions
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        metadata.randomizeQuestions ? 'bg-indigo-600' : 'bg-slate-700'
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
                  <div className="flex items-center justify-between pt-3 border-t border-blue-900/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Shuffle Choices
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        metadata.randomizeOptions ? 'bg-indigo-600' : 'bg-slate-700'
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
                  <div className="flex items-center justify-between pt-3 border-t border-blue-900/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Show Score Immediately
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        metadata.showMarksImmediately ? 'bg-indigo-600' : 'bg-slate-700'
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
                  <div className="flex items-center justify-between pt-3 border-t border-blue-900/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Reveal Answer Keys
                      </span>
                      <p className="text-[10px] text-slate-400">
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
                        metadata.showCorrectAnswers ? 'bg-indigo-600' : 'bg-slate-700'
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
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
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
                    className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-blue-900/60 bg-[#050b18] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
