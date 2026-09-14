// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SAFE FORMATTED TEXT UTILITY
// Safely renders rich text (<b>, <strong>, <i>, <em>, <u>) and handles
// placeholders ([blank], ___) for MCQs and Fill in the Blank questions.
// Never exposes raw "[blank]" text to students.
// ============================================================================

import React from 'react';

export interface FormattedPromptOptions {
  isMCQ?: boolean;
  isFillBlank?: boolean;
  inlineInputValue?: string;
  onInlineInputChange?: (val: string) => void;
  inputPlaceholder?: string;
  className?: string;
}

/**
 * Checks if a string contains blank placeholder patterns like [blank] or ___
 */
export function hasBlankPlaceholder(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /\[blank\]|___+|\[\s*__+\s*\]/i.test(text);
}

/**
 * Safely parses and renders question text with:
 * 1. Safe HTML formatting: <b>, <strong>, <i>, <em>, <u>
 * 2. MCQ placeholder replacement: replaces [blank] with a clean visual underline
 * 3. Fill-in-the-blank inline interactive input: embeds <input> where [blank] occurs
 */
export function renderFormattedPrompt(
  text: string,
  options: FormattedPromptOptions = {}
): React.ReactNode {
  if (!text || typeof text !== 'string') return '';

  const {
    isMCQ = false,
    isFillBlank = false,
    inlineInputValue = '',
    onInlineInputChange,
    inputPlaceholder = 'type answer...',
    className = ''
  } = options;

  // Tokenize string on supported tags and blank placeholders:
  // Tags: <(?:\/)?(?:b|strong|i|em|u)>
  // Blank: \[blank\]|___+|\[\s*__+\s*\]
  const tokenRegex = /(<\/?(?:b|strong|i|em|u)>|\[blank\]|___+|\[\s*__+\s*\])/gi;
  const parts = text.split(tokenRegex);

  let isBold = false;
  let isItalic = false;
  let isUnderline = false;

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        const lowerPart = part.toLowerCase();

        // Check opening tags
        if (lowerPart === '<b>' || lowerPart === '<strong>') {
          isBold = true;
          return null;
        }
        if (lowerPart === '<i>' || lowerPart === '<em>') {
          isItalic = true;
          return null;
        }
        if (lowerPart === '<u>') {
          isUnderline = true;
          return null;
        }

        // Check closing tags
        if (lowerPart === '</b>' || lowerPart === '</strong>') {
          isBold = false;
          return null;
        }
        if (lowerPart === '</i>' || lowerPart === '</em>') {
          isItalic = false;
          return null;
        }
        if (lowerPart === '</u>') {
          isUnderline = false;
          return null;
        }

        // Check blank placeholders
        const isBlank =
          lowerPart === '[blank]' ||
          /^_+$/.test(part) ||
          /^\[\s*__+\s*\]$/.test(part);

        if (isBlank) {
          if (isFillBlank && onInlineInputChange) {
            // Interactive Liquid inline input field for Fill in the Blank
            return (
              <span key={`blank-${index}`} className="inline-block mx-2 my-1 align-middle">
                <input
                  type="text"
                  value={inlineInputValue}
                  onChange={(e) => onInlineInputChange(e.target.value)}
                  placeholder={inputPlaceholder || 'type answer...'}
                  autoComplete="off"
                  spellCheck={false}
                  className="inline-block min-w-[140px] sm:min-w-[180px] max-w-[280px] px-4 py-2 sm:py-2.5 bg-white/95 backdrop-blur-md border-2 border-sky-400 focus:border-[#026fc3] focus:ring-4 focus:ring-sky-200/70 rounded-2xl text-base sm:text-lg font-black text-slate-950 placeholder:text-slate-400/80 focus:outline-hidden shadow-inner transition-all duration-200 text-center caret-[#026fc3]"
                />
              </span>
            );
          }

          // In MCQ or standard view: render clean typographic liquid blank line
          return (
            <span
              key={`blank-${index}`}
              className={`inline-block border-b-2 sm:border-b-3 min-w-[64px] mx-1.5 text-center font-black select-none px-2 tracking-wider ${
                isMCQ ? 'border-indigo-600 text-indigo-700' : 'border-slate-800 text-slate-900'
              }`}
              title="Blank to complete"
            >
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          );
        }

        // Standard text node with active formatting styles
        let element: React.ReactNode = part;

        if (isUnderline) {
          element = (
            <u
              key={`u-${index}`}
              className="underline underline-offset-4 decoration-2 decoration-indigo-600 font-semibold"
            >
              {element}
            </u>
          );
        }

        if (isItalic) {
          element = (
            <em key={`em-${index}`} className="italic font-medium">
              {element}
            </em>
          );
        }

        if (isBold) {
          element = (
            <strong key={`str-${index}`} className="font-black text-slate-950">
              {element}
            </strong>
          );
        }

        return <React.Fragment key={`txt-${index}`}>{element}</React.Fragment>;
      })}
    </span>
  );
}
