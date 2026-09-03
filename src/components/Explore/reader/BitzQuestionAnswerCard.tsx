// ============================================================================
// EDTECHRA-BITZ: BitzQuestionAnswerCard (Refined Reading UI)
// Renders one of the 3 learning cards with progressive numbered badges:
// 01: Magenta / Pink
// 02: Cyan / Blue
// 03: Green / Emerald
// Clean, icon-free cards with strong question headings and justified Lora answers.
// ============================================================================

import React from 'react';
import { BitzReadingSection } from '@/types/knowledgeBitz';
import { useBitzTheme } from '@/context/BitzThemeContext';

interface BitzQuestionAnswerCardProps {
  section: BitzReadingSection;
  index: number; // 0, 1, or 2
}

interface CardAccent {
  numberBg: string;
  numberText: string;
  cardBorder: string;
  hoverBorder: string;
  glowClass: string;
}

const CARD_ACCENTS: CardAccent[] = [
  // Question 1: Pink / Magenta Accent
  {
    numberBg: 'bg-[#db2777]', // rose/pink-600
    numberText: 'text-white',
    cardBorder: 'border-pink-500/20',
    hoverBorder: 'hover:border-pink-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(219,39,119,0.15)]'
  },
  // Question 2: Cyan / Blue Accent
  {
    numberBg: 'bg-[#0284c7]', // sky-600
    numberText: 'text-white',
    cardBorder: 'border-sky-500/20',
    hoverBorder: 'hover:border-sky-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(2,132,199,0.15)]'
  },
  // Question 3: Green / Teal Accent
  {
    numberBg: 'bg-[#059669]', // emerald-600
    numberText: 'text-white',
    cardBorder: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(5,150,105,0.15)]'
  }
];

export const BitzQuestionAnswerCard: React.FC<BitzQuestionAnswerCardProps> = ({
  section,
  index
}) => {
  const { readingSettings } = useBitzTheme();
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  // Format 1 -> "01", 2 -> "02", 3 -> "03"
  const formattedNumber = String(section.number || index + 1).padStart(2, '0');

  // Dynamic font sizing:
  // Desktop: Answer ~18px, Question ~20–22px
  // Mobile:  Answer ~16–17px, Question ~17–19px
  const textSize = readingSettings?.textSize || 'medium';

  let questionSizeClass = 'text-[17px] sm:text-[21px]';
  let answerSizeClass = 'text-[16px] sm:text-[18px]';

  if (textSize === 'small') {
    questionSizeClass = 'text-[16px] sm:text-[19px]';
    answerSizeClass = 'text-[15px] sm:text-[17px]';
  } else if (textSize === 'large') {
    questionSizeClass = 'text-[18px] sm:text-[22px]';
    answerSizeClass = 'text-[17px] sm:text-[19px]';
  } else if (textSize === 'xlarge') {
    questionSizeClass = 'text-[19px] sm:text-[24px]';
    answerSizeClass = 'text-[18px] sm:text-[21px]';
  }

  return (
    <article
      className={`group relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 sm:p-6 bg-gradient-to-br from-[#06142a]/95 via-[#071833]/90 to-[#040e24]/95 border ${accent.cardBorder} ${accent.hoverBorder} ${accent.glowClass} transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-black/20 select-text`}
      aria-label={`Question ${formattedNumber}: ${section.question}`}
    >
      {/* Question Row: Numbered Circle (Left) + Question (Full remaining width, NO right icon) */}
      <div className="flex items-start gap-3 sm:gap-3.5 mb-2.5 sm:mb-3">
        {/* Compact Circular Number Badge (34-36px mobile, 40-42px desktop) */}
        <div
          className={`w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-full shrink-0 flex items-center justify-center font-ui font-black text-xs sm:text-sm tracking-tight shadow-xs mt-0.5 sm:mt-0 ${accent.numberBg} ${accent.numberText}`}
          aria-hidden="true"
        >
          {formattedNumber}
        </div>

        {/* Question Heading: Strong, bold white, natural wrapping across available width */}
        <h2
          className={`font-ui font-bold text-white leading-[1.28] sm:leading-[1.32] tracking-tight text-left flex-1 pt-0.5 sm:pt-1 ${questionSizeClass}`}
        >
          {section.question}
        </h2>
      </div>

      {/* Answer Body: Lora Serif, PROPERLY JUSTIFIED on both desktop & mobile */}
      {/* Pl-0 on mobile for maximum readable text column; sm:pl-[50px] on desktop to align under question */}
      <div className="pl-0 sm:pl-[50px]">
        <p
          className={`font-reading text-slate-200 leading-[1.62] sm:leading-[1.72] tracking-normal font-normal select-text text-justify hyphens-auto ${answerSizeClass}`}
          style={{ textAlign: 'justify', textJustify: 'inter-word' }}
        >
          {section.answer}
        </p>
      </div>
    </article>
  );
};
