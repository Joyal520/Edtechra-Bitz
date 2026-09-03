// ============================================================================
// EDTECHRA-BITZ: BitzKeyTakeaway
// Renders the compact Key Takeaway card with a brain icon and purple/magenta accent.
// Positioned below the visual image on Desktop, and below the 3 Q&A cards on Mobile.
// ============================================================================

import React from 'react';
import { Brain } from 'lucide-react';

interface BitzKeyTakeawayProps {
  takeaway: string;
}

export const BitzKeyTakeaway: React.FC<BitzKeyTakeawayProps> = ({ takeaway }) => {
  if (!takeaway || takeaway.trim().length === 0) return null;

  return (
    <aside
      className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#071329]/95 via-[#08152e]/90 to-[#050f22]/95 border border-purple-500/25 hover:border-purple-400/40 shadow-md shadow-purple-950/20 transition-all duration-200"
      aria-label="Key Takeaway"
    >
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Brain Icon with Purple Badge */}
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center bg-purple-950/70 border border-purple-500/40 text-purple-300 shadow-xs mt-0.5"
          aria-hidden="true"
        >
          <Brain className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <h3 className="font-ui font-bold text-xs sm:text-sm tracking-wide text-white">
            Key Takeaway
          </h3>
          <p
            className="font-reading text-xs sm:text-[14px] text-slate-300 leading-relaxed font-normal select-text"
            style={{ textAlign: 'left' }}
          >
            {takeaway}
          </p>
        </div>
      </div>
    </aside>
  );
};
