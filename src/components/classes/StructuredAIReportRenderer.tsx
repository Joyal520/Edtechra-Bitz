// ============================================================================
// EDTECHRA: STRUCTURED AI REPORT & MARKDOWN RENDERER
// Transforms raw AI markdown or unstructured text into high-readability,
// professional educational analytics cards, metric blocks, and typography.
// ============================================================================

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Lightbulb,
  ArrowRight,
  FileText,
  TrendingUp
} from 'lucide-react';

interface StructuredAIReportRendererProps {
  content?: string | null;
  className?: string;
}

/**
 * Strips raw markdown syntax characters for clean plain-text presentation
 */
export function stripMarkdown(text: string = ''): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/---+/g, '')
    .trim();
}

/**
 * Renders inline markdown (bold, italics, code, metrics) safely
 */
export const InlineMarkdown: React.FC<{ text?: string | null; className?: string }> = ({ text = '', className = '' }) => {
  if (!text) return null;

  // Split by bold (**text** or __text__), italics (*text* or _text_), code (`text`)
  const tokens = text.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`)/g);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (!token) return null;
        if ((token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
            (token.startsWith('__') && token.endsWith('__') && token.length >= 4)) {
          const inner = token.slice(2, -2);
          return (
            <strong key={idx} className="font-extrabold text-slate-900">
              {inner}
            </strong>
          );
        }
        if ((token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
            (token.startsWith('_') && token.endsWith('_') && token.length >= 2)) {
          const inner = token.slice(1, -1);
          return (
            <em key={idx} className="italic text-slate-800">
              {inner}
            </em>
          );
        }
        if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
          const inner = token.slice(1, -1);
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-xs text-indigo-700 font-bold border border-slate-200">
              {inner}
            </code>
          );
        }
        return <React.Fragment key={idx}>{token}</React.Fragment>;
      })}
    </span>
  );
};

export interface MetricItem {
  label: string;
  value: string;
}

interface SectionBlock {
  type: 'heading' | 'card' | 'list' | 'divider' | 'metrics';
  heading?: string;
  category: 'executive' | 'findings' | 'strengths' | 'weaknesses' | 'students' | 'topics' | 'actions' | 'general';
  items?: string[];
  paragraphs?: string[];
  metrics?: MetricItem[];
}

/**
 * Parses markdown report into structured educational card blocks
 */
function parseReportIntoSections(rawText: string): SectionBlock[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const blocks: SectionBlock[] = [];
  let currentBlock: SectionBlock | null = null;

  const detectCategory = (title: string): SectionBlock['category'] => {
    const t = title.toLowerCase();
    if (t.includes('executive') || t.includes('summary') || t.includes('insight') || t.includes('overview') || t.includes('class insight')) return 'executive';
    if (t.includes('key finding') || t.includes('finding') || t.includes('observation')) return 'findings';
    if (t.includes('strength') || t.includes('doing well') || t.includes('positive') || t.includes('mastery')) return 'strengths';
    if (t.includes('attention') || t.includes('growth') || t.includes('weak') || t.includes('struggl') || t.includes('gap') || t.includes('area needing')) return 'weaknesses';
    if (t.includes('student') || t.includes('learner') || t.includes('support') || t.includes('intervention')) return 'students';
    if (t.includes('topic') || t.includes('skill') || t.includes('concept') || t.includes('score') || t.includes('performance')) return 'topics';
    if (t.includes('action') || t.includes('recommend') || t.includes('next step') || t.includes('teach next') || t.includes('strategy')) return 'actions';
    return 'general';
  };

  const flushBlock = () => {
    if (currentBlock) {
      if (
        (currentBlock.paragraphs && currentBlock.paragraphs.length > 0) ||
        (currentBlock.items && currentBlock.items.length > 0) ||
        (currentBlock.metrics && currentBlock.metrics.length > 0) ||
        currentBlock.heading
      ) {
        blocks.push(currentBlock);
      }
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    // Divider: --- or *** or ===
    if (/^[-*=_]{3,}$/.test(trimmed)) {
      flushBlock();
      blocks.push({ type: 'divider', category: 'general' });
      continue;
    }

    // Heading: # or ## or ### or **Title** alone on a short line or Title: alone
    const isExplicitHeader = /^#{1,4}\s+/.test(trimmed);
    const headerMatch = trimmed.match(/^(?:#+\s*|\*\*)([^*#]+)(?:\*\*|:)?$/);
    const isUppercaseHeader = /^[A-Z\s]{4,45}:?$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes(',');

    if (isExplicitHeader || isUppercaseHeader || (headerMatch && trimmed.length < 70 && !trimmed.includes('.') && !trimmed.startsWith('-'))) {
      flushBlock();
      const headingText = stripMarkdown(trimmed.replace(/^#+\s*/, '')).replace(/:$/, '').trim();
      const cat = detectCategory(headingText);

      currentBlock = {
        type: 'card',
        heading: headingText,
        category: cat,
        items: [],
        paragraphs: [],
        metrics: []
      };
      continue;
    }

    // Metric key-value pair detection: e.g. "Average performance: 30%" or "**Events analysed:** 26"
    const metricMatch = trimmed.match(/^(?:\*\*)?([A-Za-z\s]+?)(?:\*\*)?:\s*(?:\*\*)?([0-9]+(?:\.[0-9]+)?%?|[A-Za-z0-9\s/]+)(?:\*\*)?$/);
    if (metricMatch && metricMatch[1].length < 35 && metricMatch[2].length < 30) {
      if (!currentBlock) {
        currentBlock = {
          type: 'card',
          category: 'general',
          items: [],
          paragraphs: [],
          metrics: []
        };
      }
      currentBlock.metrics = currentBlock.metrics || [];
      currentBlock.metrics.push({
        label: stripMarkdown(metricMatch[1]).trim(),
        value: stripMarkdown(metricMatch[2]).trim()
      });
      continue;
    }

    // List item: - or * or 1.
    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/) || trimmed.match(/^\d+\.\s+(.*)$/);
    if (listMatch) {
      if (!currentBlock) {
        currentBlock = {
          type: 'card',
          category: 'general',
          items: [],
          paragraphs: [],
          metrics: []
        };
      }
      currentBlock.items = currentBlock.items || [];
      currentBlock.items.push(listMatch[1]);
      continue;
    }

    // Regular paragraph
    if (!currentBlock) {
      currentBlock = {
        type: 'card',
        category: 'general',
        items: [],
        paragraphs: [],
        metrics: []
      };
    }
    currentBlock.paragraphs = currentBlock.paragraphs || [];
    currentBlock.paragraphs.push(trimmed);
  }

  flushBlock();
  return blocks;
}

export const StructuredAIReportRenderer: React.FC<StructuredAIReportRendererProps> = ({
  content,
  className = ''
}) => {
  if (!content || !content.trim()) {
    return null;
  }

  const sections = parseReportIntoSections(content);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 sm:space-y-5.5 ${className}`}>
      {sections.map((section, sIdx) => {
        if (section.type === 'divider') {
          return <hr key={sIdx} className="border-t-2 border-slate-200/80 my-3" />;
        }

        const category = section.category || 'general';

        let cardStyle = 'bg-white border-2 border-slate-200/90 shadow-2xs';
        let badgeBg = 'bg-slate-100 text-slate-800 border-slate-200';
        let badgeLabel = category.toUpperCase();
        let icon = <FileText className="w-4 h-4 text-slate-600" />;
        let headingColor = 'text-slate-900';

        if (category === 'executive') {
          cardStyle = 'bg-gradient-to-br from-sky-50/90 via-white to-sky-50/40 border-2 border-sky-200 shadow-sm';
          badgeBg = 'bg-sky-100 text-sky-900 border-sky-300';
          badgeLabel = 'Class Insight';
          icon = <Sparkles className="w-4 h-4 text-[#026fc3]" />;
          headingColor = 'text-sky-950';
        } else if (category === 'findings') {
          cardStyle = 'bg-gradient-to-br from-cyan-50/80 via-white to-cyan-50/30 border-2 border-cyan-200 shadow-sm';
          badgeBg = 'bg-cyan-100 text-cyan-900 border-cyan-300';
          badgeLabel = 'Key Findings';
          icon = <TrendingUp className="w-4 h-4 text-cyan-700" />;
          headingColor = 'text-cyan-950';
        } else if (category === 'strengths') {
          cardStyle = 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-2 border-emerald-200 shadow-sm';
          badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
          badgeLabel = 'Strengths';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
          headingColor = 'text-emerald-950';
        } else if (category === 'weaknesses') {
          cardStyle = 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border-2 border-amber-200 shadow-sm';
          badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
          badgeLabel = 'Needs Attention';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
          headingColor = 'text-amber-950';
        } else if (category === 'students') {
          cardStyle = 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20 border-2 border-rose-200 shadow-sm';
          badgeBg = 'bg-rose-100 text-rose-900 border-rose-300';
          badgeLabel = 'Student Support';
          icon = <Users className="w-4 h-4 text-rose-600" />;
          headingColor = 'text-rose-950';
        } else if (category === 'topics') {
          cardStyle = 'bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-2 border-indigo-200 shadow-sm';
          badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-300';
          badgeLabel = 'Topic Performance';
          icon = <Target className="w-4 h-4 text-indigo-600" />;
          headingColor = 'text-indigo-950';
        } else if (category === 'actions') {
          cardStyle = 'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border-2 border-blue-200 shadow-sm';
          badgeBg = 'bg-blue-100 text-blue-900 border-blue-300';
          badgeLabel = 'Recommended Action';
          icon = <Lightbulb className="w-4 h-4 text-[#026fc3]" />;
          headingColor = 'text-blue-950';
        }

        return (
          <div
            key={sIdx}
            className={`rounded-3xl p-5 sm:p-6 md:p-7 transition-all duration-200 ${cardStyle}`}
          >
            {/* Header if present */}
            {section.heading && (
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 border border-slate-200/60">
                    {icon}
                  </div>
                  <h4 className={`text-base sm:text-lg md:text-xl font-black tracking-tight ${headingColor}`}>
                    {section.heading}
                  </h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shadow-2xs ${badgeBg}`}>
                  {badgeLabel}
                </span>
              </div>
            )}

            {/* Paragraphs - Readable Typography (16-18px body, 1.6 line height) */}
            {section.paragraphs && section.paragraphs.length > 0 && (
              <div className="space-y-3">
                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-base sm:text-[16px] md:text-[17px] text-slate-800 font-medium leading-[1.65] max-w-4xl"
                  >
                    <InlineMarkdown text={p} />
                  </p>
                ))}
              </div>
            )}

            {/* Metric Blocks (e.g. Average performance: 30%, Events analysed: 26) */}
            {section.metrics && section.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-3.5 pt-1">
                {section.metrics.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-3.5 rounded-2xl bg-white/95 border-2 border-slate-200/90 shadow-2xs space-y-1"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {m.label}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Structured bullet list items */}
            {section.items && section.items.length > 0 && (
              <div className={`space-y-2.5 ${
                (section.paragraphs && section.paragraphs.length > 0) || (section.metrics && section.metrics.length > 0)
                  ? 'mt-3.5 pt-3.5 border-t border-slate-100'
                  : ''
              }`}>
                {section.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {category === 'strengths' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : category === 'actions' ? (
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                      ) : category === 'weaknesses' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : category === 'students' ? (
                        <Users className="w-4 h-4 text-rose-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      )}
                    </div>
                    <div className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed flex-1">
                      <InlineMarkdown text={item} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
