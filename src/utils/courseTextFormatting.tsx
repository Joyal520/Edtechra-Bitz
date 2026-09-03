// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIGITAL TEXTBOOK TYPOGRAPHY UTILITY
// Premium Reading-First Typography (Digital Textbook & Editorial standard).
// Strict 14px Body Text with 1.75 line-height and left-alignment.
// Powered by robust GFM Markdown & Image Rendering engine.
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
 * Renders structured educational text with 14px body typography,
 * comfortable line-height (1.75), left-alignment, and paragraph rhythm.
 * Supports GFM Markdown tables, Markdown images, blockquotes, lists, and headings.
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

  return (
    <MarkdownRenderer
      content={text}
      className={className}
      textScale={textScale}
    />
  );
};
