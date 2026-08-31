// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIGITAL TEXTBOOK TYPOGRAPHY UTILITY
// Premium Reading-First Typography (Digital Textbook & Editorial standard).
// Strict 14px Body Text with 1.75 line-height and left-alignment.
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

export type TextScale = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const TEXT_SCALE_CLASSES: Record<TextScale, { body: string; quote: string; h1: string; h2: string; h3: string }> = {
  sm: {
    body: 'leading-[1.7]',
    quote: '',
    h1: '',
    h2: '',
    h3: ''
  },
  md: {
    body: 'leading-[1.75] tracking-normal',
    quote: '',
    h1: '',
    h2: '',
    h3: ''
  },
  lg: {
    body: 'leading-[1.8] tracking-normal',
    quote: '',
    h1: '',
    h2: '',
    h3: ''
  },
  xl: {
    body: 'leading-[1.85] tracking-normal',
    quote: '',
    h1: '',
    h2: '',
    h3: ''
  },
  xxl: {
    body: 'leading-[1.9] tracking-normal',
    quote: '',
    h1: '',
    h2: '',
    h3: ''
  }
};

/**
 * Renders structured educational text with 14px body typography,
 * comfortable line-height (1.75), left-alignment, and paragraph rhythm.
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
            className={`${scale.body} reader-body font-normal text-current antialiased my-4 sm:my-5 first:mt-0 last:mb-0 text-left selection:bg-sky-100 selection:text-slate-950`}
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
          <ol key={`ol-${elements.length}`} className={`list-decimal pl-6 sm:pl-7 space-y-2 ${scale.body} reader-body font-normal text-current my-4 sm:my-5 text-left`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="pl-1">{formatInlineText(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className={`list-disc pl-6 sm:pl-7 space-y-2 ${scale.body} reader-body font-normal text-current my-4 sm:my-5 text-left`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="pl-1">{formatInlineText(item)}</li>
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
        <div key={`div-${elements.length}`} className="flex items-center justify-center gap-3 my-6 sm:my-8 text-sky-200 dark:text-slate-700 select-none">
          <span className="w-12 h-px bg-sky-200/80 dark:bg-slate-700/80" />
          <span className="text-xs text-[#026fc3]">✦</span>
          <span className="w-12 h-px bg-sky-200/80 dark:bg-slate-700/80" />
        </div>
      );
      continue;
    }

    // Heading 3: ### Heading
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className={`${scale.h3} reader-h3 font-bold text-current tracking-tight pt-4 pb-1 text-left`}>
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
        <h3 key={`h3-${elements.length}`} className={`${scale.h2} reader-h2 font-bold text-current tracking-tight pt-5 pb-1.5 text-left`}>
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
        <h2 key={`h2-${elements.length}`} className={`${scale.h1} reader-h1 font-bold text-current tracking-tight pt-6 pb-2 text-left`}>
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
          className={`border-l-3 border-[#026fc3] pl-4 sm:pl-5 my-4 sm:my-6 italic ${scale.quote} reader-quote font-serif leading-relaxed text-current/90 text-left bg-[#026fc3]/5 py-2 pr-3 rounded-r-xl`}
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
