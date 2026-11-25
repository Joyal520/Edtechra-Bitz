import React, { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ImagePlus,
  Library,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { getDemoConfigForGame } from '@/services/gameLibraryService';
import type {
  GameOfWordsConfig,
  VocabDifficultyFilter,
  VocabGameModeId,
  VocabWordEntry
} from '@/types/gameLibrary';

export const VOCAB_CATEGORIES = [
  'All',
  'Everyday',
  'School',
  'Family',
  'Food',
  'Animals',
  'Travel',
  'Technology',
  'Emotions',
  'Actions',
  'Nature',
  'Objects',
  'Work'
] as const;

export const VOCAB_GAME_MODES: { id: VocabGameModeId; label: string; desc: string }[] = [
  { id: 'all', label: 'All 12 Modes (Student Choice)', desc: 'Students can pick any vocabulary mode to play' },
  { id: 'matching', label: 'Word & Meaning Matching', desc: 'Connect words to their definitions' },
  { id: 'multiple-choice', label: 'Multiple Choice', desc: 'Pick the right word or meaning from 4 options' },
  { id: 'guess-word', label: 'Guess the Word', desc: 'Spell the word from its clue and example' },
  { id: 'word-scramble', label: 'Word Scramble', desc: 'Unscramble letter tiles to form the word' },
  { id: 'missing-letters', label: 'Missing Letters', desc: 'Fill in the missing letters of each word' },
  { id: 'picture-match', label: 'Picture & Word Matching', desc: 'Match images or visual icons to words' },
  { id: 'synonym', label: 'Synonym Challenge', desc: 'Find the word with the closest meaning' },
  { id: 'antonym', label: 'Antonym Challenge', desc: 'Find the word with the opposite meaning' },
  { id: 'speed-vocab', label: 'Speed Vocabulary', desc: '60-second rapid-fire vocabulary sprint' },
  { id: 'memory-match', label: 'Memory Matching', desc: 'Flip cards to pair words and definitions' },
  { id: 'sentence-completion', label: 'Sentence Completion', desc: 'Complete example sentences with the missing word' },
  { id: 'word-hunt', label: 'Word Hunt Wheel', desc: 'Swipe or tap the circular letter wheel to solve words' }
];

interface GameOfWordsEditorProps {
  config: GameOfWordsConfig;
  onChange: (next: GameOfWordsConfig) => void;
  compressImage: (file: File, maxDimension?: number, quality?: number) => Promise<string>;
  onError?: (msg: string | null) => void;
}

function splitDelimitedLine(line: string): string[] {
  if (line.includes('|')) {
    return line.split('|').map((s) => s.trim());
  }
  if (line.includes('\t')) {
    return line.split('\t').map((s) => s.trim());
  }
  // CSV parse respecting quoted fields
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function normalizeDifficulty(raw?: string): 'beginner' | 'intermediate' | 'advanced' {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'intermediate' || v === 'medium') return 'intermediate';
  if (v === 'advanced' || v === 'hard') return 'advanced';
  return 'beginner';
}

function normalizeRowsToWords(rows: string[][]): { entries: VocabWordEntry[]; errors: string[] } {
  const entries: VocabWordEntry[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rows.forEach((cols, idx) => {
    const cleanCols = cols.map((c) => String(c || '').trim());
    if (cleanCols.every((c) => !c)) return;
    if (idx === 0 && /^word$/i.test(cleanCols[0]) && /definition|meaning/i.test(cleanCols[1] || '')) {
      return; // skip header row
    }
    const word = cleanCols[0];
    const definition = cleanCols[1];
    if (!word || !definition) {
      errors.push(`Row ${idx + 1}: Both Word and Definition are required.`);
      return;
    }
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const syns = (cleanCols[5] || '')
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    entries.push({
      word,
      definition,
      example: cleanCols[2] || '',
      category: cleanCols[3] || 'Everyday',
      difficulty: normalizeDifficulty(cleanCols[4]),
      synonyms: syns.length > 0 ? syns : undefined,
      antonym: cleanCols[6] || undefined,
      emoji: cleanCols[7] || undefined
    });
  });

  return { entries, errors };
}

async function parseXlsxFile(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const parser = new DOMParser();

  // Read sharedStrings if present
  const sharedStrings: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ssXml = await ssFile.async('text');
    const doc = parser.parseFromString(ssXml, 'application/xml');
    const siNodes = Array.from(doc.getElementsByTagName('si'));
    for (const si of siNodes) {
      const tNodes = Array.from(si.getElementsByTagName('t'));
      sharedStrings.push(tNodes.map((t) => t.textContent || '').join(''));
    }
  }

  // Find first worksheet
  const sheetNames = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort();
  if (sheetNames.length === 0) {
    throw new Error('No worksheet found in the Excel file.');
  }

  const sheetXml = await zip.file(sheetNames[0])!.async('text');
  const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
  const rowNodes = Array.from(sheetDoc.getElementsByTagName('row'));

  const colRefToIndex = (ref: string): number => {
    const letters = ref.replace(/[^A-Z]/gi, '').toUpperCase();
    let idx = 0;
    for (let i = 0; i < letters.length; i++) {
      idx = idx * 26 + (letters.charCodeAt(i) - 64);
    }
    return Math.max(0, idx - 1);
  };

  const rows: string[][] = [];
  for (const rowNode of rowNodes) {
    const cells = Array.from(rowNode.getElementsByTagName('c'));
    const out: string[] = [];
    for (const c of cells) {
      const ref = c.getAttribute('r') || '';
      const colIdx = ref ? colRefToIndex(ref) : out.length;
      const type = c.getAttribute('t') || '';
      let val = '';
      if (type === 'inlineStr') {
        val = Array.from(c.getElementsByTagName('t'))
          .map((t) => t.textContent || '')
          .join('');
      } else {
        const vNode = c.getElementsByTagName('v')[0];
        const rawVal = vNode?.textContent || '';
        if (type === 's') {
          val = sharedStrings[Number(rawVal)] ?? '';
        } else {
          val = rawVal;
        }
      }
      while (out.length <= colIdx) out.push('');
      out[colIdx] = val.trim();
    }
    if (out.some(Boolean)) rows.push(out);
  }
  return rows;
}

export const GameOfWordsEditor: React.FC<GameOfWordsEditorProps> = ({
  config,
  onChange,
  compressImage,
  onError
}) => {
  const c: GameOfWordsConfig = {
    title: config.title || 'Vocabulary Training',
    description: config.description || '',
    sourceMode: config.sourceMode || 'builtin',
    category: config.category || 'All',
    difficulty: config.difficulty || 'all',
    gameMode: config.gameMode || 'all',
    roundSize: config.roundSize || 10,
    timedChallenge: Boolean(config.timedChallenge),
    timeLimitSeconds: config.timeLimitSeconds || 60,
    words: Array.isArray(config.words) ? config.words : []
  };

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRaw, setBulkRaw] = useState('');
  const [bulkPreview, setBulkPreview] = useState<VocabWordEntry[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankWords, setBankWords] = useState<VocabWordEntry[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankCategory, setBankCategory] = useState('All');

  const existingWordSet = useMemo(
    () => new Set(c.words.map((w) => w.word.trim().toLowerCase())),
    [c.words]
  );

  const loadBuiltInBank = async () => {
    setShowBankPicker(true);
    if (bankWords.length > 0) return;
    setBankLoading(true);
    try {
      const res = await fetch('/games/data/vocab-2000.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBankWords(data);
        }
      }
    } catch {
      onError?.('Could not load the 2,000-word bank preview.');
    } finally {
      setBankLoading(false);
    }
  };

  const filteredBankWords = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return bankWords
      .filter((w) => {
        if (bankCategory !== 'All' && (w.category || '').toLowerCase() !== bankCategory.toLowerCase()) {
          return false;
        }
        if (!q) return true;
        return (
          w.word.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [bankWords, bankSearch, bankCategory]);

  const parseBulkText = (text: string) => {
    setBulkRaw(text);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = lines.map(splitDelimitedLine);
    const { entries, errors } = normalizeRowsToWords(rows);
    setBulkPreview(entries);
    setBulkErrors(errors);
  };

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const rows = await parseXlsxFile(file);
        const { entries, errors } = normalizeRowsToWords(rows);
        setBulkRaw(rows.map((r) => r.join(' | ')).join('\n'));
        setBulkPreview(entries);
        setBulkErrors(errors);
      } else if (/\.(csv|txt|tsv)$/i.test(file.name)) {
        const text = await file.text();
        parseBulkText(text);
      } else {
        setBulkErrors(['Please upload a .csv, .txt, .tsv, or .xlsx Excel file.']);
      }
    } catch (err: any) {
      setBulkErrors([err?.message || 'Failed to parse uploaded file.']);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv =
      'Word,Definition,Example,Category,Difficulty,Synonyms,Antonym\n' +
      'resilient,able to recover quickly from difficulties,Resilient students keep trying after setbacks.,Emotions,advanced,"adaptable,tough",fragile\n' +
      'curious,eager to learn or know more,The curious learner asked why the sky turns orange.,School,beginner,"inquisitive,eager",indifferent\n' +
      'harvest,to gather ripe crops from the fields,Farmers harvest wheat at the end of summer.,Nature,intermediate,"gather,reap",plant\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyBulkImport = () => {
    if (bulkPreview.length === 0) return;
    const base = bulkMode === 'replace' ? [] : c.words.filter((w) => w.word.trim().length > 0);
    const mergedMap = new Map<string, VocabWordEntry>();
    for (const w of base) mergedMap.set(w.word.trim().toLowerCase(), w);
    for (const w of bulkPreview) mergedMap.set(w.word.trim().toLowerCase(), w);
    onChange({
      ...c,
      sourceMode: c.sourceMode === 'builtin' ? 'hybrid' : c.sourceMode,
      words: Array.from(mergedMap.values())
    });
    setShowBulkModal(false);
    setBulkRaw('');
    setBulkPreview([]);
    setBulkErrors([]);
  };

  const updateWordAt = (idx: number, patch: Partial<VocabWordEntry>) => {
    const next = [...c.words];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...c, words: next });
  };

  const handleWordImageUpload = async (idx: number, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Please select a valid image file.');
      return;
    }
    try {
      const dataUrl = await compressImage(file, 480, 0.82);
      updateWordAt(idx, { imageUrl: dataUrl });
    } catch {
      onError?.('Could not process uploaded image.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Source & Gameplay Configuration */}
      <div className="p-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-emerald-50/50 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Vocabulary Database &amp; Game Setup
            </h4>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            2,000-Word Bank + Custom Lists
          </span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Short Description (shown to students)
          </label>
          <input
            type="text"
            value={c.description || ''}
            onChange={(e) => onChange({ ...c, description: e.target.value })}
            placeholder="e.g., Practice essential English words across interactive challenges"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            {
              id: 'builtin' as const,
              title: 'Built-in 2,000 Words',
              desc: 'Use EdTechra’s curated 2,000-word bank'
            },
            {
              id: 'custom' as const,
              title: 'Custom Teacher Words',
              desc: 'Play exclusively with your word list'
            },
            {
              id: 'hybrid' as const,
              title: 'Hybrid (Custom + 2,000)',
              desc: 'Mix your words with built-in vocabulary'
            }
          ]).map((opt) => {
            const active = c.sourceMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...c, sourceMode: opt.id })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'border-sky-500 bg-sky-50 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-extrabold text-slate-900">{opt.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
            <select
              value={c.category || 'All'}
              onChange={(e) => onChange({ ...c, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
            >
              {VOCAB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Difficulty</label>
            <select
              value={c.difficulty || 'all'}
              onChange={(e) =>
                onChange({ ...c, difficulty: e.target.value as VocabDifficultyFilter })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Game Mode</label>
            <select
              value={c.gameMode || 'all'}
              onChange={(e) =>
                onChange({ ...c, gameMode: e.target.value as VocabGameModeId })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
            >
              {VOCAB_GAME_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Words per Round</label>
            <select
              value={c.roundSize || 10}
              onChange={(e) => onChange({ ...c, roundSize: Number(e.target.value) || 10 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
            >
              {[8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} words
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(c.timedChallenge)}
              onChange={(e) => onChange({ ...c, timedChallenge: e.target.checked })}
              className="rounded accent-sky-600"
            />
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <span>Timed Challenge</span>
          </label>
          {c.timedChallenge && (
            <select
              value={c.timeLimitSeconds || 60}
              onChange={(e) => onChange({ ...c, timeLimitSeconds: Number(e.target.value) || 60 })}
              className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-900"
            >
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
              <option value={120}>120 seconds</option>
            </select>
          )}
        </div>
      </div>

      {/* Custom Vocabulary List Builder */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Custom Vocabulary Words ({c.words.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              {c.sourceMode === 'builtin'
                ? 'Optional in Built-in mode — add words below or switch to Custom/Hybrid to feature your own list.'
                : 'Add words manually, pick from the 2,000-word bank, or bulk import via CSV / Excel (.xlsx).'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={loadBuiltInBank}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold cursor-pointer"
            >
              <Library className="w-3.5 h-3.5" />
              Browse 2,000 Words
            </button>
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Bulk Import (CSV / Excel)
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...c,
                  sourceMode: c.sourceMode === 'builtin' ? 'hybrid' : c.sourceMode,
                  words: [
                    ...c.words,
                    {
                      word: '',
                      definition: '',
                      example: '',
                      category: c.category && c.category !== 'All' ? c.category : 'Everyday',
                      difficulty:
                        c.difficulty && c.difficulty !== 'all' ? c.difficulty : 'beginner'
                    }
                  ]
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Word
            </button>
          </div>
        </div>

        {c.words.length === 0 ? (
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
            <p className="text-xs font-semibold text-slate-600 max-w-lg mx-auto">
              {c.sourceMode === 'builtin'
                ? 'Ready to play right away using the built-in 2,000 most common English words! You can also load a starter list or import your own CSV/Excel vocabulary.'
                : 'No custom words added yet. Import a CSV/Excel spreadsheet, pick from the 2,000-word bank, or load a starter sample.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV / Excel
              </button>
              <button
                type="button"
                onClick={() => onChange(getDemoConfigForGame('game-of-words') as GameOfWordsConfig)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Load Sample Words
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {c.words.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={item.word}
                      onChange={(e) => updateWordAt(idx, { word: e.target.value })}
                      placeholder="Word (e.g. curious)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={item.definition}
                      onChange={(e) => updateWordAt(idx, { definition: e.target.value })}
                      placeholder="Definition"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={item.category || 'Everyday'}
                      onChange={(e) => updateWordAt(idx, { category: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] font-semibold"
                    >
                      {VOCAB_CATEGORIES.filter((cat) => cat !== 'All').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <select
                      value={item.difficulty || 'beginner'}
                      onChange={(e) =>
                        updateWordAt(idx, {
                          difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                        })
                      }
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] font-semibold"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...c, words: c.words.filter((_, i) => i !== idx) })
                      }
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      aria-label="Remove word"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={item.example || ''}
                      onChange={(e) => updateWordAt(idx, { example: e.target.value })}
                      placeholder="Example sentence (optional)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={(item.synonyms || []).join(', ')}
                      onChange={(e) =>
                        updateWordAt(idx, {
                          synonyms: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        })
                      }
                      placeholder="Synonyms (comma-sep)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={item.antonym || ''}
                      onChange={(e) => updateWordAt(idx, { antonym: e.target.value })}
                      placeholder="Antonym"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end gap-1">
                    {item.imageUrl ? (
                      <div className="relative w-7 h-7 shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.word}
                          className="w-7 h-7 rounded-md object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => updateWordAt(idx, { imageUrl: undefined })}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label
                        className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 cursor-pointer"
                        title="Attach picture for Picture Match mode"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleWordImageUpload(idx, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk CSV / Excel Import Modal */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Bulk Import Vocabulary (CSV, TXT, or Excel .xlsx)
                </h3>
                <p className="text-[11px] text-slate-600">
                  Columns: Word | Definition | Example | Category | Difficulty | Synonyms | Antonym
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded-xl hover:bg-white text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,.xlsx"
                  className="hidden"
                  onChange={handleBulkFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV / Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
                <div className="ml-auto flex items-center gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBulkMode('append')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      bulkMode === 'append'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Append
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('replace')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      bulkMode === 'replace'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Replace List
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={bulkRaw}
                onChange={(e) => parseBulkText(e.target.value)}
                placeholder={
                  'curious | eager to learn more | The curious student asked great questions. | School | beginner | inquisitive,eager | indifferent\nharvest | gather ripe crops | Farmers harvest grain in autumn. | Nature | intermediate | gather,reap | plant'
                }
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono"
              />

              {bulkErrors.length > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 space-y-0.5">
                  {bulkErrors.slice(0, 5).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {bulkPreview.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    Ready to import {bulkPreview.length} unique vocabulary words
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px]">
                    {bulkPreview.slice(0, 12).map((w, i) => (
                      <div key={i} className="bg-white rounded-lg px-2.5 py-1 border border-emerald-100 flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{w.word}</span>
                        <span className="text-slate-600 truncate flex-1">{w.definition}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {w.category} · {w.difficulty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkPreview.length === 0}
                onClick={applyBulkImport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold"
              >
                Import {bulkPreview.length} Words
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Built-in 2,000 Word Bank Browser Modal */}
      {showBankPicker && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowBankPicker(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/70">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Built-in 2,000-Word Database Browser
                </h3>
                <p className="text-[11px] text-slate-600">
                  Click any word to add it to your custom vocabulary list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBankPicker(false)}
                className="p-1.5 rounded-xl hover:bg-white text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search 2,000 English words..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <select
                value={bankCategory}
                onChange={(e) => setBankCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {VOCAB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {bankLoading ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading 2,000-word bank...</p>
              ) : filteredBankWords.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No matching words found.</p>
              ) : (
                filteredBankWords.map((w) => {
                  const added = existingWordSet.has(w.word.toLowerCase());
                  return (
                    <div
                      key={w.word}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{w.emoji || '📘'}</span>
                          <span className="text-xs font-extrabold text-slate-900">{w.word}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                            {w.category}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {w.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{w.definition}</p>
                      </div>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() =>
                          onChange({
                            ...c,
                            sourceMode: c.sourceMode === 'builtin' ? 'hybrid' : c.sourceMode,
                            words: [...c.words, { ...w }]
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                          added
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'
                        }`}
                      >
                        {added ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
