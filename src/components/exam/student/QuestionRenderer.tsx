// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION RENDERER DISPATCHER
// Routes questions to specialized interactive renderers based on question type
// ============================================================================

import React from 'react';
import { FlattenedExamQuestion } from '../shared/scoringUtilities';
import { getQuestionTypeMeta } from '../shared/QuestionTypes';
import { MCQQuestion } from './renderers/MCQQuestion';
import { MultipleSelectQuestionComponent } from './renderers/MultipleSelectQuestion';
import { TrueFalseQuestionComponent } from './renderers/TrueFalseQuestion';
import { FillBlankQuestionComponent } from './renderers/FillBlankQuestion';
import { MatchingQuestionComponent } from './renderers/MatchingQuestion';
import { ReorderQuestionComponent } from './renderers/ReorderQuestion';
import { ShortAnswerQuestionComponent } from './renderers/ShortAnswerQuestion';
import { EssayQuestionComponent } from './renderers/EssayQuestion';
import { ReadingQuestionLayout } from './renderers/ReadingQuestion';
import { ImageQuestionComponent } from './renderers/ImageQuestion';
import { AudioQuestionComponent } from './renderers/AudioQuestion';
import { ClozeQuestionComponent } from './renderers/ClozeQuestion';

interface QuestionRendererProps {
  questionItem: FlattenedExamQuestion;
  currentAnswer: any;
  onAnswerChange: (answer: any) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  questionItem,
  currentAnswer,
  onAnswerChange
}) => {
  const {
    question,
    displayNumber,
    parentPassage,
    parentPassageTitle,
    parentAudioUrl,
    parentActivityTitle,
    parentTranscript,
    showTranscriptToStudents,
    parentImageUrl,
    parentActivityType,
    rubric,
    sectionTitle
  } = questionItem;
  const meta = getQuestionTypeMeta(question.type);
  const [showTranscript, setShowTranscript] = React.useState(false);

  const isPictureTask = Boolean(
    parentActivityType === 'picture_description_activity' ||
    (parentImageUrl && ['paragraph', 'essay', 'short_answer'].includes(question.type)) ||
    (question.type === 'image_question' && !(question as any).options?.length)
  );
  const stimulusImageUrl = parentImageUrl || (question as any).imageUrl;

  const wordCount = React.useMemo(() => {
    if (!currentAnswer || typeof currentAnswer !== 'string') return 0;
    return currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  }, [currentAnswer]);

  const charCount = typeof currentAnswer === 'string' ? currentAnswer.length : 0;

  const renderContent = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <MCQQuestion
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'multiple_select':
        return (
          <MultipleSelectQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'true_false':
        return (
          <TrueFalseQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'fill_in_blank':
        return (
          <FillBlankQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'matching':
        return (
          <MatchingQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'reorder':
        return (
          <ReorderQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'short_answer':
        return (
          <ShortAnswerQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'essay':
        return (
          <EssayQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'image_question':
        return (
          <ImageQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'audio_question':
        return (
          <AudioQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      case 'cloze_passage':
        return (
          <ClozeQuestionComponent
            question={question}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        );

      default:
        return (
          <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-rose-300 text-xs">
            Unknown question type: {question.type}
          </div>
        );
    }
  };

  const coreCard = (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4 text-slate-900 question-card question-content [color-scheme:light]">
      {/* Question Header: Section, Question Number & Marks */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            {displayNumber}
          </span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
              {sectionTitle}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color.badge}`}>
              {meta.title}
            </span>
          </div>
        </div>

        <div className="text-xs font-black text-emerald-800 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
          {question.marks || meta.defaultMarks} Mark{(question.marks || meta.defaultMarks) > 1 ? 's' : ''}
        </div>
      </div>

      {/* Dedicated Picture Description Layout */}
      {isPictureTask && stimulusImageUrl ? (
        <div className="space-y-4">
          {/* Picture Itself */}
          <div className="max-w-[760px] mx-auto w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
            <img
              src={stimulusImageUrl}
              alt="Picture stimulus"
              className="w-full max-h-[360px] object-contain mx-auto"
            />
          </div>

          {/* Short Instruction */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
              {question.question}
            </p>
            {rubric && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-indigo-100/80">
                <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                  Rubric Criteria:
                </span>
                {rubric.content !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                    Content ({String(rubric.content)}m)
                  </span>
                )}
                {rubric.vocabulary !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                    Vocabulary ({String(rubric.vocabulary)}m)
                  </span>
                )}
                {rubric.grammar !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                    Grammar ({String(rubric.grammar)}m)
                  </span>
                )}
                {rubric.organization !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                    Organization ({String(rubric.organization)}m)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Answer Area */}
          <div className="space-y-1.5 answer-area">
            <textarea
              rows={6}
              value={currentAnswer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Write your description here..."
              className="w-full p-4 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed shadow-2xs resize-y min-h-[180px] max-h-[240px]"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
              <span>Describe key elements, characters, actions, and settings clearly.</span>
              <span className="font-mono text-slate-700 font-bold">
                {wordCount} words • {charCount} characters
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Layout: Prompt + Parent Audio (if any) + Question Form */
        <div className="space-y-3.5">
          {/* Listening Activity Audio Card */}
          {parentAudioUrl && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-violet-50/40 border border-violet-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-violet-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                  <span>Listening Activity: {parentActivityTitle || 'Audio Track'}</span>
                </span>

                {showTranscriptToStudents && (
                  <button
                    type="button"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-xs font-bold text-violet-800 hover:text-violet-950 cursor-pointer"
                  >
                    {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                  </button>
                )}
              </div>

              <audio controls className="w-full h-10 rounded-lg accent-violet-600">
                <source src={parentAudioUrl} />
                Your browser does not support audio playback.
              </audio>

              {showTranscript && parentTranscript && (
                <div className="p-3 bg-white rounded-xl border border-violet-200 text-xs text-slate-800 font-medium leading-relaxed animate-fadeIn">
                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 block mb-1">
                    Audio Transcript:
                  </span>
                  {parentTranscript}
                </div>
              )}
            </div>
          )}

          {/* Question Prompt */}
          <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-relaxed tracking-wide">
            {question.question}
          </h2>

          {/* Interactive Question Input Form */}
          {renderContent()}
        </div>
      )}
    </div>
  );

  // If reading passage context exists, wrap in reading passage container
  if (parentPassage) {
    return (
      <ReadingQuestionLayout passage={parentPassage} passageTitle={parentPassageTitle}>
        {coreCard}
      </ReadingQuestionLayout>
    );
  }

  return coreCard;
};
