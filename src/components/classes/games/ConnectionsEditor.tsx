import React, { useMemo } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { getDemoConfigForGame } from '@/services/gameLibraryService';
import type { ConnectionsConfig, ConnectionsGroupItem } from '@/types/gameLibrary';
import { BulkContentUploader, type ParsedBulkRow } from './BulkContentUploader';

interface ConnectionsEditorProps {
  config: ConnectionsConfig;
  onChange: (next: ConnectionsConfig) => void;
  onBulkImport: (rows: ParsedBulkRow[], mode: 'append' | 'replace') => void;
}

const TIER_META = [
  {
    level: 0 as const,
    name: 'Group 1 — Straightforward',
    badge: 'Yellow Tier',
    cardClass: 'border-amber-300 bg-amber-50/60',
    pillClass: 'bg-amber-200 text-amber-950'
  },
  {
    level: 1 as const,
    name: 'Group 2 — Medium',
    badge: 'Green Tier',
    cardClass: 'border-emerald-300 bg-emerald-50/60',
    pillClass: 'bg-emerald-200 text-emerald-950'
  },
  {
    level: 2 as const,
    name: 'Group 3 — Tricky',
    badge: 'Blue Tier',
    cardClass: 'border-sky-300 bg-sky-50/60',
    pillClass: 'bg-sky-200 text-sky-950'
  },
  {
    level: 3 as const,
    name: 'Group 4 — Lateral / Wordplay',
    badge: 'Purple Tier',
    cardClass: 'border-purple-300 bg-purple-50/60',
    pillClass: 'bg-purple-200 text-purple-950'
  }
];

function ensureFourGroups(groups?: ConnectionsGroupItem[]): ConnectionsGroupItem[] {
  const out: ConnectionsGroupItem[] = [];
  for (let i = 0; i < 4; i++) {
    const existing = groups?.[i];
    out.push({
      title: existing?.title || '',
      level: i as 0 | 1 | 2 | 3,
      words: [
        existing?.words?.[0] || '',
        existing?.words?.[1] || '',
        existing?.words?.[2] || '',
        existing?.words?.[3] || ''
      ]
    });
  }
  return out;
}

export const ConnectionsEditor: React.FC<ConnectionsEditorProps> = ({
  config,
  onChange,
  onBulkImport
}) => {
  const groups = useMemo(() => ensureFourGroups(config.groups), [config.groups]);

  const duplicateWords = useMemo(() => {
    const counts = new Map<string, number>();
    groups.forEach((g) =>
      g.words.forEach((w) => {
        const clean = w.trim().toUpperCase();
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      })
    );
    const dups = new Set<string>();
    counts.forEach((c, word) => {
      if (c > 1) dups.add(word);
    });
    return dups;
  }, [groups]);

  const updateGroup = (groupIdx: number, updater: (g: ConnectionsGroupItem) => ConnectionsGroupItem) => {
    const nextGroups = groups.map((g, idx) => (idx === groupIdx ? updater(g) : g));
    onChange({ ...config, groups: nextGroups });
  };

  const filledWordCount = groups.reduce(
    (sum, g) => sum + g.words.filter((w) => w.trim().length > 0).length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Connections Grid Builder ({filledWordCount}/16 words filled)
          </h4>
          <p className="text-[11px] text-slate-500">
            Create 4 themed categories with 4 unique words each (16 total). Tip: paste 4
            comma-separated words into the first word slot of any group to auto-fill all 4!
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkContentUploader
            gameId="connections"
            existingCount={groups.filter((g) => g.title.trim().length > 0).length}
            onConfirmImport={onBulkImport}
          />
          <button
            type="button"
            onClick={() => onChange(getDemoConfigForGame('connections') as ConnectionsConfig)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Load Demo Sample
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Puzzle Theme / Level Subtitle
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="e.g., Grade 6 Vocabulary Review"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {duplicateWords.size > 0 && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            Duplicate words detected ({Array.from(duplicateWords).join(', ')}). All 16 words must
            be unique.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((grp, gIdx) => {
          const meta = TIER_META[gIdx];
          return (
            <div key={gIdx} className={`p-3.5 rounded-2xl border-2 space-y-2.5 ${meta.cardClass}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-900">{meta.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${meta.pillClass}`}>
                  {meta.badge}
                </span>
              </div>

              <input
                type="text"
                value={grp.title}
                onChange={(e) =>
                  updateGroup(gIdx, (prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={`Category name (e.g. Baby Animals)`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <div className="grid grid-cols-2 gap-2">
                {grp.words.map((word, wIdx) => {
                  const clean = word.trim().toUpperCase();
                  const isDup = Boolean(clean) && duplicateWords.has(clean);
                  return (
                    <input
                      key={wIdx}
                      type="text"
                      value={word}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        if (wIdx === 0 && rawVal.includes(',')) {
                          const split = rawVal
                            .split(',')
                            .map((s) => s.trim().toUpperCase())
                            .filter(Boolean);
                          if (split.length >= 2) {
                            updateGroup(gIdx, (prev) => ({
                              ...prev,
                              words: [
                                split[0] || prev.words[0],
                                split[1] || prev.words[1],
                                split[2] || prev.words[2],
                                split[3] || prev.words[3]
                              ]
                            }));
                            return;
                          }
                        }
                        updateGroup(gIdx, (prev) => {
                          const nextWords: [string, string, string, string] = [...prev.words] as [
                            string,
                            string,
                            string,
                            string
                          ];
                          nextWords[wIdx] = rawVal.toUpperCase();
                          return { ...prev, words: nextWords };
                        });
                      }}
                      placeholder={`Word ${wIdx + 1}`}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wide bg-white focus:outline-none focus:ring-2 ${
                        isDup
                          ? 'border-rose-400 text-rose-700 focus:ring-rose-300'
                          : 'border-slate-200 text-slate-800 focus:ring-amber-400'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
