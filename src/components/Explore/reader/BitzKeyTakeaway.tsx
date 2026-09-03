// ============================================================================
// EDTECHRA-BITZ: BitzKeyTakeaway (Refined Typography)
// Renders the Key Takeaway card with a subtle Brain icon badge.
// Body text matches the EXACT SAME Lora reading typography and size as Q&A answers.
// Heading: 16–18px mobile, 18–20px desktop.
// ============================================================================

import React from 'react';
import { Brain } from 'lucide-react';
import { useBitzTheme } from '@/context/BitzThemeContext';

interface BitzKeyTakeawayProps {
  takeaway: string;
}

export const BitzKeyTakeaway: React.FC<BitzKeyTakeawayProps> = ({ takeaway }) => {
  const { readingSettings } = useBitzTheme();

  if (!takeaway || takeaway.trim().length === 0) return null;

  // Dynamic font sizing matching BitzQuestionAnswerCard exactly:
  // Desktop: Answer/Takeaway ~18px
  // Mobile:  Answer/Takeaway ~16–17px
  const textSize = readingSettings?.textSize || 'medium';

  let bodySizeClass = 'text-[16px] sm:text-[18px]';
  let headingSizeClass = 'text-[16.5px] sm:text-[19px]';

  if (textSize === 'small') {
    bodySizeClass = 'text-[15px] sm:text-[17px]';
    headingSizeClass = 'text-[15.5px] sm:text-[18px]';
  } else if (textSize === 'large') {
    bodySizeClass = 'text-[17px] sm:text-[19px]';
    headingSizeClass = 'text-[17.5px] sm:text-[20px]';
  } else if (textSize === 'xlarge') {
    bodySizeClass = 'text-[18px] sm:text-[21px]';
    headingSizeClass = 'text-[18.5px] sm:text-[22px]';
  }

  return (
    <aside
      className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 sm:p-6 bg-gradient-to-br from-[#071329]/95 via-[#08152e]/90 to-[#050f22]/95 border border-purple-500/25 hover:border-purple-400/40 shadow-md shadow-purple-950/20 transition-all duration-200"
      aria-label="Key Takeaway"
    >
      <div className="flex items-start gap-3 sm:gap-3.5 mb-2 sm:mb-2.5">
        {/* Subtle Brain Icon Badge (28-32px) */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center bg-purple-950/70 border border-purple-500/40 text-purple-300 shadow-xs mt-0.5"
          aria-hidden="true"
        >
          <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
        </div>

        {/* Heading: Key Takeaway (16–18px mobile, 18–20px desktop) */}
        <h3 className={`font-ui font-bold tracking-tight text-white pt-0.5 ${headingSizeClass}`}>
          Key Takeaway
        </h3>
      </div>

      {/* Body Text: SAME Lora font, SAME size as Q&A answers, properly justified */}
      <div className="pl-0 sm:pl-[44px]">
        <p
          className={`font-reading text-slate-200 leading-[1.62] sm:leading-[1.72] tracking-normal font-normal select-text text-justify hyphens-auto ${bodySizeClass}`}
          style={{ textAlign: 'justify', textJustify: 'inter-word' }}
        >
          {takeaway}
        </p>
      </div>
    </aside>
  );
};
