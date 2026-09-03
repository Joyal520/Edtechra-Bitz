// ============================================================================
// EDTECHRA-BITZ: BitzReadingView
// Orchestrates the premium Knowledge Bitz reading experience:
// Desktop (>= 1024px): Spacious two-column layout (1000–1100px max width).
// Left side: 3 Q&A Cards + Source citation.
// Right side: Visual illustration + Key Takeaway card.
// Mobile (< 768px): Single-column responsive layout.
// ============================================================================

import React from 'react';
import { KnowledgeBitzItem } from '@/types/knowledgeBitz';
import { getCategoryById } from '@/utils/bitzTopicsConfig';
import { getBitzReadingData } from '@/utils/bitzReadingData';
import { BitzReadingHeader } from './BitzReadingHeader';
import { BitzQuestionAnswerCard } from './BitzQuestionAnswerCard';
import { BitzKeyTakeaway } from './BitzKeyTakeaway';
import { BitzReadingVisual } from './BitzReadingVisual';
import { BitzReadingFooter } from './BitzReadingFooter';

interface BitzReadingViewProps {
  bitz: KnowledgeBitzItem;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onClose: () => void;
  onStartQuiz: () => void;
  hasQuiz: boolean;
}

export const BitzReadingView: React.FC<BitzReadingViewProps> = ({
  bitz,
  isSaved,
  onToggleSave,
  onShare,
  onClose,
  onStartQuiz,
  hasQuiz
}) => {
  const category = getCategoryById(bitz.category || bitz.topic_id);
  const readingData = getBitzReadingData(bitz);

  const categoryColor = category?.color || '#ec4899';
  const categoryName = category?.name || bitz.category || 'People & Psychology';
  const xpValue = bitz.xp_value || 10;

  return (
    <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-between min-h-full">
      {/* 1. Header (Navigation, Category, XP, Title, Subtitle) */}
      <BitzReadingHeader
        title={bitz.title}
        subtitle={readingData.subtitle}
        categoryName={categoryName}
        categoryColor={categoryColor}
        xpValue={xpValue}
        isSaved={isSaved}
        onToggleSave={onToggleSave}
        onShare={onShare}
        onClose={onClose}
      />

      {/* 2. Main Reading Content Container */}
      <div className="pt-4 sm:pt-8 flex-1">
        {/* ================================================================ */}
        {/* DESKTOP LAYOUT (>= 1024px): TWO COLUMNS                          */}
        {/* ================================================================ */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): The 3 Q&A Cards + Source Citation */}
          <div className="col-span-7 space-y-5">
            {readingData.sections.map((section, idx) => (
              <BitzQuestionAnswerCard
                key={section.number || idx}
                section={section}
                index={idx}
              />
            ))}

            {/* Source Citation (Desktop) */}
            {readingData.sourceCitation && (
              <div className="font-ui text-xs text-slate-400 italic pt-2 pl-1 select-text">
                <span>Source: </span>
                <span className="text-slate-300 font-medium">
                  {readingData.sourceCitation}
                </span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Visual Illustration + Key Takeaway Card */}
          <div className="col-span-5 space-y-5 sticky top-6">
            {/* Illustration */}
            <BitzReadingVisual
              visualUrl={bitz.visual_url}
              title={bitz.title}
              categoryName={categoryName}
              categoryColor={categoryColor}
              variant="desktop"
            />

            {/* Key Takeaway Card */}
            <BitzKeyTakeaway takeaway={readingData.keyTakeaway} />
          </div>
        </div>

        {/* ================================================================ */}
        {/* MOBILE & TABLET LAYOUT (< 1024px): ADAPTIVE SINGLE COLUMN        */}
        {/* ================================================================ */}
        <div className="lg:hidden space-y-3.5 sm:space-y-4">
          {/* Compact Visual Image (placed before Q&A cards) */}
          {bitz.visual_url && (
            <BitzReadingVisual
              visualUrl={bitz.visual_url}
              title={bitz.title}
              categoryName={categoryName}
              categoryColor={categoryColor}
              variant="mobile"
            />
          )}

          {/* The 3 Q&A Cards */}
          {readingData.sections.map((section, idx) => (
            <BitzQuestionAnswerCard
              key={section.number || idx}
              section={section}
              index={idx}
            />
          ))}

          {/* Key Takeaway Card */}
          <BitzKeyTakeaway takeaway={readingData.keyTakeaway} />

          {/* Source Citation (Mobile) */}
          {readingData.sourceCitation && (
            <div className="font-ui text-xs text-slate-400 italic pt-1 px-1 select-text">
              <span>Source: </span>
              <span className="text-slate-300 font-medium">
                {readingData.sourceCitation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Action Bar (Done / Back + Quiz CTA) */}
      <BitzReadingFooter
        onDone={onClose}
        onStartQuiz={onStartQuiz}
        hasQuiz={hasQuiz}
      />
    </div>
  );
};
