// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ROBUST GFM MARKDOWN & CONTENT RENDERER
// High-fidelity Markdown rendering for Lesson Content & Course Studio.
// Supports Headings (H1-H4), Bold, Italic, Strikethrough, Code, Blockquotes,
// Nested Lists, GFM Responsive Tables, Markdown Images with Alt Text,
// and strict XSS / URL sanitization.
// ============================================================================

import React from 'react';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  textScale?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

/**
 * Sanitizes URLs to prevent XSS via javascript:, vbscript:, or malicious data URIs.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Allow safe protocols and relative paths
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|mailto:|tel:|#)/i.test(trimmed)) {
    return trimmed;
  }

  // Block dangerous schemes
  if (/^(javascript:|vbscript:|data:)/i.test(trimmed)) {
    return '#';
  }

  // Fallback for standard domain names missing https://
  if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Parses inline Markdown tokens (bold, italic, strikethrough, code, links, images).
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match: images (![alt](url)), links ([label](url)), bold-italic (***text***),
  // bold (**text** or __text__), italic (*text* or _text_), strikethrough (~~text~~), inline code (`code`), underline (<u>text</u>)
  const inlineRegex = /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)|(?:\*\*\*|___).*?(?:\*\*\*|___)|(?:\*\*|__).*?(?:\*\*|__)|(?:(?<!\w)\*(?!\s).*?(?<!\s)\*(?!\w)|(?<!\w)_(?!\s).*?(?<!\s)_(?!\w))|~~.*?~~|`.*?`|<u>.*?<\/u>)/g;

  const tokens = text.split(inlineRegex);

  return tokens.map((token, index) => {
    if (!token) return null;

    // 1. Markdown Image: ![Alt Description](IMAGE_URL)
    if (token.startsWith('![') && token.includes('](') && token.endsWith(')')) {
      const match = token.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const [, altText, rawUrl] = match;
        const safeSrc = sanitizeUrl(rawUrl);
        if (!safeSrc || safeSrc === '#') return null;

        return (
          <figure key={`inline-img-${index}`} className="w-full my-5 sm:my-7 text-center clear-both">
            <div className="inline-block max-w-full rounded-xl sm:rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 shadow-2xs">
              <img
                src={safeSrc}
                alt={altText || 'Lesson visual material'}
                className="max-w-full h-auto object-contain max-h-[480px] block mx-auto"
                loading="lazy"
              />
            </div>
            {altText && (
              <figcaption className="text-xs text-center mt-2 italic opacity-75 font-serif reader-caption">
                {altText}
              </figcaption>
            )}
          </figure>
        );
      }
    }

    // 2. Link: [Label](URL)
    if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const match = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const [, label, rawUrl] = match;
        const safeHref = sanitizeUrl(rawUrl);
        return (
          <a
            key={`link-${index}`}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#026fc3] hover:underline font-semibold underline-offset-4 transition-colors"
          >
            {parseInlineMarkdown(label)}
          </a>
        );
      }
    }

    // 3. Bold + Italic: ***text*** or ___text___
    if (
      (token.startsWith('***') && token.endsWith('***') && token.length >= 6) ||
      (token.startsWith('___') && token.endsWith('___') && token.length >= 6)
    ) {
      return (
        <strong key={`bi-${index}`} className="font-bold italic text-inherit">
          {parseInlineMarkdown(token.slice(3, -3))}
        </strong>
      );
    }

    // 4. Bold: **text** or __text__
    if (
      (token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
      (token.startsWith('__') && token.endsWith('__') && token.length >= 4)
    ) {
      return (
        <strong key={`b-${index}`} className="font-bold text-inherit tracking-tight">
          {parseInlineMarkdown(token.slice(2, -2))}
        </strong>
      );
    }

    // 5. Italic: *text* or _text_
    if (
      (token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
      (token.startsWith('_') && token.endsWith('_') && token.length >= 2)
    ) {
      return (
        <em key={`i-${index}`} className="italic text-inherit">
          {parseInlineMarkdown(token.slice(1, -1))}
        </em>
      );
    }

    // 6. Strikethrough: ~~text~~
    if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
      return (
        <del key={`del-${index}`} className="line-through opacity-75">
          {parseInlineMarkdown(token.slice(2, -2))}
        </del>
      );
    }

    // 7. Inline Code: `code`
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={`code-${index}`}
          className="px-1.5 py-0.5 rounded-md bg-sky-50/80 dark:bg-slate-800 text-[#026fc3] font-mono text-[0.9em] font-semibold border border-sky-100 dark:border-slate-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    // 8. Underline: <u>text</u>
    if (token.startsWith('<u>') && token.endsWith('</u>') && token.length >= 7) {
      return (
        <u key={`u-${index}`} className="underline underline-offset-2 text-inherit">
          {parseInlineMarkdown(token.slice(3, -4))}
        </u>
      );
    }

    // 9. Plain Text node: Clean any residual raw HTML wrapper tags (<div>, <span>, etc.) so raw tags never print as visible text
    const cleanTokenText = token.replace(/<\/?[a-zA-Z][^>]*>/g, '').replace(/&nbsp;/g, ' ');
    if (!cleanTokenText) return null;

    return <React.Fragment key={`txt-${index}`}>{cleanTokenText}</React.Fragment>;
  });
}

/**
 * Checks if a line is a GFM table delimiter (e.g., |---|---| or |:---|:---:|---:|)
 */
function isTableDelimiterLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  // Strip leading and trailing pipes
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '').trim();
  const cells = inner.split('|');
  if (cells.length === 0) return false;
  return cells.every(c => /^(\s*:?-{2,}:?\s*)$/.test(c));
}

/**
 * Parses table delimiter alignments.
 */
function parseTableAlignments(delimiterLine: string): Array<'left' | 'center' | 'right'> {
  const inner = delimiterLine.trim().replace(/^\|/, '').replace(/\|$/, '').trim();
  const cells = inner.split('|');
  return cells.map(c => {
    const cell = c.trim();
    const startColon = cell.startsWith(':');
    const endColon = cell.endsWith(':');
    if (startColon && endColon) return 'center';
    if (endColon) return 'right';
    return 'left';
  });
}

/**
 * Splits a table line into column cell strings.
 */
function splitTableRow(rowLine: string): string[] {
  let line = rowLine.trim();
  if (line.startsWith('|')) line = line.slice(1);
  if (line.endsWith('|')) line = line.slice(0, -1);
  return line.split('|').map(c => c.trim());
}

/**
 * Scale class definitions for responsive reader typography.
 */
export const SCALE_TYPOGRAPHY = {
  sm: {
    body: 'text-[13.5px] leading-[1.7]',
    h1: 'text-[22px] sm:text-[24px]',
    h2: 'text-[18px] sm:text-[20px]',
    h3: 'text-[15.5px] sm:text-[17px]',
    h4: 'text-[14px] sm:text-[15px]',
    table: 'text-[12.5px]'
  },
  md: {
    body: 'text-[14px] sm:text-[14.5px] leading-[1.75]',
    h1: 'text-[24px] sm:text-[28px]',
    h2: 'text-[20px] sm:text-[22px]',
    h3: 'text-[17px] sm:text-[18.5px]',
    h4: 'text-[15px] sm:text-[16px]',
    table: 'text-[13.5px]'
  },
  lg: {
    body: 'text-[15px] sm:text-[16px] leading-[1.8]',
    h1: 'text-[26px] sm:text-[30px]',
    h2: 'text-[22px] sm:text-[24px]',
    h3: 'text-[18.5px] sm:text-[20px]',
    h4: 'text-[16px] sm:text-[17px]',
    table: 'text-[14.5px]'
  },
  xl: {
    body: 'text-[16.5px] sm:text-[17.5px] leading-[1.85]',
    h1: 'text-[28px] sm:text-[32px]',
    h2: 'text-[24px] sm:text-[26px]',
    h3: 'text-[20px] sm:text-[22px]',
    h4: 'text-[17.5px] sm:text-[18.5px]',
    table: 'text-[15.5px]'
  },
  xxl: {
    body: 'text-[18px] sm:text-[19px] leading-[1.9]',
    h1: 'text-[30px] sm:text-[36px]',
    h2: 'text-[26px] sm:text-[28px]',
    h3: 'text-[22px] sm:text-[24px]',
    h4: 'text-[19px] sm:text-[20px]',
    table: 'text-[16.5px]'
  }
};

/**
 * Comprehensive Markdown Renderer with GFM Tables, Markdown Images, and strict XSS protection.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content = '',
  className = '',
  textScale = 'md'
}) => {
  if (!content || !content.trim()) return null;

  const scale = SCALE_TYPOGRAPHY[textScale] || SCALE_TYPOGRAPHY.md;
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    // 1. Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // 2. Section divider / Horizontal Rule: --- or *** or ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line)) {
      elements.push(
        <div key={`hr-${elements.length}`} className="flex items-center justify-center gap-3 my-6 sm:my-8 text-sky-200 dark:text-slate-700 select-none">
          <span className="w-12 h-px bg-sky-200/80 dark:bg-slate-700/80" />
          <span className="text-xs text-[#026fc3]">✦</span>
          <span className="w-12 h-px bg-sky-200/80 dark:bg-slate-700/80" />
        </div>
      );
      i++;
      continue;
    }

    // 3. Fenced Code Block: ```lang ... ```
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }

      elements.push(
        <div key={`codeblock-${elements.length}`} className="w-full my-4 sm:my-6 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
          <pre className="p-4 text-xs sm:text-sm font-mono text-slate-100 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 4. Standalone Markdown Image on its own line: ![Alt text](IMAGE_URL)
    if (line.startsWith('![') && line.includes('](') && line.endsWith(')')) {
      const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const [, altText, rawUrl] = match;
        const safeSrc = sanitizeUrl(rawUrl);
        if (safeSrc && safeSrc !== '#') {
          elements.push(
            <figure key={`img-${elements.length}`} className="w-full my-5 sm:my-7 text-center clear-both">
              <div className="inline-block max-w-full rounded-xl sm:rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 shadow-2xs">
                <img
                  src={safeSrc}
                  alt={altText || 'Lesson visual material'}
                  className="max-w-full h-auto object-contain max-h-[480px] block mx-auto"
                  loading="lazy"
                />
              </div>
              {altText && (
                <figcaption className="text-xs text-center mt-2 italic opacity-75 font-serif reader-caption">
                  {altText}
                </figcaption>
              )}
            </figure>
          );
        }
        i++;
        continue;
      }
    }

    // 5. GFM Markdown Table: | Col 1 | Col 2 | followed by delimiter line
    if (line.includes('|') && i + 1 < rawLines.length && isTableDelimiterLine(rawLines[i + 1])) {
      const headerLine = line;
      const delimiterLine = rawLines[i + 1];
      const alignments = parseTableAlignments(delimiterLine);
      const headers = splitTableRow(headerLine);

      i += 2; // Move past header and delimiter

      const rows: string[][] = [];
      while (i < rawLines.length && rawLines[i].trim().includes('|') && !isTableDelimiterLine(rawLines[i])) {
        rows.push(splitTableRow(rawLines[i]));
        i++;
      }

      elements.push(
        <div
          key={`table-${elements.length}`}
          className="w-full overflow-x-auto my-5 sm:my-7 rounded-xl border border-stone-200 dark:border-slate-700/80 shadow-2xs bg-white/40 dark:bg-slate-900/40"
        >
          <table className={`w-full min-w-[340px] text-left border-collapse ${scale.table}`}>
            <thead>
              <tr className="bg-sky-50/60 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700">
                {headers.map((h, hIdx) => {
                  const align = alignments[hIdx] || 'left';
                  const alignClass =
                    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                  return (
                    <th
                      key={hIdx}
                      className={`px-3.5 sm:px-4 py-2.5 font-bold tracking-tight text-inherit ${alignClass} border-r last:border-r-0 border-stone-200/60 dark:border-slate-700/60`}
                    >
                      {parseInlineMarkdown(h)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-sky-50/30 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {headers.map((_, cIdx) => {
                    const cellVal = row[cIdx] || '';
                    const align = alignments[cIdx] || 'left';
                    const alignClass =
                      align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                    return (
                      <td
                        key={cIdx}
                        className={`px-3.5 sm:px-4 py-2 text-inherit ${alignClass} border-r last:border-r-0 border-stone-100 dark:border-slate-800/60`}
                      >
                        {parseInlineMarkdown(cellVal)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 6. Heading 4: #### Heading
    if (line.startsWith('#### ')) {
      elements.push(
        <h5
          key={`h4-${elements.length}`}
          className={`${scale.h4} reader-h4 font-bold text-current tracking-tight pt-3 pb-1 text-left`}
        >
          {parseInlineMarkdown(line.slice(5))}
        </h5>
      );
      i++;
      continue;
    }

    // 7. Heading 3: ### Heading
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${elements.length}`}
          className={`${scale.h3} reader-h3 font-bold text-current tracking-tight pt-4 pb-1 text-left`}
        >
          {parseInlineMarkdown(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    // 8. Heading 2: ## Heading
    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${elements.length}`}
          className={`${scale.h2} reader-h2 font-bold text-current tracking-tight pt-5 pb-1.5 text-left`}
        >
          {parseInlineMarkdown(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    // 9. Heading 1: # Heading
    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={`h1-${elements.length}`}
          className={`${scale.h1} reader-h1 font-bold text-current tracking-tight pt-6 pb-2 text-left`}
        >
          {parseInlineMarkdown(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // 10. Blockquote: > Quote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ''));
        i++;
      }

      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="border-l-3 border-[#026fc3] pl-4 sm:pl-5 my-4 sm:my-6 italic reader-quote font-serif leading-relaxed text-current/90 text-left bg-[#026fc3]/5 py-2.5 pr-4 rounded-r-xl"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx} className={`${scale.body} ${qIdx > 0 ? 'mt-2' : ''}`}>
              {parseInlineMarkdown(qLine)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 11. Lists: Bullet list (- or * or • or +) OR Numbered list (1. or 2.)
    const isBullet = /^[-*+•]\s+/.test(line);
    const isNumbered = /^\d+\.\s+/.test(line);

    if (isBullet || isNumbered) {
      const listType = isNumbered ? 'ol' : 'ul';
      const items: Array<{ text: string; subItems?: string[] }> = [];

      while (i < rawLines.length) {
        const currentL = rawLines[i];
        const trimmedL = currentL.trim();

        if (!trimmedL) {
          // Peek ahead to see if next line continues list
          if (
            i + 1 < rawLines.length &&
            (/^[-*+•]\s+/.test(rawLines[i + 1].trim()) || /^\d+\.\s+/.test(rawLines[i + 1].trim()))
          ) {
            i++;
            continue;
          }
          break;
        }

        const isItemBullet = /^[-*+•]\s+/.test(trimmedL);
        const isItemNum = /^\d+\.\s+/.test(trimmedL);

        // Nested sub-item (indented)
        if (currentL.startsWith('  ') || currentL.startsWith('\t')) {
          const cleanSub = trimmedL.replace(/^[-*+•\d.]\s+/, '');
          if (items.length > 0) {
            if (!items[items.length - 1].subItems) {
              items[items.length - 1].subItems = [];
            }
            items[items.length - 1].subItems!.push(cleanSub);
          } else {
            items.push({ text: cleanSub });
          }
          i++;
          continue;
        }

        // Matching main list item
        if ((listType === 'ol' && isItemNum) || (listType === 'ul' && isItemBullet)) {
          const cleanItem = trimmedL.replace(listType === 'ol' ? /^\d+\.\s+/ : /^[-*+•]\s+/, '');
          items.push({ text: cleanItem });
          i++;
          continue;
        }

        break;
      }

      if (listType === 'ol') {
        elements.push(
          <ol
            key={`ol-${elements.length}`}
            className={`list-decimal pl-6 sm:pl-7 space-y-2 ${scale.body} reader-body font-normal text-current my-4 sm:my-5 text-left`}
          >
            {items.map((item, idx) => (
              <li key={idx} className="pl-1">
                {parseInlineMarkdown(item.text)}
                {item.subItems && item.subItems.length > 0 && (
                  <ol className="list-[lower-alpha] pl-5 mt-1.5 space-y-1">
                    {item.subItems.map((sub, sIdx) => (
                      <li key={sIdx}>{parseInlineMarkdown(sub)}</li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            className={`list-disc pl-6 sm:pl-7 space-y-2 ${scale.body} reader-body font-normal text-current my-4 sm:my-5 text-left`}
          >
            {items.map((item, idx) => (
              <li key={idx} className="pl-1">
                {parseInlineMarkdown(item.text)}
                {item.subItems && item.subItems.length > 0 && (
                  <ul className="list-[circle] pl-5 mt-1.5 space-y-1">
                    {item.subItems.map((sub, sIdx) => (
                      <li key={sIdx}>{parseInlineMarkdown(sub)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        );
      }
      continue;
    }

    // 12. Standard Paragraph (collect consecutive text lines until blank line or block token)
    const paragraphLines: string[] = [];
    while (i < rawLines.length) {
      const pLine = rawLines[i].trim();
      if (!pLine) break;

      // Stop if encountered a block token
      if (
        /^(\*{3,}|-{3,}|_{3,})$/.test(pLine) ||
        pLine.startsWith('```') ||
        pLine.startsWith('#') ||
        pLine.startsWith('>') ||
        /^[-*+•]\s+/.test(pLine) ||
        /^\d+\.\s+/.test(pLine) ||
        (pLine.includes('|') && i + 1 < rawLines.length && isTableDelimiterLine(rawLines[i + 1]))
      ) {
        break;
      }

      paragraphLines.push(pLine);
      i++;
    }

    if (paragraphLines.length > 0) {
      const fullParagraph = paragraphLines.join(' ');
      elements.push(
        <p
          key={`p-${elements.length}`}
          className={`${scale.body} reader-body font-normal text-current antialiased my-4 sm:my-5 first:mt-0 last:mb-0 text-left selection:bg-sky-100 selection:text-slate-950`}
        >
          {parseInlineMarkdown(fullParagraph)}
        </p>
      );
    }
  }

  return (
    <div className={`text-current text-left w-full max-w-full space-y-2 ${className}`}>
      {elements}
    </div>
  );
};
