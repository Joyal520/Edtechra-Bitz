import React from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { getDemoConfigForGame } from '@/services/gameLibraryService';
import type { SnakeSpellConfig } from '@/types/gameLibrary';
import { BulkContentUploader, type ParsedBulkRow } from './BulkContentUploader';

interface SnakeSpellEditorProps {
  config: SnakeSpellConfig;
  onChange: (next: SnakeSpellConfig) => void;
  onBulkImport: (rows: ParsedBulkRow[], mode: 'append' | 'replace') => void;
}

export const SnakeSpellEditor: React.FC<SnakeSpellEditorProps> = ({
  config,
  onChange,
  onBulkImport
}) => {
  const words = config.words || [];
  const missingLetters = config.missingLetters ?? 0;
  const lives = config.lives ?? 3;
  const speed = config.speed ?? 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
            Missing Letters
          </label>
          <select
            value={missingLetters}
            onChange={(e) =>
              onChange({ ...config, missingLetters: Number(e.target.value) as 0 | 1 | 2 | 3 })
            }
            className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-slate-800"
          >
            <option value={0}>Auto (grows with streak)</option>
            <option value={1}>1 missing letter</option>
            <option value={2}>2 missing letters</option>
            <option value={3}>3 missing letters</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
            Snake Lives
          </label>
          <select
            value={lives}
            onChange={(e) => onChange({ ...config, lives: Number(e.target.value) as 3 | 5 | 8 })}
            className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-slate-800"
          >
            <option value={3}>3 Lives (Standard)</option>
            <option value={5}>5 Lives (Forgiving)</option>
            <option value={8}>8 Lives (Practice)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
            Snake Speed
          </label>
          <select
            value={speed}
            onChange={(e) =>
              onChange({ ...config, speed: Number(e.target.value) as 0.8 | 1 | 1.25 })
            }
            className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-slate-800"
          >
            <option value={0.8}>Slow (0.8×)</option>
            <option value={1}>Normal (1×)</option>
            <option value={1.25}>Fast (1.25×)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Spelling Words &amp; Hints ({words.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Add words of 3–12 letters plus an optional emoji (e.g. 🪐) or short clue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkContentUploader
            gameId="snake-spell"
            existingCount={words.filter((w) => w.word.trim().length > 0).length}
            onConfirmImport={onBulkImport}
          />
          <button
            type="button"
            onClick={() => onChange({ ...config, words: [...words, { word: '', hint: '' }] })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Word
          </button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">No spelling words added yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Use <strong>Bulk Upload / Paste</strong> above or click <strong>Add Word</strong> to
              build your spelling list.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...config, words: [{ word: '', hint: '' }] })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Word
            </button>
            <button
              type="button"
              onClick={() => onChange(getDemoConfigForGame('snake-spell') as SnakeSpellConfig)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Load Demo Sample
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map((item, idx) => {
            const cleanLen = [...String(item.word || '')].filter((ch) => /\p{L}/u.test(ch)).length;
            const hasWarning = item.word.trim().length > 0 && (cleanLen < 3 || cleanLen > 12);
            return (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl border border-slate-200 bg-white">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={item.word}
                      onChange={(e) => {
                        const next = [...words];
                        next[idx] = { ...next[idx], word: e.target.value.toUpperCase() };
                        onChange({ ...config, words: next });
                      }}
                      placeholder={`Word #${idx + 1} (3–12 letters)`}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-extrabold uppercase tracking-wider focus:outline-none focus:ring-2 ${
                        hasWarning
                          ? 'border-rose-300 bg-rose-50/40 text-rose-800 focus:ring-rose-300'
                          : 'border-slate-200 focus:ring-emerald-400'
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={item.hint || ''}
                      onChange={(e) => {
                        const next = [...words];
                        next[idx] = { ...next[idx], hint: e.target.value };
                        onChange({ ...config, words: next });
                      }}
                      placeholder="Optional emoji or short clue (e.g. 🪐 or Orbits a star)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...config, words: words.filter((_, i) => i !== idx) })
                      }
                      className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer"
                      aria-label="Remove word"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {hasWarning && (
                  <p className="text-[11px] font-semibold text-rose-600 px-1">
                    Word must contain 3 to 12 letters (currently {cleanLen}).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
