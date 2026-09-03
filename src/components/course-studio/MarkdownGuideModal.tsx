// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: BEGINNER-FRIENDLY MARKDOWN & IMAGE GUIDE
// Visual cheat sheet for Teachers inside Course Studio.
// Non-navigating, accessible modal with live examples for Headings,
// Bold/Italic, Lists, Tables, Quotes, Code, and Markdown Images.
// ============================================================================

import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  Heading,
  Bold,
  List,
  Table,
  Quote,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface MarkdownGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkdownGuideModal: React.FC<MarkdownGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      title: 'Headings',
      icon: Heading,
      description: 'Organize your lesson into sections and subtopics using hash symbols.',
      markdown: `# Main Topic (H1)\n## Subtopic (H2)\n### Detail Section (H3)`
    },
    {
      title: 'Text Emphasis',
      icon: Bold,
      description: 'Highlight key vocabulary and concepts.',
      markdown: `**Bold text** for keywords\n*Italic text* for emphasis\n***Bold & Italic*** for strong emphasis\n~~Strikethrough~~ for corrections\n\`code / keyword\` for technical terms`
    },
    {
      title: 'Lists (Bullet & Numbered)',
      icon: List,
      description: 'Present step-by-step instructions or vocabulary points.',
      markdown: `- First key takeaway\n- Second key takeaway\n  - Nested sub-point\n\n1. Say your name.\n2. Say where you are from.\n3. Say what you do.`
    },
    {
      title: 'Vocabulary & Comparison Tables',
      icon: Table,
      description: 'Create clean, responsive vocabulary or grammar tables.',
      markdown: `| Word | Meaning |\n|---|---|\n| hello | a greeting |\n| teacher | a person who teaches |\n| student | a person who studies |`
    },
    {
      title: 'Images inside Markdown',
      icon: ImageIcon,
      description: 'Embed educational images directly in your reading text using Markdown image syntax.',
      markdown: `![Students learning English](https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80)\n\nPractice introducing yourself to your partner.`
    },
    {
      title: 'Callout Notes & Quotes',
      icon: Quote,
      description: 'Highlight important rules, teacher notes, or study tips.',
      markdown: `> **Tip:** Try to speak aloud without reading directly from the notes.`
    },
    {
      title: 'Section Dividers',
      icon: Sparkles,
      description: 'Separate distinct lesson parts with horizontal rules.',
      markdown: `Topic Introduction\n\n---\n\nPractice Activities`
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="markdown-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#026fc3]/10 text-[#026fc3]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="markdown-guide-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Markdown & Formatting Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quick formatting cheatsheet for lesson content and images
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Markdown Guide"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-xs leading-relaxed text-sky-900 dark:text-sky-200">
            <strong>Pro Tip:</strong> You can paste standard Markdown directly into the lesson editor. Tables, lists, headings, and images will automatically be formatted into digital textbook reading pages in the preview.
          </div>

          <div className="space-y-5">
            {sections.map((section, idx) => {
              const IconComp = section.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/40 dark:bg-slate-900/40 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-100/60 dark:bg-slate-800/60 border-b border-stone-200/60 dark:border-slate-800">
                    <IconComp className="w-4 h-4 text-[#026fc3]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {section.title}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {section.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Markdown Input Code */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          You Type:
                        </div>
                        <pre className="p-2.5 rounded-lg bg-slate-900 text-sky-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
                          {section.markdown}
                        </pre>
                      </div>

                      {/* Live Rendered Output */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Preview:
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-800 text-xs">
                          <MarkdownRenderer content={section.markdown} textScale="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
