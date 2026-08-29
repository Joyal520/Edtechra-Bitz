// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE TEXT FORMATTING UTILITY
// High-readability typography parser for 14px educational textbook layouts.
// Handles paragraphs, bold, italic, headings, lists, quotes, and clean pasting.
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
        <strong key={index} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-stone-100 text-[#026fc3] font-mono text-[13px] font-semibold border border-stone-200/60"
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
            className="text-[#026fc3] hover:underline font-semibold underline-offset-2"
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

/**
 * Renders structured educational text with 14px body typography,
 * comfortable line-height (1.75), paragraph spacing, and lists.
 */
export const FormattedLessonText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = ''
}) => {
  if (!text || !text.trim()) return null;

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
          <p key={`p-${elements.length}`} className="text-[14px] leading-[1.75] text-slate-800 font-normal">
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
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1.5 text-[14px] leading-[1.75] text-slate-800">
            {currentListItems.map((item, idx) => (
              <li key={idx}>{formatInlineText(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1.5 text-[14px] leading-[1.75] text-slate-800">
            {currentListItems.map((item, idx) => (
              <li key={idx}>{formatInlineText(item)}</li>
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

    // Heading 3: ### Heading
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-[16px] sm:text-[17px] font-extrabold text-slate-900 tracking-tight pt-2 pb-1">
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
        <h3 key={`h3-${elements.length}`} className="text-[18px] sm:text-[19px] font-black text-slate-900 tracking-tight pt-3 pb-1 border-b border-stone-200/60">
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
        <h2 key={`h2-${elements.length}`} className="text-[20px] sm:text-[22px] font-black text-slate-900 tracking-tight pt-4 pb-1.5 border-b border-stone-200">
          {formatInlineText(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote: > Quote
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="border-l-3 border-[#026fc3] pl-4 py-1 italic text-[14px] leading-[1.75] text-slate-700 bg-sky-50/40 rounded-r-xl"
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
    <div className={`space-y-3.5 text-[14px] text-slate-800 ${className}`}>
      {elements}
    </div>
  );
};
