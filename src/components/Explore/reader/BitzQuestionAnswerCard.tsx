// ============================================================================
// EDTECHRA-BITZ: BitzQuestionAnswerCard
// Renders one of the 3 learning cards with progressive accent colors:
// 01: Magenta / Pink
// 02: Cyan / Blue
// 03: Green / Emerald
// Left-aligned, stylish typography (Lora for answers, Manrope for questions).
// ============================================================================

import React from 'react';
import { Lightbulb, Coffee, TrendingUp } from 'lucide-react';
import { BitzReadingSection } from '@/types/knowledgeBitz';
import { useBitzTheme } from '@/context/BitzThemeContext';

interface BitzQuestionAnswerCardProps {
  section: BitzReadingSection;
  index: number; // 0, 1, or 2
}

interface CardAccent {
  numberBg: string;
  numberText: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  cardBorder: string;
  hoverBorder: string;
  glowClass: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}

const CARD_ACCENTS: CardAccent[] = [
  // Question 1: Pink / Magenta Accent
  {
    numberBg: 'bg-[#db2777]', // rose/pink-600
    numberText: 'text-white',
    iconBg: 'bg-pink-950/50',
    iconBorder: 'border-pink-500/30',
    iconColor: 'text-pink-300',
    cardBorder: 'border-pink-500/20',
    hoverBorder: 'hover:border-pink-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(219,39,119,0.15)]',
    IconComponent: Lightbulb
  },
  // Question 2: Cyan / Blue Accent
  {
    numberBg: 'bg-[#0284c7]', // sky-600
    numberText: 'text-white',
    iconBg: 'bg-sky-950/50',
    iconBorder: 'border-sky-500/30',
    iconColor: 'text-sky-300',
    cardBorder: 'border-sky-500/20',
    hoverBorder: 'hover:border-sky-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(2,132,199,0.15)]',
    IconComponent: Coffee
  },
  // Question 3: Green / Teal Accent
  {
    numberBg: 'bg-[#059669]', // emerald-600
    numberText: 'text-white',
    iconBg: 'bg-emerald-950/50',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-300',
    cardBorder: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-400/40',
    glowClass: 'hover:shadow-[0_4px_24px_-4px_rgba(5,150,105,0.15)]',
    IconComponent: TrendingUp
  }
];

export const BitzQuestionAnswerCard: React.FC<BitzQuestionAnswerCardProps> = ({
  section,
  index
}) => {
  const { readingSettings } = useBitzTheme();
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const Icon = accent.IconComponent;

  // Format 1 -> "01", 2 -> "02", 3 -> "03"
  const formattedNumber = String(section.number || index + 1).padStart(2, '0');

  // Dynamic font sizing adhering strictly to specification:
  // Desktop: Answer 19–21px (medium ~20px), Question 20–24px (medium ~22px)
  // Mobile:  Answer 17–19px (medium ~18px), Question 18–21px (medium ~19px)
  const textSize = readingSettings?.textSize || 'medium';

  let questionSizeClass = 'text-[18px] sm:text-[21px]';
  let answerSizeClass = 'text-[17px] sm:text-[19px]';

  if (textSize === 'small') {
    questionSizeClass = 'text-[17px] sm:text-[19px]';
    answerSizeClass = 'text-[16px] sm:text-[18px]';
  } else if (textSize === 'large') {
    questionSizeClass = 'text-[20px] sm:text-[23px]';
    answerSizeClass = 'text-[18px] sm:text-[21px]';
  } else if (textSize === 'xlarge') {
    questionSizeClass = 'text-[22px] sm:text-[25px]';
    answerSizeClass = 'text-[20px] sm:text-[23px]';
  }

  return (
    <article
      className={`group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#06142a]/95 via-[#071833]/90 to-[#040e24]/95 border ${accent.cardBorder} ${accent.hoverBorder} ${accent.glowClass} transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-black/20 select-text`}
      aria-label={`Question ${formattedNumber}: ${section.question}`}
    >
      {/* Header Row: Number Badge + Question + Accent Icon */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          {/* Circular Number Badge (01, 02, 03) */}
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center font-ui font-black text-xs sm:text-sm tracking-tight shadow-sm ${accent.numberBg} ${accent.numberText}`}
            aria-hidden="true"
          >
            {formattedNumber}
          </div>

          {/* Question: Bold White Manrope Typography */}
          <h2
            className={`font-ui font-bold text-white leading-snug tracking-tight text-left flex-1 pt-0.5 ${questionSizeClass}`}
          >
            {section.question}
          </h2>
        </div>

        {/* Small Topic Category Icon on Right */}
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center border shadow-xs ${accent.iconBg} ${accent.iconBorder} ${accent.iconColor}`}
          aria-hidden="true"
        >
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
        </div>
      </div>

      {/* Answer Body: Lora Serif, STRICTLY Left-Aligned, Line-Height 1.7 */}
      <div className="pl-0 sm:pl-12 sm:pr-2">
        <p
          className={`font-reading text-slate-200 leading-[1.72] tracking-normal text-left font-normal select-text ${answerSizeClass}`}
          style={{ textAlign: 'left' }}
        >
          {section.answer}
        </p>
      </div>
    </article>
  );
};
