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
  const { question, displayNumber, parentPassage, parentPassageTitle, sectionTitle } = questionItem;
  const meta = getQuestionTypeMeta(question.type);

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

      default:
        return (
          <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-rose-300 text-xs">
            Unknown question type: {question.type}
          </div>
        );
    }
  };

  const coreCard = (
    <div className="bg-[#0f1b3d] rounded-3xl border border-blue-800/80 p-5 sm:p-7 shadow-xl space-y-5">
      {/* Question Header: Section, Question Number & Marks */}
      <div className="flex items-center justify-between border-b border-blue-900/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            {displayNumber}
          </span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
              {sectionTitle}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${meta.color.badge}`}>
              {meta.title}
            </span>
          </div>
        </div>

        <div className="text-xs font-black text-emerald-300 px-3 py-1 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
          {question.marks || meta.defaultMarks} Mark{question.marks > 1 ? 's' : ''}
        </div>
      </div>

      {/* Question Prompt */}
      <h2 className="text-base sm:text-lg md:text-xl font-black text-white leading-relaxed tracking-wide">
        {question.question}
      </h2>

      {/* Interactive Question Input Form */}
      {renderContent()}
    </div>
  );

  // If reading passage context exists, wrap in reading side-by-side layout
  if (parentPassage) {
    return (
      <ReadingQuestionLayout passage={parentPassage} passageTitle={parentPassageTitle}>
        {coreCard}
      </ReadingQuestionLayout>
    );
  }

  return coreCard;
};
