// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CANVA-STYLE INLINE RICH-TEXT EDITOR
// In-place, smooth formatting with floating contextual toolbar.
// Operates directly on selections without layout jumping, re-mounting,
// or cursor loss. Enforces WCAG contrast validation on colors.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Type,
  Link,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import {
  evaluateContrast,
  SAFE_TEXT_COLORS,
  SAFE_HIGHLIGHT_COLORS,
  getSurfaceDefaultTextColor
} from '@/utils/contrastValidator';

interface CanvaInlineTextEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  surfaceBgColor?: string; // Hex of surface to validate contrast against
  className?: string;
}

export const CanvaInlineTextEditor: React.FC<CanvaInlineTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type lesson content...',
  surfaceBgColor = '#ffffff',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);

  // Active formatting state
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    align: 'left',
    fontName: 'sans-serif',
    fontSize: '14px'
  });

  // Keep internal HTML synchronized with value prop initially or on external change
  useEffect(() => {
    if (editorRef.current) {
      // If editor is not currently focused or empty, sync content
      const currentHtml = editorRef.current.innerHTML;
      if (document.activeElement !== editorRef.current && currentHtml !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // Update active format indicators based on current DOM selection
  const updateActiveFormats = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        align: document.queryCommandState('justifyCenter')
          ? 'center'
          : document.queryCommandState('justifyRight')
          ? 'right'
          : document.queryCommandState('justifyFull')
          ? 'justify'
          : 'left',
        fontName: document.queryCommandValue('fontName') || 'sans-serif',
        fontSize: document.queryCommandValue('fontSize') || '14px'
      });
    } catch {
      // queryCommandState might fail on edge browsers
    }
  }, []);

  // Position contextual toolbar above the active selection
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current) {
      setShowToolbar(false);
      setShowColorPicker(false);
      setShowHighlightPicker(false);
      setShowHeadingMenu(false);
      setShowFontMenu(false);
      return;
    }

    // Ensure selection is inside this editor
    if (!editorRef.current.contains(selection.anchorNode)) {
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    // Position above selection relative to editor
    const top = Math.max(10, rect.top - editorRect.top - 46);
    const left = Math.max(10, Math.min(editorRect.width - 340, rect.left - editorRect.left));

    setToolbarPosition({ top, left });
    setShowToolbar(true);
    updateActiveFormats();
  }, [updateActiveFormats]);

  // Execute formatting command without dropping selection or jumping
  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    updateActiveFormats();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleApplyColor = (colorHex: string) => {
    const contrast = evaluateContrast(colorHex, surfaceBgColor);
    if (!contrast.isNormalTextAccessible) {
      setContrastWarning(`Low contrast (${contrast.ratio}:1). Consider ${contrast.recommendedColor}.`);
      setTimeout(() => setContrastWarning(null), 4000);
    } else {
      setContrastWarning(null);
    }

    execFormat('foreColor', colorHex);
    setShowColorPicker(false);
  };

  const handleApplyHighlight = (colorHex: string) => {
    if (colorHex === 'transparent') {
      execFormat('removeFormat');
    } else {
      execFormat('hiliteColor', colorHex);
    }
    setShowHighlightPicker(false);
  };

  const handleApplyHeading = (tag: string) => {
    execFormat('formatBlock', tag);
    setShowHeadingMenu(false);
  };

  const handleApplyFont = (fontFamily: string) => {
    execFormat('fontName', fontFamily);
    setShowFontMenu(false);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter web link URL (https://...):');
    if (url) {
      execFormat('createLink', url);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    if (html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Clean out hardcoded inline styles that cause contrast failures
        const elements = doc.body.querySelectorAll('*');
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.removeProperty('color');
            el.style.removeProperty('background-color');
            el.style.removeProperty('background');
            el.style.removeProperty('font-family');
          }
        });
        const cleanHtml = doc.body.innerHTML;
        document.execCommand('insertHTML', false, cleanHtml);
      } catch {
        document.execCommand('insertText', false, text);
      }
    } else if (text) {
      document.execCommand('insertText', false, text);
    }

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const defaultTextColor = getSurfaceDefaultTextColor(surfaceBgColor);

  return (
    <div className={`relative w-full group/editor ${className}`}>
      {/* ------------------------------------------------------------------- */}
      {/* CANVA CONTEXTUAL FLOATING TOOLBAR                                   */}
      {/* ------------------------------------------------------------------- */}
      {showToolbar && (
        <div
          style={{ top: `${toolbarPosition.top}px`, left: `${toolbarPosition.left}px` }}
          className="absolute z-40 flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 font-sans"
          onMouseDown={e => e.preventDefault()} // CRITICAL: prevents blur & retains selection!
        >
          {/* Headings Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHeadingMenu(!showHeadingMenu);
                setShowFontMenu(false);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Heading Style"
            >
              <Type className="w-3.5 h-3.5 text-[#026fc3]" />
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showHeadingMenu && (
              <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-50">
                <button
                  type="button"
                  onClick={() => handleApplyHeading('h2')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-black hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyHeading('h3')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyHeading('h4')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Heading 3
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyHeading('p')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-normal hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Paragraph
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Font Family */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFontMenu(!showFontMenu);
                setShowHeadingMenu(false);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className="px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Font Family"
            >
              <span>Font</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showFontMenu && (
              <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-50">
                <button
                  type="button"
                  onClick={() => handleApplyFont('sans-serif')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-sans hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Modern Sans
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFont('Georgia, serif')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-serif hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Classic Serif
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFont('monospace')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-mono hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  Code Mono
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Font Size A- / A+ */}
          <button
            type="button"
            onClick={() => execFormat('fontSize', '2')}
            className="px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Smaller text"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => execFormat('fontSize', '4')}
            className="px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Larger text"
          >
            A+
          </button>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Inline Toggles: B, I, U, S */}
          <button
            type="button"
            onClick={() => execFormat('bold')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.bold ? 'bg-[#026fc3] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('italic')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.italic ? 'bg-[#026fc3] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('underline')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.underline ? 'bg-[#026fc3] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('strikeThrough')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.strikeThrough ? 'bg-[#026fc3] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => execFormat('justifyLeft')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.align === 'left' ? 'text-[#026fc3]' : 'text-slate-500 hover:bg-stone-100'
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('justifyCenter')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.align === 'center' ? 'text-[#026fc3]' : 'text-slate-500 hover:bg-stone-100'
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('justifyRight')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.align === 'right' ? 'text-[#026fc3]' : 'text-slate-500 hover:bg-stone-100'
            }`}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('justifyFull')}
            className={`p-1 rounded-md cursor-pointer ${
              activeFormats.align === 'justify' ? 'text-[#026fc3]' : 'text-slate-500 hover:bg-stone-100'
            }`}
            title="Justify"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Text Color Picker with Contrast Validation */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
                setShowHeadingMenu(false);
                setShowFontMenu(false);
              }}
              className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
              title="Text Color (WCAG Verified)"
            >
              <Palette className="w-3.5 h-3.5 text-amber-500" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl w-48 space-y-1.5 z-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Accessible Colors
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {SAFE_TEXT_COLORS.map(c => {
                    const isAcc = evaluateContrast(c.hex, surfaceBgColor).isNormalTextAccessible;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleApplyColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-lg border border-black/10 cursor-pointer relative flex items-center justify-center transition-transform hover:scale-110 ${
                          !isAcc ? 'opacity-40' : ''
                        }`}
                        title={`${c.name} (${c.hex})`}
                      >
                        {!isAcc && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
                setShowHeadingMenu(false);
                setShowFontMenu(false);
              }}
              className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Highlight Background Color"
            >
              <Highlighter className="w-3.5 h-3.5 text-emerald-500" />
            </button>

            {showHighlightPicker && (
              <div className="absolute left-0 top-full mt-1 p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl w-48 space-y-1.5 z-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Highlight Shades
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {SAFE_HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleApplyHighlight(c.hex)}
                      style={{ backgroundColor: c.hex === 'transparent' ? '#ffffff' : c.hex }}
                      className="w-7 h-7 rounded-lg border border-stone-300 cursor-pointer text-[10px] font-bold text-slate-700 flex items-center justify-center transition-transform hover:scale-110"
                      title={c.name}
                    >
                      {c.hex === 'transparent' && '✕'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-stone-200 dark:bg-slate-700 my-auto" />

          {/* Link, Undo, Redo, Clear */}
          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            title="Insert Link"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('undo')}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('redo')}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execFormat('removeFormat')}
            className="p-1 rounded-md text-slate-500 hover:text-rose-600 cursor-pointer"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contrast Warning Toast */}
      {contrastWarning && (
        <div className="absolute top-0 right-0 -translate-y-8 z-50 bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 animate-in fade-in duration-150">
          <AlertTriangle className="w-3 h-3 text-amber-200 shrink-0" />
          <span>{contrastWarning}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* IN-PLACE CONTENTEDITABLE SURFACE                                    */}
      {/* ------------------------------------------------------------------- */}
      <style>{`
        .canva-editor-surface h1, .canva-editor-surface h2, .canva-editor-surface h3, .canva-editor-surface h4 {
          font-weight: 800;
          color: inherit;
          margin-top: 0.5rem;
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }
        .canva-editor-surface h1 { font-size: 1.4rem; }
        .canva-editor-surface h2 { font-size: 1.25rem; }
        .canva-editor-surface h3 { font-size: 1.1rem; }
        .canva-editor-surface h4 { font-size: 1.0rem; }
        .canva-editor-surface p { margin-bottom: 0.5rem; }
        .canva-editor-surface a { color: #026fc3; text-decoration: underline; font-weight: 600; }
        .canva-editor-surface ul { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.5rem; }
        .canva-editor-surface ol { list-style-type: decimal; margin-left: 1.25rem; margin-bottom: 0.5rem; }
        .canva-editor-surface li { margin-bottom: 0.2rem; }
        .canva-editor-surface blockquote { border-left: 3px solid #026fc3; padding-left: 0.75rem; font-style: italic; margin-bottom: 0.5rem; }
        .canva-editor-surface b, .canva-editor-surface strong { font-weight: 700; color: inherit; }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onBlur={() => {
          // Delay hiding toolbar so clicks on buttons register
          setTimeout(() => {
            if (!editorRef.current?.contains(document.activeElement)) {
              setShowToolbar(false);
            }
          }, 200);
        }}
        data-placeholder={placeholder}
        style={{
          backgroundColor: surfaceBgColor || 'transparent',
          color: defaultTextColor,
          caretColor: '#026fc3'
        }}
        className="canva-editor-surface w-full min-h-[90px] p-3 focus:outline-none rounded-xl leading-relaxed transition-all font-sans border border-stone-200/50 dark:border-slate-700/50 focus:border-[#026fc3] focus:ring-2 focus:ring-[#026fc3]/20 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none text-left selection:bg-sky-500/25 selection:text-current"
      />
    </div>
  );
};
