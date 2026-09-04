// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIGITAL TEXTBOOK TYPOGRAPHY & CONTENT PIPELINE
// Premium Reading-First Typography (Digital Textbook & Editorial standard).
// Strict 14px Body Text with 1.75 line-height and left-alignment.
// Canonical Pipeline: Renders formatted HTML (Canva/Rich-text), GFM Markdown,
// or Plain Text. NEVER prints raw HTML tags, CSS, or internal editor markup.
// ============================================================================

import React from 'react';
import {
  MarkdownRenderer,
  parseInlineMarkdown,
  sanitizeUrl,
  SCALE_TYPOGRAPHY
} from '@/components/common/MarkdownRenderer';

export { MarkdownRenderer, parseInlineMarkdown, sanitizeUrl, SCALE_TYPOGRAPHY };

export type TextScale = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const TEXT_SCALE_CLASSES: Record<TextScale, { body: string; quote: string; h1: string; h2: string; h3: string }> = {
  sm: {
    body: SCALE_TYPOGRAPHY.sm.body,
    quote: '',
    h1: SCALE_TYPOGRAPHY.sm.h1,
    h2: SCALE_TYPOGRAPHY.sm.h2,
    h3: SCALE_TYPOGRAPHY.sm.h3
  },
  md: {
    body: SCALE_TYPOGRAPHY.md.body,
    quote: '',
    h1: SCALE_TYPOGRAPHY.md.h1,
    h2: SCALE_TYPOGRAPHY.md.h2,
    h3: SCALE_TYPOGRAPHY.md.h3
  },
  lg: {
    body: SCALE_TYPOGRAPHY.lg.body,
    quote: '',
    h1: SCALE_TYPOGRAPHY.lg.h1,
    h2: SCALE_TYPOGRAPHY.lg.h2,
    h3: SCALE_TYPOGRAPHY.lg.h3
  },
  xl: {
    body: SCALE_TYPOGRAPHY.xl.body,
    quote: '',
    h1: SCALE_TYPOGRAPHY.xl.h1,
    h2: SCALE_TYPOGRAPHY.xl.h2,
    h3: SCALE_TYPOGRAPHY.xl.h3
  },
  xxl: {
    body: SCALE_TYPOGRAPHY.xxl.body,
    quote: '',
    h1: SCALE_TYPOGRAPHY.xxl.h1,
    h2: SCALE_TYPOGRAPHY.xxl.h2,
    h3: SCALE_TYPOGRAPHY.xxl.h3
  }
};

/**
 * Backward-compatible inline markdown parser helper.
 */
export function formatInlineText(text: string): React.ReactNode[] {
  return parseInlineMarkdown(text);
}

/**
 * Detects whether the input string contains HTML tags.
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  // Look for standard HTML opening or closing tags
  return /<\/?(p|div|span|font|b|strong|i|em|u|s|del|h[1-6]|ul|ol|li|blockquote|a|img|table|tr|td|th|br|hr|figure|figcaption)[^>]*>/i.test(content);
}

/**
 * Maps legacy <font size="1-7"> values to CSS font sizes.
 */
const FONT_SIZE_MAP: Record<string, string> = {
  '1': '0.75rem',
  '2': '0.875rem',
  '3': '1rem',
  '4': '1.125rem',
  '5': '1.375rem',
  '6': '1.75rem',
  '7': '2.25rem'
};

/**
 * Strips dangerous tags and attributes from an HTML string.
 */
export function sanitizeHtmlString(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/href\s*=\s*(['"])javascript:.*?\1/gi, 'href="#"')
    .replace(/src\s*=\s*(['"])javascript:.*?\1/gi, 'src="#"');
}

/**
 * Converts a DOM node into safe, styled React nodes.
 */
function domNodeToReact(node: Node, key: string, textScale: TextScale): React.ReactNode {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.nodeValue || '';
    if (!val) return null;
    // If text contains inline markdown tokens, parse them
    if (/(\*\*|__|\*|_|~~|`|\[.*?\]\(.*?\))/.test(val)) {
      return <React.Fragment key={key}>{parseInlineMarkdown(val)}</React.Fragment>;
    }
    return val;
  }

  // Only handle element nodes
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  // Strip disallowed elements
  const disallowed = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'applet', 'base'];
  if (disallowed.includes(tagName)) return null;

  // Process child nodes recursively
  const childNodes: React.ReactNode[] = [];
  element.childNodes.forEach((child, idx) => {
    const childKey = `${key}-${idx}`;
    const renderedChild = domNodeToReact(child, childKey, textScale);
    if (renderedChild !== null) childNodes.push(renderedChild);
  });

  // Extract safe inline styles
  const styleObj: React.CSSProperties = {};
  if (element.style) {
    if (element.style.color) styleObj.color = element.style.color;
    if (element.style.backgroundColor) styleObj.backgroundColor = element.style.backgroundColor;
    if (element.style.textAlign) styleObj.textAlign = element.style.textAlign as any;
    if (element.style.fontFamily) styleObj.fontFamily = element.style.fontFamily;
    if (element.style.fontSize) styleObj.fontSize = element.style.fontSize;
    if (element.style.fontWeight) styleObj.fontWeight = element.style.fontWeight as any;
    if (element.style.fontStyle) styleObj.fontStyle = element.style.fontStyle as any;
    if (element.style.textDecoration) styleObj.textDecoration = element.style.textDecoration;
  }

  // Handle <font> tags (legacy execCommand output)
  if (tagName === 'font') {
    const sizeAttr = element.getAttribute('size');
    const colorAttr = element.getAttribute('color');
    const faceAttr = element.getAttribute('face');

    if (sizeAttr && FONT_SIZE_MAP[sizeAttr]) {
      styleObj.fontSize = FONT_SIZE_MAP[sizeAttr];
    }
    if (colorAttr) styleObj.color = colorAttr;
    if (faceAttr) styleObj.fontFamily = faceAttr;

    return (
      <span key={key} style={styleObj} className="font-inherit">
        {childNodes}
      </span>
    );
  }

  // Basic formatting tags
  if (tagName === 'b' || tagName === 'strong') {
    return <strong key={key} style={styleObj} className="font-bold text-inherit">{childNodes}</strong>;
  }
  if (tagName === 'i' || tagName === 'em') {
    return <em key={key} style={styleObj} className="italic text-inherit">{childNodes}</em>;
  }
  if (tagName === 'u') {
    return <u key={key} style={styleObj} className="underline underline-offset-2">{childNodes}</u>;
  }
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
    return <del key={key} style={styleObj} className="line-through opacity-75">{childNodes}</del>;
  }

  // Headings
  const scale = SCALE_TYPOGRAPHY[textScale] || SCALE_TYPOGRAPHY.md;
  if (tagName === 'h1') {
    return <h2 key={key} style={styleObj} className={`${scale.h1} font-black tracking-tight pt-4 pb-1 text-inherit`}>{childNodes}</h2>;
  }
  if (tagName === 'h2') {
    return <h3 key={key} style={styleObj} className={`${scale.h2} font-bold tracking-tight pt-3.5 pb-1 text-inherit`}>{childNodes}</h3>;
  }
  if (tagName === 'h3') {
    return <h4 key={key} style={styleObj} className={`${scale.h3} font-bold tracking-tight pt-3 pb-1 text-inherit`}>{childNodes}</h4>;
  }
  if (tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
    return <h5 key={key} style={styleObj} className={`${scale.h4} font-semibold tracking-tight pt-2 pb-0.5 text-inherit`}>{childNodes}</h5>;
  }

  // Links
  if (tagName === 'a') {
    const rawHref = element.getAttribute('href') || '';
    const safeHref = sanitizeUrl(rawHref);
    return (
      <a
        key={key}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        style={styleObj}
        className="text-[#026fc3] hover:underline font-semibold underline-offset-4 transition-colors"
      >
        {childNodes}
      </a>
    );
  }

  // Images
  if (tagName === 'img') {
    const rawSrc = element.getAttribute('src') || '';
    const safeSrc = sanitizeUrl(rawSrc);
    const alt = element.getAttribute('alt') || 'Lesson visual';
    if (!safeSrc || safeSrc === '#') return null;
    return (
      <img
        key={key}
        src={safeSrc}
        alt={alt}
        loading="lazy"
        className="max-w-full h-auto object-contain rounded-xl my-3 block mx-auto shadow-2xs border border-current/10"
      />
    );
  }

  // Lists
  if (tagName === 'ul') {
    return <ul key={key} style={styleObj} className="list-disc pl-6 space-y-1 my-3 text-inherit">{childNodes}</ul>;
  }
  if (tagName === 'ol') {
    return <ol key={key} style={styleObj} className="list-decimal pl-6 space-y-1 my-3 text-inherit">{childNodes}</ol>;
  }
  if (tagName === 'li') {
    return <li key={key} style={styleObj} className="pl-1 text-inherit">{childNodes}</li>;
  }

  // Blockquotes
  if (tagName === 'blockquote') {
    return (
      <blockquote
        key={key}
        style={styleObj}
        className="border-l-3 border-[#026fc3] pl-4 italic my-4 py-2 bg-[#026fc3]/5 rounded-r-xl text-inherit"
      >
        {childNodes}
      </blockquote>
    );
  }

  // Line breaks & Horizontal Rules
  if (tagName === 'br') return <br key={key} />;
  if (tagName === 'hr') {
    return <hr key={key} className="my-6 border-current/15 w-full" />;
  }

  // Paragraphs & Div blocks
  if (tagName === 'p' || tagName === 'div') {
    // If empty with no children, return a soft spacer or null
    if (childNodes.length === 0 && !element.innerText?.trim()) {
      return null;
    }
    return (
      <div key={key} style={styleObj} className="my-2 first:mt-0 last:mb-0 leading-relaxed text-inherit">
        {childNodes}
      </div>
    );
  }

  // Spans
  if (tagName === 'span') {
    return (
      <span key={key} style={styleObj} className="text-inherit">
        {childNodes}
      </span>
    );
  }

  // Fallback for other safe tags (e.g. table, code, pre)
  return (
    <span key={key} style={styleObj} className="text-inherit">
      {childNodes}
    </span>
  );
}

/**
 * Parses and safely renders sanitized HTML content into React elements.
 */
export function renderSanitizedHtml(htmlContent: string, textScale: TextScale = 'md', className = ''): React.ReactNode {
  if (!htmlContent || !htmlContent.trim()) return null;

  const cleanHtml = sanitizeHtmlString(htmlContent.trim());
  const scale = SCALE_TYPOGRAPHY[textScale] || SCALE_TYPOGRAPHY.md;

  // In browser environments with DOMParser
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanHtml, 'text/html');
      const nodes: React.ReactNode[] = [];

      doc.body.childNodes.forEach((child, idx) => {
        const rendered = domNodeToReact(child, `html-node-${idx}`, textScale);
        if (rendered !== null) nodes.push(rendered);
      });

      return (
        <div className={`w-full max-w-full overflow-x-hidden ${scale.body} text-inherit text-left space-y-2 ${className}`}>
          {nodes}
        </div>
      );
    } catch {
      // Fallback
    }
  }

  // Non-browser fallback: strip tags cleanly
  const stripped = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return (
    <div className={`w-full max-w-full ${scale.body} text-inherit text-left ${className}`}>
      {stripped}
    </div>
  );
}

/**
 * Universal Lesson Content Renderer:
 * - Detects formatted HTML (Canva editor, rich text tags) and renders styled React nodes.
 * - Detects Markdown (headings, lists, quotes, tables) and renders via MarkdownRenderer.
 * - Never prints raw HTML tags (<div>, <span>, <font>) or raw markup as text.
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

  // 1. If content contains HTML tags, render via safe HTML pipeline
  if (isHtmlContent(text)) {
    return renderSanitizedHtml(text, textScale, className);
  }

  // 2. Otherwise render via Markdown engine
  return (
    <MarkdownRenderer
      content={text}
      className={className}
      textScale={textScale}
    />
  );
};
