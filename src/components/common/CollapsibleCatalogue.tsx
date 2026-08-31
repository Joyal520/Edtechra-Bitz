// ============================================================================
// EDTECHRA-BITZ: Universal Collapsible Catalogue Component
// Standardizes Show/Hide behavior across all Admin Panel tables & listings
// Collapsed by default for maximum performance & clean UX
// ============================================================================

import React, { useState, useId } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';

export interface CollapsibleCatalogueProps {
  /**
   * Title of the catalogue (e.g. "Vocabulary Catalogue", "Quiz Catalogue", "User Catalogue")
   */
  title: string;
  /**
   * Dynamic item count (e.g. 328, "198 items", etc.)
   */
  count?: number | string;
  /**
   * Optional icon component to display next to the title
   */
  icon?: React.ReactNode;
  /**
   * Optional custom badge or status label
   */
  badge?: React.ReactNode;
  /**
   * Optional subtitle or hint text
   */
  subtitle?: string;
  /**
   * Optional custom label for the Show button (default: "Show Catalogue")
   */
  showLabel?: string;
  /**
   * Optional custom label for the Hide button (default: "Hide Catalogue")
   */
  hideLabel?: string;
  /**
   * Optional action button slot on the right side of the header
   */
  actionButton?: React.ReactNode;
  /**
   * Optional custom container CSS classes
   */
  className?: string;
  /**
   * Children: Search bar, filters, and data table/list
   */
  children: React.ReactNode;
}

export const CollapsibleCatalogue: React.FC<CollapsibleCatalogueProps> = ({
  title,
  count,
  icon,
  badge,
  subtitle,
  showLabel = 'Show Catalogue',
  hideLabel = 'Hide Catalogue',
  actionButton,
  className = '',
  children
}) => {
  const contentId = useId();

  // Strictly default to CLOSED (false) on fresh page/section load for optimal DOM performance
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const countDisplay = typeof count === 'number' ? `${count.toLocaleString()} ${count === 1 ? 'item' : 'items'}` : count;

  return (
    <section className={`bg-white dark:bg-stone-900 border border-stone-300/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm transition-all ${className}`}>
      
      {/* Catalogue Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/95 dark:bg-stone-850 border-b border-stone-300 dark:border-stone-800">
        
        {/* Title & Count Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black shrink-0 shadow-xs">
            {icon || <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-[#0a213c] dark:text-white tracking-tight">
                {title}
              </h3>

              {count !== undefined && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-[11px] font-black tracking-wide">
                  {countDisplay}
                </span>
              )}

              {badge}
            </div>

            {subtitle && (
              <p className="text-xs text-stone-700 dark:text-stone-200 font-semibold mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls: Show/Hide Button & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {actionButton}

          {/* Accessible Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls={contentId}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026fc3] focus-visible:ring-offset-1 ${
              isOpen
                ? 'bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'
                : 'bg-[#026fc3] hover:bg-[#025ea6] text-white shadow-md shadow-blue-600/20'
            }`}
          >
            {isOpen ? (
              <>
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                <span>{hideLabel}</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                <span>{showLabel}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Collapsible Content Area (Search, Filters & Table/List) */}
      {isOpen && (
        <div
          id={contentId}
          className="p-4 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {children}
        </div>
      )}

    </section>
  );
};
