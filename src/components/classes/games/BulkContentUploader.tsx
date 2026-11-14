import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import type { GameId } from '@/types/gameLibrary';

export interface ParsedBulkRow {
  primary: string;
  secondary: string;
}

interface BulkContentUploaderProps {
  gameId: GameId;
  existingCount?: number;
  onConfirmImport: (rows: ParsedBulkRow[], mode: 'append' | 'replace') => void;
}

function getTemplateMeta(gameId: GameId) {
  switch (gameId) {
    case 'liquid-sentences':
      return {
        title: 'Bulk Upload Sentences',
        formatHint: 'One sentence per line. Optional hint after "|" or comma.',
        placeholder:
          'The mitochondria is the powerhouse of the cell | Biology organelle\nWater boils at one hundred degrees Celsius | Science fact',
        sampleFilename: 'liquid-sentences-template.csv',
        sampleContent:
          'The mitochondria is the powerhouse of the cell | Biology organelle\nWater boils at one hundred degrees Celsius | Science fact\nPhotosynthesis converts sunlight into chemical energy | Plant biology\n',
        primaryLabel: 'Sentence',
        secondaryLabel: 'Hint (Optional)',
        minPrimaryWords: 2
      };
    case 'save-the-balloon':
      return {
        title: 'Bulk Upload Words & Clues',
        formatHint: 'One word per line (letters A-Z). Optional clue after "|" or comma.',
        placeholder:
          'MITOCHONDRIA | The powerhouse of the cell\nPHOTOSYNTHESIS | How plants make food\nGRAVITY | Force that keeps planets in orbit',
        sampleFilename: 'save-the-balloon-template.csv',
        sampleContent:
          'MITOCHONDRIA | The powerhouse of the cell\nPHOTOSYNTHESIS | How plants make food\nGRAVITY | Force that keeps planets in orbit\n',
        primaryLabel: 'Word',
        secondaryLabel: 'Clue (Optional)',
        minPrimaryWords: 1
      };
    case 'memory-match':
      return {
        title: 'Bulk Upload Matching Pairs',
        formatHint: 'One pair per line: First item | Matching item (or CSV: item1,item2).',
        placeholder: 'Apple | Red fruit\nDog | Puppy\nSun | Solar\nEvaporation | Liquid turning into vapor',
        sampleFilename: 'memory-match-template.csv',
        sampleContent:
          'Apple,Red fruit\nDog,Puppy\nSun,Solar\nEvaporation,Liquid turning into vapor\n',
        primaryLabel: 'First Item',
        secondaryLabel: 'Matching Item',
        minPrimaryWords: 1
      };
    case 'classroom-jigsaw':
      return {
        title: 'Bulk Upload Puzzle Image URLs',
        formatHint: 'One image URL (https:// or data:image/...) per line.',
        placeholder: 'https://example.com/map.jpg\nhttps://example.com/cell-diagram.png',
        sampleFilename: 'classroom-jigsaw-urls.csv',
        sampleContent: 'https://example.com/puzzle-1.jpg\nhttps://example.com/puzzle-2.jpg\n',
        primaryLabel: 'Image URL',
        secondaryLabel: 'Label (Optional)',
        minPrimaryWords: 1
      };
    case 'lumina-words':
      return {
        title: 'Bulk Upload Words & Clues',
        formatHint: 'One word per line (2–8 letters A–Z). Optional clue after "|" or comma.',
        placeholder:
          'PLANET | Orbits a star\nATOM | Basic unit of matter\nORBIT | Curved path around a celestial body\nSOLAR | Relating to the sun',
        sampleFilename: 'lumina-words-template.csv',
        sampleContent:
          'PLANET | Orbits a star\nATOM | Basic unit of matter\nORBIT | Curved path around a celestial body\nSOLAR | Relating to the sun\n',
        primaryLabel: 'Word (2–8 A–Z)',
        secondaryLabel: 'Clue (Optional)',
        minPrimaryWords: 1
      };
  }
}

function splitCsvOrPipeLine(line: string): [string, string] {
  if (line.includes('|')) {
    const idx = line.indexOf('|');
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
  }
  // Basic CSV split supporting quoted fields
  const match = line.match(/^\s*"([^"]*)"\s*,\s*"?([^"]*)"?\s*$/);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }
  const commaIdx = line.indexOf(',');
  if (commaIdx !== -1) {
    return [
      line.slice(0, commaIdx).replace(/^"|"$/g, '').trim(),
      line.slice(commaIdx + 1).replace(/^"|"$/g, '').trim()
    ];
  }
  return [line.trim(), ''];
}

export const BulkContentUploader: React.FC<BulkContentUploaderProps> = ({
  gameId,
  existingCount = 0,
  onConfirmImport
}) => {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');

  const meta = getTemplateMeta(gameId);

  const parseInput = (text: string) => {
    setRawText(text);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const valid: ParsedBulkRow[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      // Skip obvious CSV header row
      if (
        index === 0 &&
        /^(sentence|word|term|first item|item1|image\s*url|url)\s*[|,]/i.test(line)
      ) {
        return;
      }

      const [rawPrimary, rawSecondary] = splitCsvOrPipeLine(line);
      if (!rawPrimary) {
        errors.push(`Line ${lineNum}: Missing primary value.`);
        return;
      }

      if (gameId === 'liquid-sentences') {
        if (rawPrimary.split(/\s+/).filter(Boolean).length < 2) {
          errors.push(`Line ${lineNum}: "${rawPrimary}" must contain at least 2 words.`);
          return;
        }
        valid.push({ primary: rawPrimary, secondary: rawSecondary });
      } else if (gameId === 'save-the-balloon') {
        const cleanWord = rawPrimary.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (cleanWord.length < 2) {
          errors.push(`Line ${lineNum}: "${rawPrimary}" must have at least 2 letters (A-Z).`);
          return;
        }
        valid.push({ primary: cleanWord, secondary: rawSecondary });
      } else if (gameId === 'memory-match') {
        if (!rawSecondary) {
          errors.push(`Line ${lineNum}: "${rawPrimary}" is missing its matching item.`);
          return;
        }
        valid.push({ primary: rawPrimary, secondary: rawSecondary });
      } else if (gameId === 'classroom-jigsaw') {
        const url = rawPrimary.trim();
        if (!/^(https?:\/\/|data:image\/)/i.test(url)) {
          errors.push(`Line ${lineNum}: "${rawPrimary}" must be a valid http(s):// or data:image/ URL.`);
          return;
        }
        valid.push({ primary: url, secondary: rawSecondary });
      } else if (gameId === 'lumina-words') {
        const cleanWord = rawPrimary.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (cleanWord.length < 2) {
          errors.push(`Line ${lineNum}: "${rawPrimary}" must have at least 2 letters (A-Z).`);
          return;
        }
        if (cleanWord.length > 8) {
          errors.push(
            `Line ${lineNum}: "${cleanWord}" has ${cleanWord.length} characters (maximum 8). Please shorten or replace it.`
          );
          return;
        }
        valid.push({ primary: cleanWord, secondary: rawSecondary });
      }
    });

    setPreviewRows(valid);
    setParseErrors(errors);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setParseErrors(['Unsupported file type. Please upload a .csv or .txt file.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      parseInput(String(reader.result || ''));
    };
    reader.onerror = () => {
      setParseErrors(['Could not read the selected file.']);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSample = () => {
    const blob = new Blob([meta.sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.sampleFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    if (previewRows.length === 0) return;
    onConfirmImport(previewRows, existingCount === 0 ? 'replace' : importMode);
    setRawText('');
    setPreviewRows([]);
    setParseErrors([]);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Bulk Upload / Paste
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{meta.title}</h4>
          <p className="text-[11px] text-slate-600 mt-0.5">{meta.formatHint}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded-lg hover:bg-white text-slate-500"
          aria-label="Close bulk uploader"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Method A + B Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
          <Upload className="w-3.5 h-3.5 text-indigo-600" />
          Upload CSV / TXT
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <button
          type="button"
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          Download Sample Template
        </button>
      </div>

      {/* Paste textarea */}
      <textarea
        rows={4}
        value={rawText}
        onChange={(e) => parseInput(e.target.value)}
        placeholder={meta.placeholder}
        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* Validation Errors */}
      {parseErrors.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseErrors.length} invalid {parseErrors.length === 1 ? 'entry' : 'entries'} found:</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] text-rose-600 space-y-0.5 max-h-24 overflow-y-auto">
            {parseErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview of Imported Items */}
      {previewRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Preview: {previewRows.length} valid {previewRows.length === 1 ? 'item' : 'items'} ready
            </span>
            {existingCount > 0 ? (
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`import-mode-${gameId}`}
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  Replace existing ({existingCount})
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`import-mode-${gameId}`}
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  Add to existing
                </label>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-slate-600">
                Adds only these {previewRows.length} imported items
              </span>
            )}
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {previewRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-xl bg-white border border-slate-200"
              >
                <input
                  type="text"
                  value={row.primary}
                  onChange={(e) => {
                    const next = [...previewRows];
                    next[idx] = { ...next[idx], primary: e.target.value };
                    setPreviewRows(next);
                  }}
                  placeholder={meta.primaryLabel}
                  className="sm:col-span-6 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={row.secondary}
                  onChange={(e) => {
                    const next = [...previewRows];
                    next[idx] = { ...next[idx], secondary: e.target.value };
                    setPreviewRows(next);
                  }}
                  placeholder={meta.secondaryLabel}
                  className="sm:col-span-5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600"
                />
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewRows(previewRows.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700"
                    aria-label="Remove imported item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              Confirm Import ({previewRows.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
