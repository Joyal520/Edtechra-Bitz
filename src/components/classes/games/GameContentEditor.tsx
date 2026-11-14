import React from 'react';
import { AlertTriangle, ImagePlus, Layers, Plus, Sparkles, Trash2 } from 'lucide-react';
import { getDemoConfigForGame } from '@/services/gameLibraryService';
import {
  LUMINA_MAX_WHEEL_LETTERS,
  LUMINA_MAX_WORD_LENGTH,
  LUMINA_MAX_WORDS_PER_PUZZLE,
  generateLuminaPuzzles,
  validateLuminaWords
} from '@/utils/luminaPuzzleGenerator';
import type {
  ClassroomJigsawConfig,
  GameConfig,
  GameId,
  LiquidSentencesConfig,
  LuminaWordsConfig,
  MemoryMatchConfig,
  SaveTheBalloonConfig
} from '@/types/gameLibrary';
import { BulkContentUploader, type ParsedBulkRow } from './BulkContentUploader';

interface GameContentEditorProps {
  gameId: GameId;
  config: GameConfig;
  onChange: (next: GameConfig) => void;
  onError?: (msg: string | null) => void;
}

export async function compressImageToDataUrl(
  file: File,
  maxDimension = 800,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not load selected image'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Could not read selected file'));
    reader.readAsDataURL(file);
  });
}

export const GameContentEditor: React.FC<GameContentEditorProps> = ({
  gameId,
  config,
  onChange,
  onError
}) => {
  const luminaSummary = React.useMemo(() => {
    if (gameId !== 'lumina-words') return null;
    const c = config as LuminaWordsConfig;
    const nonEmpty = c.words.filter((w) => w.word.trim().length > 0);
    const validation = validateLuminaWords(nonEmpty);
    const puzzles = generateLuminaPuzzles(validation.validWords);
    return { validation, puzzles };
  }, [gameId, config]);
  const handleBulkImport = (rows: ParsedBulkRow[], mode: 'append' | 'replace') => {
    if (gameId === 'liquid-sentences') {
      const incoming = rows.map((r) => ({ text: r.primary, hint: r.secondary }));
      const cur = (config as LiquidSentencesConfig).sentences;
      const base = mode === 'replace' ? [] : cur.filter((s) => s.text.trim().length > 0);
      onChange({ sentences: [...base, ...incoming] });
    } else if (gameId === 'save-the-balloon') {
      const c = config as SaveTheBalloonConfig;
      const incoming = rows.map((r) => ({ word: r.primary, hint: r.secondary }));
      const base = mode === 'replace' ? [] : c.words.filter((w) => w.word.trim().length > 0);
      onChange({ ...c, words: [...base, ...incoming] });
    } else if (gameId === 'memory-match') {
      const c = config as MemoryMatchConfig;
      const incoming = rows.map((r) => ({ term: r.primary, definition: r.secondary }));
      const base = mode === 'replace' ? [] : c.pairs.filter((p) => p.term.trim().length > 0);
      onChange({ ...c, pairs: [...base, ...incoming] });
    } else if (gameId === 'classroom-jigsaw') {
      const c = config as ClassroomJigsawConfig;
      const incoming = rows.map((r) => r.primary.trim()).filter(Boolean);
      const existing =
        c.images && c.images.length > 0 ? c.images : c.imageDataUrl ? [c.imageDataUrl] : [];
      const merged = mode === 'replace' ? incoming : [...existing, ...incoming];
      onChange({
        ...c,
        images: merged,
        imageDataUrl: merged[0] || ''
      });
    } else if (gameId === 'lumina-words') {
      const c = config as LuminaWordsConfig;
      const incoming = rows.map((r) => ({ word: r.primary, clue: r.secondary }));
      const base = mode === 'replace' ? [] : c.words.filter((w) => w.word.trim().length > 0);
      onChange({ ...c, words: [...base, ...incoming] });
    }
  };

  const renderEmptyState = (
    itemPlural: string,
    manualButtonLabel: string,
    onAddManual: () => void,
    showDemoButton = true
  ) => (
    <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-800">No {itemPlural} added yet</p>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Use <strong>Bulk Upload / Paste</strong> above to import your list from CSV or TXT, or click{' '}
          <strong>{manualButtonLabel}</strong> to create items manually.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onAddManual}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {manualButtonLabel}
        </button>
        {showDemoButton && (
          <button
            type="button"
            onClick={() => onChange(getDemoConfigForGame(gameId))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Load Demo Sample
          </button>
        )}
      </div>
    </div>
  );

  const handleJigsawMultiUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onError?.(null);
    const validImages: string[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        errors.push(`"${file.name}" is not a supported image file.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds 10 MB.`);
        continue;
      }
      try {
        const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
        validImages.push(dataUrl);
      } catch {
        errors.push(`Could not process "${file.name}".`);
      }
    }

    if (errors.length > 0) {
      onError?.(errors.join(' '));
    }

    if (validImages.length > 0) {
      const c = config as ClassroomJigsawConfig;
      const existing =
        c.images && c.images.length > 0 ? c.images : c.imageDataUrl ? [c.imageDataUrl] : [];
      const merged = [...existing, ...validImages];
      onChange({
        ...c,
        images: merged,
        imageDataUrl: merged[0]
      });
    }
  };

  if (gameId === 'liquid-sentences') {
    const c = config as LiquidSentencesConfig;
    const validCount = c.sentences.filter((s) => s.text.trim().length > 0).length;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Sentences & Optional Hints ({c.sentences.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Each sentence is scrambled into floating word tiles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BulkContentUploader
              gameId="liquid-sentences"
              existingCount={validCount}
              onConfirmImport={handleBulkImport}
            />
            <button
              type="button"
              onClick={() => onChange({ sentences: [...c.sentences, { text: '', hint: '' }] })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sentence
            </button>
          </div>
        </div>
        {c.sentences.length === 0 ? (
          renderEmptyState('sentences', 'Add Sentence', () =>
            onChange({ sentences: [{ text: '', hint: '' }] })
          )
        ) : (
          c.sentences.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Sentence #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ sentences: c.sentences.filter((_, i) => i !== idx) })
                  }
                  className="text-rose-500 hover:text-rose-700 p-1"
                  aria-label="Remove sentence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            <input
              type="text"
              value={item.text}
              onChange={(e) => {
                const next = [...c.sentences];
                next[idx] = { ...next[idx], text: e.target.value };
                onChange({ sentences: next });
              }}
              placeholder="e.g., Photosynthesis converts sunlight into chemical energy"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm"
            />
            <input
              type="text"
              value={item.hint || ''}
              onChange={(e) => {
                const next = [...c.sentences];
                next[idx] = { ...next[idx], hint: e.target.value };
                onChange({ sentences: next });
              }}
              placeholder="Optional hint (e.g., How plants make food)"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-600"
            />
          </div>
          ))
        )}
      </div>
    );
  }

  if (gameId === 'save-the-balloon') {
    const c = config as SaveTheBalloonConfig;
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Difficulty & Lives</h4>
            <div className="flex flex-wrap gap-2">
              {([
                { diff: 'easy' as const, lives: 8 as const, label: 'Easy (8 lives)' },
                { diff: 'medium' as const, lives: 6 as const, label: 'Medium (6 lives)' },
                { diff: 'hard' as const, lives: 5 as const, label: 'Hard (5 lives)' }
              ]).map((opt) => (
                <button
                  key={opt.diff}
                  type="button"
                  onClick={() => onChange({ ...c, difficulty: opt.diff, lives: opt.lives })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    c.difficulty === opt.diff
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={c.showTimer !== false}
                onChange={(e) => onChange({ ...c, showTimer: e.target.checked })}
                className="rounded border-slate-300"
              />
              Show Timer
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={c.allowHints !== false}
                onChange={(e) => onChange({ ...c, allowHints: e.target.checked })}
                className="rounded border-slate-300"
              />
              Enable Hints
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Words & Optional Clues ({c.words.length})
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <BulkContentUploader
              gameId="save-the-balloon"
              existingCount={c.words.filter((w) => w.word.trim().length > 0).length}
              onConfirmImport={handleBulkImport}
            />
            <button
              type="button"
              onClick={() => onChange({ ...c, words: [...c.words, { word: '', hint: '' }] })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Word
            </button>
          </div>
        </div>

        {c.words.length === 0 ? (
          renderEmptyState('words', 'Add Word', () =>
            onChange({ ...c, words: [{ word: '', hint: '' }] })
          )
        ) : (
          c.words.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
            >
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={item.word}
                  onChange={(e) => {
                    const next = [...c.words];
                    next[idx] = { ...next[idx], word: e.target.value.toUpperCase() };
                    onChange({ ...c, words: next });
                  }}
                  placeholder="WORD (e.g. GRAVITY)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold uppercase"
                />
              </div>
              <div className="sm:col-span-7">
                <input
                  type="text"
                  value={item.hint || ''}
                  onChange={(e) => {
                    const next = [...c.words];
                    next[idx] = { ...next[idx], hint: e.target.value };
                    onChange({ ...c, words: next });
                  }}
                  placeholder="Optional clue for students"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange({ ...c, words: c.words.filter((_, i) => i !== idx) })}
                  className="text-rose-500 hover:text-rose-700 p-1.5"
                  aria-label="Remove word"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (gameId === 'memory-match') {
    const c = config as MemoryMatchConfig;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Deck Theme Name
            </label>
            <input
              type="text"
              value={c.themeName || ''}
              onChange={(e) => onChange({ ...c, themeName: e.target.value })}
              placeholder="e.g., Basic Science"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BulkContentUploader
              gameId="memory-match"
              existingCount={c.pairs.filter((p) => p.term.trim().length > 0).length}
              onConfirmImport={handleBulkImport}
            />
            <button
              type="button"
              onClick={() => onChange({ ...c, pairs: [...c.pairs, { term: '', definition: '' }] })}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Pair
            </button>
          </div>
        </div>

        {c.pairs.length === 0 ? (
          renderEmptyState('matching pairs', 'Add Pair', () =>
            onChange({ ...c, pairs: [{ term: '', definition: '' }, { term: '', definition: '' }] })
          )
        ) : (
          c.pairs.map((pair, idx) => (
            <div key={idx} className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Pair #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...c, pairs: c.pairs.filter((_, i) => i !== idx) })}
                  className="text-rose-500 hover:text-rose-700 p-1"
                  aria-label="Remove pair"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={pair.term}
                onChange={(e) => {
                  const next = [...c.pairs];
                  next[idx] = { ...next[idx], term: e.target.value };
                  onChange({ ...c, pairs: next });
                }}
                placeholder="First item (word / term)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm"
              />
              <input
                type="text"
                value={pair.definition}
                onChange={(e) => {
                  const next = [...c.pairs];
                  next[idx] = { ...next[idx], definition: e.target.value };
                  onChange({ ...c, pairs: next });
                }}
                placeholder="Matching item (or upload picture below)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5 text-sky-600" />
                {pair.imageUrl ? 'Change Picture' : 'Upload Optional Picture'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await compressImageToDataUrl(file, 360, 0.8);
                    const next = [...c.pairs];
                    next[idx] = { ...next[idx], imageUrl: dataUrl };
                    onChange({ ...c, pairs: next });
                  }}
                />
              </label>
              {pair.imageUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={pair.imageUrl}
                    alt={pair.term || 'Pair preview'}
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...c.pairs];
                      next[idx] = { ...next[idx], imageUrl: undefined };
                      onChange({ ...c, pairs: next });
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          ))
        )}
      </div>
    );
  }

  if (gameId === 'classroom-jigsaw') {
    const c = config as ClassroomJigsawConfig;
    const jigsawImages =
      c.images && c.images.length > 0 ? c.images : c.imageDataUrl ? [c.imageDataUrl] : [];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Puzzle Images ({jigsawImages.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Upload local images or import puzzle image URLs in bulk.
            </p>
          </div>
          <BulkContentUploader
            gameId="classroom-jigsaw"
            existingCount={jigsawImages.length}
            onConfirmImport={handleBulkImport}
          />
        </div>

        <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center space-y-3">
          <label className="block py-3 cursor-pointer space-y-1.5">
            <ImagePlus className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              Upload Puzzle Image(s) — Single or Multi-Image Upload
            </p>
            <p className="text-xs text-slate-500">
              Select one or multiple PNG/JPG/WebP images (max 10 MB each).
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleJigsawMultiUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {jigsawImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
              {jigsawImages.map((src, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square"
                >
                  <img
                    src={src}
                    alt={`Puzzle ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[10px] font-bold">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = jigsawImages.filter((_, i) => i !== idx);
                      onChange({
                        ...c,
                        images: next,
                        imageDataUrl: next[0] || ''
                      });
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
                    aria-label="Remove puzzle image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Puzzle Difficulty</h4>
            <p className="text-[11px] text-slate-500">Available grid sizes: 2×2, 3×3, and 4×4.</p>
          </div>
          <div className="flex gap-2">
            {([
              { size: 2 as const, label: 'Easy (2×2)' },
              { size: 3 as const, label: 'Medium (3×3)' },
              { size: 4 as const, label: 'Hard (4×4)' }
            ]).map((opt) => (
              <button
                key={opt.size}
                type="button"
                onClick={() => onChange({ ...c, gridSize: opt.size })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  c.gridSize === opt.size
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // lumina-words
  const c = config as LuminaWordsConfig;
  const luminaValidation = luminaSummary?.validation;
  const luminaPuzzles = luminaSummary?.puzzles || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Words & Relevant Clues ({c.words.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Max {LUMINA_MAX_WORD_LENGTH} letters per word. Automatically organizes words into playable puzzles (up to {LUMINA_MAX_WORDS_PER_PUZZLE} words &amp; {LUMINA_MAX_WHEEL_LETTERS} wheel letters each).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkContentUploader
            gameId="lumina-words"
            existingCount={c.words.filter((w) => w.word.trim().length > 0).length}
            onConfirmImport={handleBulkImport}
          />
          <button
            type="button"
            onClick={() => onChange({ ...c, words: [...c.words, { word: '', clue: '' }] })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Word
          </button>
        </div>
      </div>

      {luminaValidation && luminaValidation.tooLongWords.length > 0 && (
        <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Word length limit exceeded (max {LUMINA_MAX_WORD_LENGTH} characters)
            </p>
            <p className="text-amber-800">
              Please shorten or replace:{' '}
              {luminaValidation.tooLongWords.map((w, i) => (
                <span key={`${w.clean}-${i}`} className="font-extrabold">
                  &ldquo;{w.clean}&rdquo; ({w.length} chars)
                  {i < luminaValidation.tooLongWords.length - 1 ? ', ' : ''}
                </span>
              ))}
              .
            </p>
          </div>
        </div>
      )}

      {c.words.length === 0 ? (
        renderEmptyState('words', 'Add Word', () =>
          onChange({ ...c, words: [{ word: '', clue: '' }] })
        )
      ) : (
        c.words.map((item, idx) => {
          const cleanLetters = item.word.replace(/[^a-zA-Z]/g, '').toUpperCase();
          const isTooLong = cleanLetters.length > LUMINA_MAX_WORD_LENGTH;
          const isTooShort = item.word.trim().length > 0 && cleanLetters.length < 2;
          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border bg-white space-y-1.5 ${
                isTooLong
                  ? 'border-amber-400 bg-amber-50/40'
                  : isTooShort
                    ? 'border-rose-300'
                    : 'border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-4 relative">
                  <input
                    type="text"
                    value={item.word}
                    onChange={(e) => {
                      const next = [...c.words];
                      next[idx] = { ...next[idx], word: e.target.value.toUpperCase() };
                      onChange({ ...c, words: next });
                    }}
                    placeholder="WORD (2-8 letters)"
                    className={`w-full px-3 py-2 pr-12 rounded-xl border text-sm font-bold uppercase ${
                      isTooLong
                        ? 'border-amber-400 bg-white text-amber-900'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  />
                  <span
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${
                      isTooLong ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {cleanLetters.length}/{LUMINA_MAX_WORD_LENGTH}
                  </span>
                </div>
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    value={item.clue}
                    onChange={(e) => {
                      const next = [...c.words];
                      next[idx] = { ...next[idx], clue: e.target.value };
                      onChange({ ...c, words: next });
                    }}
                    placeholder="Clue (optional, e.g. Curved path around a star)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onChange({ ...c, words: c.words.filter((_, i) => i !== idx) })}
                    className="text-rose-500 hover:text-rose-700 p-1.5"
                    aria-label="Remove word"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {isTooLong && (
                <p className="text-[11px] font-semibold text-amber-700 px-1">
                  &ldquo;{cleanLetters}&rdquo; has {cleanLetters.length} characters (maximum{' '}
                  {LUMINA_MAX_WORD_LENGTH}). Please shorten or replace it.
                </p>
              )}
              {isTooShort && (
                <p className="text-[11px] font-semibold text-rose-600 px-1">
                  Target words must have at least 2 letters (A–Z).
                </p>
              )}
            </div>
          );
        })
      )}

      {luminaPuzzles.length > 0 && (
        <div className="p-3.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/60 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-extrabold text-amber-950">
                Generated Puzzles Preview ({luminaPuzzles.length}{' '}
                {luminaPuzzles.length === 1 ? 'Puzzle' : 'Puzzles'})
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200">
              Max {LUMINA_MAX_WORDS_PER_PUZZLE} words · Max {LUMINA_MAX_WHEEL_LETTERS} wheel tiles
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {luminaPuzzles.map((puzzle) => (
              <div
                key={puzzle.puzzleNumber}
                className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-slate-800">
                    Puzzle {puzzle.puzzleNumber} of {luminaPuzzles.length}
                  </span>
                  <span className="text-slate-500 font-semibold">
                    {puzzle.words.length} {puzzle.words.length === 1 ? 'word' : 'words'} ·{' '}
                    {puzzle.letters.length} wheel letters
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {puzzle.letters.map((letter, li) => (
                    <span
                      key={`${puzzle.puzzleNumber}-l-${li}`}
                      className="w-6 h-6 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-extrabold inline-flex items-center justify-center"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {puzzle.words.map((w) => (
                    <span
                      key={`${puzzle.puzzleNumber}-w-${w.word}`}
                      className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wide"
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
