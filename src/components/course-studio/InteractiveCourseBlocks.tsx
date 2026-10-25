// ============================================================================
// EDTECHRA COURSE STUDIO 2.0: INTERACTIVE & VISUAL BLOCK COMPONENTS
// Reusable learning blocks implementing the SEE -> READ -> DISCOVER ->
// INTERACT -> PRACTISE -> ANSWER -> REMEMBER instructional rhythm.
// Supports both Student/Preview mode and Teacher Edit mode.
// ============================================================================

import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  Award,
  Lightbulb,
  Compass,
  BookOpen,
  Layers,
  Target
} from 'lucide-react';
import {
  CourseBlock,
  VocabularyCardItem,
  DiagramHotspotItem,
  IconCardItem,
  ComparisonSide
} from '@/types/courseStudio';
import { CourseIllustrationGraphic } from './BrainIllustrations';
import { courseAudio, playCorrectSound, playCompleteSound } from '@/utils/courseAudio';

const playSelectSound = () => courseAudio.playClick();

interface InteractiveBlockProps {
  block: CourseBlock;
  isEditMode?: boolean;
  onUpdateContent?: (updates: Record<string, any>) => void;
  studentName?: string;
  courseScore?: { earned: number; max: number };
}

/**
 * Speaks a word or short sentence using the browser's Web Speech API.
 */
function speakText(text: string) {
  try {
    playSelectSound();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore speech synthesis errors on unsupported browsers
  }
}

// ============================================================================
// 1. LEARNING OBJECTIVE BANNER ('objective')
// ============================================================================
export const ObjectiveBannerBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Learning Goal';
  const text = c.text || '';
  const outcomes: string[] = Array.isArray(c.outcomes) ? c.outcomes : [];

  if (isEditMode) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Target className="w-4 h-4" />
          <span>Learning Objective Block</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          placeholder="Objective heading..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-800 text-sm font-bold"
        />
        <textarea
          value={text}
          onChange={e => onUpdateContent?.({ text: e.target.value })}
          rows={2}
          placeholder="Short 1-2 sentence goal for the learner..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-800 text-sm"
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50/70 to-sky-50 dark:from-indigo-950/50 dark:via-violet-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Target className="w-5 h-5" />
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <span>{title}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
            {text}
          </p>
          {outcomes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {outcomes.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 border border-indigo-200/70 dark:border-indigo-700/60 text-xs font-bold text-indigo-950 dark:text-indigo-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. EDUCATIONAL ILLUSTRATION BLOCK ('illustration')
// ============================================================================
export const IllustrationBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || '';
  const caption = c.caption || c.text || '';
  const illustrationKey = c.illustration_key || 'friendly_brain';
  const imageUrl = c.image_url || c.url || '';
  const alt = c.alt || title || 'Course illustration';
  const badges: string[] = Array.isArray(c.badges) ? c.badges : [];

  if (isEditMode) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Visual Illustration Block
          </span>
          <select
            value={illustrationKey}
            onChange={e => onUpdateContent?.({ illustration_key: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-slate-300 dark:border-stone-700 text-xs font-bold"
          >
            <option value="friendly_brain">Friendly Brain Hero</option>
            <option value="brain_superpowers">Brain Superpowers Hub</option>
            <option value="brain_anatomy">Brain Anatomy (3 Parts)</option>
            <option value="memory_notebook">Memory Notebook Metaphor</option>
            <option value="sleeping_brain">Sleeping Brain Night Crew</option>
          </select>
        </div>
        <CourseIllustrationGraphic illustrationKey={illustrationKey} alt={alt} />
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          placeholder="Illustration title..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-sm font-bold"
        />
        <textarea
          value={caption}
          onChange={e => onUpdateContent?.({ caption: e.target.value })}
          rows={2}
          placeholder="Short 1-2 sentence visual caption..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-sm"
        />
      </div>
    );
  }

  return (
    <figure className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{title}</span>
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-extrabold uppercase tracking-wider">
            Visual Guide
          </span>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 p-3 sm:p-5 border border-slate-100 dark:border-slate-800/80">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full max-h-[340px] object-contain mx-auto rounded-xl"
            loading="lazy"
          />
        ) : (
          <CourseIllustrationGraphic illustrationKey={illustrationKey} alt={alt} />
        )}
      </div>

      {(caption || badges.length > 0) && (
        <figcaption className="space-y-3 text-center">
          {caption && (
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 max-w-2xl mx-auto leading-relaxed">
              {caption}
            </p>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
};

// ============================================================================
// 3. INTERACTIVE LABELLED DIAGRAM BLOCK ('labelled_diagram')
// ============================================================================
export const LabelledDiagramBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Interactive Diagram: Click Each Part to Explore';
  const subtitle = c.subtitle || 'Tap a part on the diagram or buttons below to see what it does.';
  const illustrationKey = c.illustration_key || 'brain_anatomy';
  const items: DiagramHotspotItem[] = Array.isArray(c.items) && c.items.length > 0
    ? c.items
    : [
        {
          id: 'cerebrum',
          label: '1. Cerebrum',
          subtitle: 'The Thinking & Learning Boss',
          description: 'The biggest part of your brain! It helps you think, read, speak, remember, and use your senses.',
          example: 'When you learn English or solve a puzzle, your cerebrum is working hard.',
          funFact: 'It makes up about 85% of your brain’s weight!',
          color: 'indigo'
        },
        {
          id: 'cerebellum',
          label: '2. Cerebellum',
          subtitle: 'The Balance & Movement Coach',
          description: 'Located at the back of your head. It helps you balance, walk smoothly, dance, and play sports.',
          example: 'When you ride a bicycle without falling, thank your cerebellum!',
          funFact: 'Cerebellum means "little brain" in Latin.',
          color: 'emerald'
        },
        {
          id: 'brain_stem',
          label: '3. Brain Stem',
          subtitle: 'The Automatic Life Keeper',
          description: 'Connects your brain to your body. It controls automatic jobs you do not have to think about, like breathing and your heartbeat.',
          example: 'Even when you are fast asleep, your brain stem keeps you breathing safely.',
          funFact: 'It never takes a break—not even for one second!',
          color: 'amber'
        }
      ];

  const [selectedId, setSelectedId] = useState<string>(items[0]?.id || 'cerebrum');
  const [exploredIds, setExploredIds] = useState<string[]>(items[0]?.id ? [items[0].id] : []);

  const activeItem = items.find(it => it.id === selectedId) || items[0];

  const handleSelectPart = (id: string) => {
    playSelectSound();
    setSelectedId(id);
    if (!exploredIds.includes(id)) {
      const next = [...exploredIds, id];
      setExploredIds(next);
      if (next.length === items.length) {
        playCorrectSound();
      }
    }
  };

  if (isEditMode) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 space-y-4">
        <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Interactive Labelled Diagram Block
        </div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-sm font-bold"
        />
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 space-y-2">
              <input
                type="text"
                value={item.label}
                onChange={e => {
                  const next = [...items];
                  next[idx] = { ...item, label: e.target.value };
                  onUpdateContent?.({ items: next });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-700 text-xs font-bold"
              />
              <textarea
                value={item.description}
                onChange={e => {
                  const next = [...items];
                  next[idx] = { ...item, description: e.target.value };
                  onUpdateContent?.({ items: next });
                }}
                rows={2}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-700 text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/60 p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive Explorer</span>
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {subtitle}
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{exploredIds.length} / {items.length} Explored</span>
        </div>
      </div>

      {/* Interactive SVG Diagram */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 p-3 sm:p-5 border border-slate-200/70 dark:border-slate-800">
        <CourseIllustrationGraphic
          illustrationKey={illustrationKey}
          activeRegionId={selectedId}
          onSelectRegion={handleSelectPart}
        />
      </div>

      {/* Part Selector Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const isVisited = exploredIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPart(item.id)}
              className={`min-h-[48px] px-4 py-3 rounded-2xl text-left transition-all cursor-pointer border-2 flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.01]'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <div>
                <div className="text-xs sm:text-sm font-black">{item.label}</div>
                {item.subtitle && (
                  <div className={`text-[11px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              {isVisited && (
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Part Inspection Card */}
      {activeItem && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-3 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-100">
                {activeItem.label} {activeItem.subtitle ? `— ${activeItem.subtitle}` : ''}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => speakText(`${activeItem.label}. ${activeItem.description}`)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer shrink-0"
              aria-label={`Listen to ${activeItem.label}`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen</span>
            </button>
          </div>

          <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
            {activeItem.description}
          </p>

          {activeItem.example && (
            <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <span className="font-black text-indigo-700 dark:text-indigo-300">Real-Life Example: </span>
              {activeItem.example}
            </div>
          )}

          {activeItem.funFact && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Fun Fact: {activeItem.funFact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. VISUAL ICON / ACTION CARDS GRID ('icon_cards')
// ============================================================================
export const IconCardsGridBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || '';
  const subtitle = c.subtitle || 'Tap any card to see an everyday example!';
  const cards: IconCardItem[] = Array.isArray(c.cards) ? c.cards : [];
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);

  const toggleCard = (idx: number) => {
    playSelectSound();
    setFlippedIndices(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
  };

  if (isEditMode) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Visual Icon Cards Grid ({cards.length} cards)
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateContent?.({
                cards: [
                  ...cards,
                  { icon: '✨', title: 'New Card', description: 'Short explanation.', example: 'Simple example.' }
                ]
              })
            }
            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Card
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          placeholder="Section title..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-sm font-bold"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cards.map((card, i) => (
            <div key={i} className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={card.icon}
                  onChange={e => {
                    const next = [...cards];
                    next[i] = { ...card, icon: e.target.value };
                    onUpdateContent?.({ cards: next });
                  }}
                  className="w-12 px-2 py-1 rounded-lg border text-center text-base"
                />
                <input
                  type="text"
                  value={card.title}
                  onChange={e => {
                    const next = [...cards];
                    next[i] = { ...card, title: e.target.value };
                    onUpdateContent?.({ cards: next });
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg border text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => onUpdateContent?.({ cards: cards.filter((_, idx) => idx !== i) })}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={card.description}
                onChange={e => {
                  const next = [...cards];
                  next[i] = { ...card, description: e.target.value };
                  onUpdateContent?.({ cards: next });
                }}
                rows={2}
                className="w-full px-2.5 py-1 rounded-lg border text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{title}</span>
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {subtitle}
              </p>
            )}
          </div>
          {cards.length > 0 && (
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {flippedIndices.length}/{cards.length} tapped
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {cards.map((card, idx) => {
          const isExpanded = flippedIndices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCard(idx)}
              className={`group text-left p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isExpanded
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs'
              }`}
            >
              <div className="space-y-2.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                    {card.icon || '✨'}
                  </span>
                  {card.badge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-black uppercase tracking-wider">
                      {card.badge}
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {card.title}
                </h4>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {card.description}
                </p>

                {card.example && isExpanded && (
                  <div className="mt-2 pt-2.5 border-t border-indigo-200/70 dark:border-indigo-800/60 text-xs font-semibold text-indigo-950 dark:text-indigo-200 animate-in fade-in duration-150">
                    <span className="font-black text-indigo-600 dark:text-indigo-400">Example: </span>
                    {card.example}
                  </div>
                )}
              </div>

              {card.example && (
                <div className="flex items-center justify-between w-full pt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span>{isExpanded ? '✓ Example shown' : 'Tap to see example →'}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 5. INTERACTIVE VOCABULARY CARDS BLOCK ('vocabulary_cards')
// ============================================================================
export const VocabularyCardsBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Key Vocabulary';
  const words: VocabularyCardItem[] = Array.isArray(c.words) ? c.words : [];
  const [practiceMode, setPracticeMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [listenedWords, setListenedWords] = useState<string[]>([]);

  const handleListen = (w: VocabularyCardItem) => {
    speakText(`${w.word}. ${w.definition}. For example: ${w.example}`);
    if (!listenedWords.includes(w.word)) {
      setListenedWords(prev => [...prev, w.word]);
    }
  };

  if (isEditMode) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Vocabulary Cards Block ({words.length} words)
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateContent?.({
                words: [
                  ...words,
                  { word: 'new word', partOfSpeech: 'noun', definition: 'Simple meaning', example: 'Simple sentence.', icon: '📖' }
                ]
              })
            }
            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Word
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {words.map((w, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={w.word}
                  onChange={e => {
                    const next = [...words];
                    next[idx] = { ...w, word: e.target.value };
                    onUpdateContent?.({ words: next });
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg border text-xs font-black"
                  placeholder="Word"
                />
                <button
                  type="button"
                  onClick={() => onUpdateContent?.({ words: words.filter((_, i) => i !== idx) })}
                  className="p-1 text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={w.definition}
                onChange={e => {
                  const next = [...words];
                  next[idx] = { ...w, definition: e.target.value };
                  onUpdateContent?.({ words: next });
                }}
                className="w-full px-2.5 py-1 rounded-lg border text-xs"
                placeholder="Simple A1-A2 definition"
              />
              <input
                type="text"
                value={w.example}
                onChange={e => {
                  const next = [...words];
                  next[idx] = { ...w, example: e.target.value };
                  onUpdateContent?.({ words: next });
                }}
                className="w-full px-2.5 py-1 rounded-lg border text-xs"
                placeholder="Example sentence"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const targetWord = words[quizIndex % Math.max(1, words.length)];

  return (
    <div className="rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Listen to each word, read the simple meaning, and practise!
            </p>
          </div>
        </div>

        {words.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              playSelectSound();
              setPracticeMode(!practiceMode);
              setSelectedWord(null);
            }}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{practiceMode ? 'Back to Word Cards' : 'Practise These Words'}</span>
          </button>
        )}
      </div>

      {!practiceMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {words.map((item, idx) => {
            const hasListened = listenedWords.includes(item.word);
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon || '🗣️'}</span>
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {item.word}
                      </span>
                      {item.partOfSpeech && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                          {item.partOfSpeech}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleListen(item)}
                      aria-label={`Listen to pronunciation of ${item.word}`}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                        hasListened
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 hover:bg-amber-200'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {item.definition}
                  </p>
                </div>

                {item.example && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-300 italic">
                    “{item.example}”
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        targetWord && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
              <span>MINI WORD PRACTICE ({quizIndex + 1} of {words.length})</span>
              <button
                type="button"
                onClick={() => {
                  setQuizIndex((quizIndex + 1) % words.length);
                  setSelectedWord(null);
                }}
                className="underline cursor-pointer"
              >
                Next Word →
              </button>
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Which word means: <span className="text-indigo-600 dark:text-indigo-400">“{targetWord.definition}”</span>?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {words.map((w, idx) => {
                const isPicked = selectedWord === w.word;
                const isRight = w.word === targetWord.word;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedWord(w.word);
                      if (w.word === targetWord.word) playCorrectSound();
                      else playSelectSound();
                    }}
                    className={`min-h-[44px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm border-2 transition-all cursor-pointer ${
                      isPicked
                        ? isRight
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {w.icon} {w.word}
                  </button>
                );
              })}
            </div>
            {selectedWord && (
              <div
                className={`p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between ${
                  selectedWord === targetWord.word
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                }`}
              >
                <span>
                  {selectedWord === targetWord.word
                    ? `✅ Correct! "${targetWord.word}" — ${targetWord.example}`
                    : `❌ Try again! Read the clue carefully.`}
                </span>
                {selectedWord === targetWord.word && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizIndex((quizIndex + 1) % words.length);
                      setSelectedWord(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

// ============================================================================
// 6. SIDE-BY-SIDE COMPARISON BLOCK ('comparison')
// ============================================================================
export const ComparisonBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Compare & Understand';
  const left: ComparisonSide = c.left || { title: 'Side A', icon: '📝', points: [] };
  const right: ComparisonSide = c.right || { title: 'Side B', icon: '📚', points: [] };

  if (isEditMode) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-indigo-600">Comparison Block</div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          className="w-full px-3 py-2 rounded-xl border text-sm font-bold"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {title && (
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[left, right].map((side, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl border-2 space-y-3 ${
              idx === 0
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                : 'bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{side.icon || (idx === 0 ? '⚡' : '🌟')}</span>
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {side.title}
                </h4>
                {side.subtitle && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {side.subtitle}
                  </p>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {(side.points || []).map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${idx === 0 ? 'text-amber-600' : 'text-indigo-600'}`} />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 7. "DID YOU KNOW?" CURIOSITY CARD ('did_you_know')
// ============================================================================
export const DidYouKnowBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Did You Know?';
  const text = c.text || '';
  const questionPrompt = c.question_prompt || '';
  const [revealed, setRevealed] = useState(!questionPrompt);

  if (isEditMode) {
    return (
      <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 space-y-2">
        <div className="text-xs font-black uppercase text-violet-600">Did You Know? Block</div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border text-xs font-bold"
        />
        <textarea
          value={text}
          onChange={e => onUpdateContent?.({ text: e.target.value })}
          rows={2}
          className="w-full px-3 py-1.5 rounded-lg border text-xs"
        />
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-50 via-fuchsia-50/60 to-indigo-50 dark:from-violet-950/40 dark:via-fuchsia-950/25 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-800/70 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-violet-800 dark:text-violet-300">
            {title}
          </span>
        </div>
        {questionPrompt && !revealed && (
          <button
            type="button"
            onClick={() => {
              playSelectSound();
              setRevealed(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer hover:bg-violet-700"
          >
            Tap to Reveal Answer ✨
          </button>
        )}
      </div>

      {questionPrompt && (
        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
          {questionPrompt}
        </p>
      )}

      {revealed && (
        <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed animate-in fade-in duration-200">
          {text}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// 8. INTERACTIVE MICRO-ACTIVITY BLOCK ('interactive_activity')
// ============================================================================
export const InteractiveActivityBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const activityType = c.activity_type || 'click_to_reveal';
  const title = c.title || 'Interactive Discovery';
  const instruction = c.instruction || 'Tap each item below to test yourself!';
  const items: Array<{ label: string; icon?: string; detail: string; isTrue?: boolean }> =
    Array.isArray(c.items) ? c.items : [];

  // State for click_to_reveal & habit_checklist
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  // State for memory_challenge (Lesson 4)
  const [memoryPhase, setMemoryPhase] = useState<'ready' | 'memorize' | 'recall' | 'done'>('ready');
  const [recalledIndices, setRecalledIndices] = useState<number[]>([]);

  const toggleIndex = (idx: number) => {
    playSelectSound();
    setActiveIndices(prev => {
      const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      if (next.length === items.length && items.length > 0) {
        playCorrectSound();
      }
      return next;
    });
  };

  if (isEditMode) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
        <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
          Interactive Micro-Activity ({activityType})
        </div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border text-xs font-bold"
        />
        <input
          type="text"
          value={instruction}
          onChange={e => onUpdateContent?.({ instruction: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border text-xs"
        />
      </div>
    );
  }

  // SPECIAL MODE: MEMORY CHALLENGE (Lesson 4)
  if (activityType === 'memory_challenge') {
    const targetItems = items.slice(0, 4);
    const distractors = [
      { label: 'Red Umbrella', icon: '☂️', detail: 'Distractor' },
      { label: 'Toy Train', icon: '🚂', detail: 'Distractor' }
    ];
    const pool = [...targetItems.map((it, idx) => ({ ...it, originalIdx: idx, isTarget: true })), ...distractors.map((d, i) => ({ ...d, originalIdx: 10 + i, isTarget: false }))];

    return (
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-sky-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              🎮 Interactive Brain Game
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {instruction}
            </p>
          </div>
          {memoryPhase !== 'ready' && (
            <button
              type="button"
              onClick={() => {
                setMemoryPhase('ready');
                setRecalledIndices([]);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>

        {memoryPhase === 'ready' && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Look at the 4 items below, then click <strong>Hide &amp; Test My Memory</strong>!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {targetItems.map((it, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 text-center space-y-1 shadow-xs">
                  <div className="text-3xl">{it.icon || '⭐'}</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{it.label}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                playSelectSound();
                setMemoryPhase('recall');
                setRecalledIndices([]);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black cursor-pointer shadow-sm"
            >
              🙈 Hide Items &amp; Test My Short-Term Memory!
            </button>
          </div>
        )}

        {memoryPhase === 'recall' && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Tap the 4 items that were on your Brain’s Sticky Note ({recalledIndices.length}/4 found):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {pool.map((item) => {
                const isPicked = recalledIndices.includes(item.originalIdx);
                return (
                  <button
                    key={item.originalIdx}
                    type="button"
                    onClick={() => {
                      if (item.isTarget) {
                        if (!isPicked) {
                          const next = [...recalledIndices, item.originalIdx];
                          setRecalledIndices(next);
                          if (next.length === targetItems.length) {
                            playCompleteSound();
                            setMemoryPhase('done');
                          } else {
                            playCorrectSound();
                          }
                        }
                      } else {
                        playSelectSound();
                      }
                    }}
                    className={`min-h-[48px] p-3 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all ${
                      isPicked
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {memoryPhase === 'done' && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white text-center space-y-1 animate-in fade-in duration-200">
            <div className="text-lg font-black">🎉 Amazing Short-Term Memory!</div>
            <p className="text-xs sm:text-sm text-emerald-50">
              You remembered all 4 items! Your cerebrum held them on its short-term sticky note.
            </p>
          </div>
        )}
      </div>
    );
  }

  // DEFAULT INTERACTIVE DISCOVERY / CHECKLIST
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-indigo-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/30 border-2 border-emerald-200/80 dark:border-emerald-800/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interactive Activity</span>
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {instruction}
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
          {activeIndices.length} / {items.length} Discovered
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const isOpen = activeIndices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleIndex(idx)}
              className={`min-h-[56px] p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                isOpen
                  ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-sm'
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{item.icon || '🧠'}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {item.label}
                  </span>
                </div>
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isOpen ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </div>

              {isOpen && (
                <p className="text-xs sm:text-sm font-medium text-emerald-900 dark:text-emerald-200 pt-1 border-t border-emerald-100 dark:border-emerald-900/50 animate-in fade-in duration-150">
                  {item.detail}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {activeIndices.length === items.length && items.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-extrabold text-center animate-in fade-in duration-200">
          🌟 Awesome job! You explored all {items.length} items!
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 9. KEY TAKEAWAY / "REMEMBER THIS" SUMMARY CARD ('key_takeaway')
// ============================================================================
export const KeyTakeawayBlock: React.FC<InteractiveBlockProps> = ({
  block,
  isEditMode,
  onUpdateContent
}) => {
  const c = (block.content || {}) as any;
  const title = c.title || 'Remember This!';
  const points: string[] = Array.isArray(c.points)
    ? c.points
    : c.text
    ? [c.text]
    : [];

  if (isEditMode) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
        <div className="text-xs font-black uppercase text-emerald-700">Key Takeaway Summary Block</div>
        <input
          type="text"
          value={title}
          onChange={e => onUpdateContent?.({ title: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border text-xs font-bold"
        />
        <textarea
          value={points.join('\n')}
          onChange={e => onUpdateContent?.({ points: e.target.value.split('\n').filter(Boolean) })}
          rows={3}
          placeholder="One takeaway per line..."
          className="w-full px-3 py-1.5 rounded-lg border text-xs"
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/25 border border-emerald-200 dark:border-emerald-800/70 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm sm:text-base">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>{title}</span>
      </div>
      <ul className="space-y-2">
        {points.map((pt, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// 10. COURSE COMPLETION & CERTIFICATE CARD ('course_completion')
// ============================================================================
export const CourseCompletionBlock: React.FC<InteractiveBlockProps> = ({
  block,
  studentName,
  courseScore
}) => {
  const c = (block.content || {}) as any;
  const courseTitle = c.course_title || '🧠 AMAZING BRAIN';
  const badgeTitle = c.badge_title || 'Junior Brain Explorer';
  const learnedPoints: string[] = Array.isArray(c.learned_points)
    ? c.learned_points
    : [
        'Your brain is the boss of your thoughts, feelings, memories, and movements.',
        'The 3 main parts are the Cerebrum (thinking), Cerebellum (balance), and Brain Stem (breathing & heartbeat).',
        'Short-term memory holds things for seconds; long-term memory stores skills and knowledge for years.',
        'Sleep, healthy food, exercise, learning, and rest keep your brain strong and happy!'
      ];

  const learnerDisplay = studentName && studentName.trim() ? studentName.trim() : 'EdTechra Learner';

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <div className="w-20 h-20 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center text-4xl shadow-lg shrink-0 ring-4 ring-amber-300/40">
          🏆
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Course Achievement Unlocked</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Congratulations, {learnerDisplay}!
          </h3>
          <p className="text-xs sm:text-sm text-indigo-100 font-medium">
            Complete the Final Challenge below to claim your official <strong>{badgeTitle}</strong> certificate and leaderboard XP!
          </p>
        </div>
      </div>

      {/* Key Things Learned */}
      <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-3">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
          🌟 Key Things You Learned in {courseTitle}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {learnedPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-white/95 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate Preview Card */}
      <div className="p-5 rounded-2xl bg-white text-slate-900 border-4 border-amber-400 shadow-md text-center space-y-2">
        <div className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
          EdTechra Digital Classroom • Certificate of Achievement
        </div>
        <div className="text-lg sm:text-xl font-black text-slate-900">
          {courseTitle}
        </div>
        <div className="text-xs text-slate-500">
          Awarded to <strong className="text-slate-900">{learnerDisplay}</strong> • Rank: <strong className="text-amber-600">{badgeTitle}</strong>
        </div>
        {courseScore && courseScore.max > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
            <span>Final Challenge Score: {courseScore.earned} / {courseScore.max} pts</span>
          </div>
        )}
      </div>
    </div>
  );
};
