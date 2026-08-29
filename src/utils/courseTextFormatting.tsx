// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: EDITORIAL COURSE TEXT FORMATTING UTILITY
// Premium Reading-First Typography (Apple Books & Kindle inspired).
// Desktop: 22-24px, Mobile: 20-22px, Line-height: 1.7-1.85, Left-aligned.
// ============================================================================

import React from 'react';

/**
 * Parses markdown-style inline formatting (bold, italic, code, links) into React nodes.
 */
export function formatInlineText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by inline markdown tokens: **bold**, *italic*, `code`, [label](url)
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-inherit tracking-tight">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-inherit">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[#026fc3] font-mono text-[0.88em] font-semibold border border-stone-200/60 dark:border-stone-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [label](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, label, url] = match;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#026fc3] hover:underline font-medium underline-offset-4"
          >
            {label}
          </a>
        );
      }
    }

    // Plain text
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export type TextScale = 'sm' | 'md' | 'lg' | 'xl';

export const TEXT_SCALE_CLASSES: Record<TextScale, { body: string; quote: string; h1: string; h2: string; h3: string }> = {
  sm: {
    body: 'text-[18px] sm:text-[19px] md:text-[21px] leading-[1.75]',
    quote: 'text-[18px] sm:text-[20px] md:text-[22px]',
    h1: 'text-[26px] sm:text-[30px] md:text-[36px]',
    h2: 'text-[22px] sm:text-[25px] md:text-[30px]',
    h3: 'text-[19px] sm:text-[22px] md:text-[25px]'
  },
  md: {
    // Standard Editorial: Mobile 20-22px, Desktop 22-24px, Line-height 1.75-1.85
    body: 'text-[20px] sm:text-[21px] md:text-[23px] lg:text-[24px] leading-[1.78] tracking-[-0.01em]',
    quote: 'text-[21px] sm:text-[23px] md:text-[26px]',
    h1: 'text-[30px] sm:text-[34px] md:text-[40px] lg:text-[44px]',
    h2: 'text-[25px] sm:text-[28px] md:text-[34px] lg:text-[36px]',
    h3: 'text-[21px] sm:text-[24px] md:text-[27px]'
  },
  lg: {
    body: 'text-[22px] sm:text-[24px] md:text-[26px] lg:text-[27px] leading-[1.82] tracking-[-0.01em]',
    quote: 'text-[23px] sm:text-[26px] md:text-[29px]',
    h1: 'text-[34px] sm:text-[38px] md:text-[46px] lg:text-[50px]',
    h2: 'text-[28px] sm:text-[32px] md:text-[38px] lg:text-[40px]',
    h3: 'text-[23px] sm:text-[27px] md:text-[30px]'
  },
  xl: {
    body: 'text-[24px] sm:text-[27px] md:text-[29px] lg:text-[30px] leading-[1.88] tracking-[-0.01em]',
    quote: 'text-[26px] sm:text-[29px] md:text-[33px]',
    h1: 'text-[38px] sm:text-[44px] md:text-[52px] lg:text-[56px]',
    h2: 'text-[32px] sm:text-[36px] md:text-[42px] lg:text-[46px]',
    h3: 'text-[26px] sm:text-[30px] md:text-[34px]'
  }
};

/**
 * Renders structured educational text with refined book typography,
 * generous paragraph rhythm, and left-aligned reading-first typography.
 */
export const FormattedLessonText: React.FC<{
  text: string;
  className?: string;
  textScale?: TextScale;
}> = ({
  text,
  className = '',
  textScale = 'md'
}) => {
  if (!text || !text.trim()) return null;

  const scale = TEXT_SCALE_CLASSES[textScale] || TEXT_SCALE_CLASSES.md;

  // Split into raw lines and normalize line breaks
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const elements: React.ReactNode[] = [];
  let currentParagraphLines: string[] = [];
  let currentListItems: string[] = [];
  let isNumberedList = false;

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join(' ').trim();
      if (paragraphText) {
        elements.push(
          <p
            key={`p-${elements.length}`}
            className={`${scale.body} font-normal text-current antialiased my-5 sm:my-6 first:mt-0 last:mb-0 text-left selection:bg-amber-200/60 selection:text-slate-950`}
          >
            {formatInlineText(paragraphText)}
          </p>
        );
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className={`list-decimal pl-6 sm:pl-8 space-y-2.5 sm:space-y-3.5 ${scale.body} font-normal text-current my-5 sm:my-7 text-left`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="pl-1.5">{formatInlineText(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className={`list-disc pl-6 sm:pl-8 space-y-2.5 sm:space-y-3.5 ${scale.body} font-normal text-current my-5 sm:my-7 text-left`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="pl-1.5">{formatInlineText(item)}</li>
            ))}
          </ul>
        );
      }
      currentListItems = [];
      isNumberedList = false;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Empty line indicates paragraph break
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Section ornament / divider: *** or --- or ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      flushList();
      elements.push(
        <div key={`div-${elements.length}`} className="flex items-center justify-center gap-3 my-8 sm:my-12 text-stone-300 dark:text-stone-700 select-none">
          <span className="w-12 h-px bg-stone-300/80 dark:bg-stone-700/80" />
          <span className="text-xs">✦</span>
          <span className="w-12 h-px bg-stone-300/80 dark:bg-stone-700/80" />
        </div>
      );
      continue;
    }

    // Heading 3: ### Heading
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className={`${scale.h3} font-bold text-current tracking-tight pt-5 pb-1.5 text-left`}>
          {formatInlineText(line.slice(4))}
        </h4>
      );
      continue;
    }

    // Heading 2: ## Heading
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className={`${scale.h2} font-bold text-current tracking-tight pt-7 pb-2 text-left`}>
          {formatInlineText(line.slice(3))}
        </h3>
      );
      continue;
    }

    // Heading 1: # Heading
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className={`${scale.h1} font-bold text-current tracking-tight pt-9 pb-3 text-left`}>
          {formatInlineText(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote / Pull Quote: > Quote
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className={`border-l-2 sm:border-l-3 border-[#026fc3]/80 pl-5 sm:pl-7 my-6 sm:my-8 italic ${scale.quote} font-serif leading-relaxed text-current/90 text-left`}
        >
          {formatInlineText(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Bullet List item: - or * or •
    if (/^[-*•]\s+/.test(line)) {
      flushParagraph();
      if (isNumberedList) flushList();
      currentListItems.push(line.replace(/^[-*•]\s+/, ''));
      continue;
    }

    // Numbered List item: 1. or 2.
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (!isNumberedList && currentListItems.length > 0) flushList();
      isNumberedList = true;
      currentListItems.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // Normal paragraph line
    flushList();
    currentParagraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div className={`text-current text-left w-full max-w-full ${className}`}>
      {elements}
    </div>
  );
};
