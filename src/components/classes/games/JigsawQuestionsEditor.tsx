import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardPaste,
  Download,
  Edit3,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  Plus,
  Shuffle,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import type {
  ClassroomJigsawConfig,
  JigsawMcqQuestion,
  JigsawQuestion,
  JigsawQuestionType,
  JigsawTrueFalseQuestion,
  JigsawUnscrambleQuestion
} from '@/types/gameLibrary';
import {
  JIGSAW_BULK_SAMPLE_CSV,
  createJigsawQuestionId,
  parseBulkJigsawQuestions,
  shuffleTokens,
  tokenizeSentenceWords,
  validateJigsawQuestion
} from '@/utils/jigsawQuestions';

interface JigsawQuestionsEditorProps {
  config: ClassroomJigsawConfig;
  onChange: (next: ClassroomJigsawConfig) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const TYPE_META: Record<
  JigsawQuestionType,
  { label: string; badge: string; badgeClass: string; hint: string }
> = {
  mcq: {
    label: 'Multiple Choice',
    badge: 'MCQ',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    hint: 'Enter a question, 4 answer choices (A–D), and mark the single correct answer.'
  },
  true_false: {
    label: 'True or False',
    badge: 'TRUE / FALSE',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    hint: 'Enter a statement about the picture and select whether it is True or False.'
  },
  unscramble: {
    label: 'Unscramble the Sentence',
    badge: 'UNSCRAMBLE',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    hint: 'Enter a complete sentence. Words will be split and shuffled automatically for students.'
  }
};

export const JigsawQuestionsEditor: React.FC<JigsawQuestionsEditorProps> = ({
  config,
  onChange
}) => {
  const questionsEnabled = Boolean(config.questionsEnabled);
  const questions = useMemo(
    () => (Array.isArray(config.questions) ? config.questions : []),
    [config.questions]
  );

  const [selectedType, setSelectedType] = useState<JigsawQuestionType>('mcq');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Composer form state
  const [mcqPrompt, setMcqPrompt] = useState('');
  const [mcqOptions, setMcqOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<0 | 1 | 2 | 3>(0);

  const [tfPrompt, setTfPrompt] = useState('');
  const [tfAnswer, setTfAnswer] = useState<boolean>(true);

  const [unscrambleSentence, setUnscrambleSentence] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Upload drawer state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('append');
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);

  const parsedBulk = useMemo(() => parseBulkJigsawQuestions(bulkText), [bulkText]);

  const updateQuestions = (nextList: JigsawQuestion[], nextEnabled = questionsEnabled) => {
    onChange({
      ...config,
      questionsEnabled: nextEnabled,
      questions: nextList,
      questionCount: nextList.length
    });
  };

  const resetComposer = () => {
    setEditingId(null);
    setMcqPrompt('');
    setMcqOptions(['', '', '', '']);
    setMcqCorrectIndex(0);
    setTfPrompt('');
    setTfAnswer(true);
    setUnscrambleSentence('');
    setFormError(null);
  };

  const handleToggleEnabled = () => {
    const next = !questionsEnabled;
    onChange({
      ...config,
      questionsEnabled: next,
      questions,
      questionCount: questions.length
    });
  };

  const buildCandidateFromForm = (): JigsawQuestion => {
    const id = editingId || createJigsawQuestionId();
    if (selectedType === 'mcq') {
      return {
        id,
        type: 'mcq',
        prompt: mcqPrompt.trim(),
        options: mcqOptions.map((o) => o.trim()) as [string, string, string, string],
        correctIndex: mcqCorrectIndex
      } satisfies JigsawMcqQuestion;
    }
    if (selectedType === 'true_false') {
      return {
        id,
        type: 'true_false',
        prompt: tfPrompt.trim(),
        correctAnswer: tfAnswer
      } satisfies JigsawTrueFalseQuestion;
    }
    const cleanSentence = unscrambleSentence.trim().replace(/\s+/g, ' ');
    const tokens = tokenizeSentenceWords(cleanSentence);
    return {
      id,
      type: 'unscramble',
      sentence: cleanSentence,
      shuffledTokens: shuffleTokens(tokens, id)
    } satisfies JigsawUnscrambleQuestion;
  };

  const handleSaveQuestion = () => {
    const candidate = buildCandidateFromForm();
    const err = validateJigsawQuestion(candidate);
    if (err) {
      setFormError(err);
      return;
    }

    if (editingId) {
      const next = questions.map((q) => (q.id === editingId ? candidate : q));
      updateQuestions(next, true);
    } else {
      updateQuestions([...questions, candidate], true);
    }
    resetComposer();
  };

  const handleEditQuestion = (q: JigsawQuestion) => {
    setFormError(null);
    setEditingId(q.id);
    setSelectedType(q.type);
    if (q.type === 'mcq') {
      setMcqPrompt(q.prompt);
      setMcqOptions([...q.options] as [string, string, string, string]);
      setMcqCorrectIndex(q.correctIndex);
    } else if (q.type === 'true_false') {
      setTfPrompt(q.prompt);
      setTfAnswer(q.correctAnswer);
    } else {
      setUnscrambleSentence(q.sentence);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (editingId === id) resetComposer();
    updateQuestions(questions.filter((q) => q.id !== id));
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    updateQuestions(copy);
  };

  const handleBulkFileChange = async (file: File | null) => {
    if (!file) return;
    setBulkFileName(file.name);
    const text = await file.text();
    setBulkText(text);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([JIGSAW_BULK_SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classroom-jigsaw-questions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmBulkImport = () => {
    if (parsedBulk.questions.length === 0) return;
    const nextList =
      bulkMode === 'replace' ? [...parsedBulk.questions] : [...questions, ...parsedBulk.questions];
    updateQuestions(nextList, true);
    setBulkOpen(false);
    setBulkText('');
    setBulkFileName(null);
  };

  const previewTokens = useMemo(() => {
    const tokens = tokenizeSentenceWords(unscrambleSentence);
    return tokens.length >= 2 ? shuffleTokens(tokens, editingId || unscrambleSentence) : tokens;
  }, [unscrambleSentence, editingId]);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
      {/* Section Header & Enable/Disable Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Questions (Optional)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {questionsEnabled
              ? 'Questions stay locked while solving the image and unlock immediately after puzzle completion.'
              : 'OFF: Students only solve the jigsaw puzzle with no follow-up questions.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={questionsEnabled}
          onClick={handleToggleEnabled}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
            questionsEnabled
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${questionsEnabled ? 'bg-white' : 'bg-slate-400'}`}
          />
          {questionsEnabled ? 'Questions: ON' : 'Questions: OFF'}
        </button>
      </div>

      {questionsEnabled && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* Toolbar: Question Type Selector + Bulk Upload Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['mcq', 'true_false', 'unscramble'] as JigsawQuestionType[]).map((t) => {
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedType(t);
                      setFormError(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setBulkOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Bulk Upload / Paste
            </button>
          </div>

          {/* Bulk Upload / Paste Panel */}
          {bulkOpen && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-extrabold text-indigo-950">
                    Bulk Import Jigsaw Questions (CSV, TXT, or Paste)
                  </h5>
                  <p className="text-[11px] text-indigo-700">
                    Columns: <code className="font-mono">Type | Question / Statement / Sentence | Option A | Option B | Option C | Option D | Correct Answer</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Sample Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white"
                    aria-label="Close bulk importer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{bulkFileName ? `File: ${bulkFileName}` : 'Choose CSV / TXT File'}</span>
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      handleBulkFileChange(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>

                {questions.length > 0 && (
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBulkMode('append')}
                      className={`px-2.5 py-1 rounded-lg ${
                        bulkMode === 'append' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Append
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMode('replace')}
                      className={`px-2.5 py-1 rounded-lg ${
                        bulkMode === 'replace' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Replace Existing
                    </button>
                  </div>
                )}
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={'MCQ,"What animal is on the leaf?",Frog,Gecko,Bird,Fish,B\nTRUE_FALSE,"The gecko is green.",,,,,TRUE\nUNSCRAMBLE,"The green gecko rests on a leaf.",,,,,'}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {bulkText.trim().length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {parsedBulk.questions.length} valid{' '}
                      {parsedBulk.questions.length === 1 ? 'question' : 'questions'} ready to import
                    </span>
                    {parsedBulk.errors.length > 0 && (
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {parsedBulk.errors.length} invalid{' '}
                        {parsedBulk.errors.length === 1 ? 'row' : 'rows'}
                      </span>
                    )}
                  </div>

                  {parsedBulk.errors.length > 0 && (
                    <div className="max-h-28 overflow-y-auto rounded-xl bg-rose-50 border border-rose-200 p-2.5 space-y-1 text-[11px] text-rose-700">
                      {parsedBulk.errors.map((err, i) => (
                        <p key={i}>
                          <strong>Row {err.row}:</strong> {err.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={parsedBulk.questions.length === 0}
                      onClick={handleConfirmBulkImport}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Import {parsedBulk.questions.length}{' '}
                      {parsedBulk.questions.length === 1 ? 'Question' : 'Questions'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Composer Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  {editingId ? `Editing ${TYPE_META[selectedType].label}` : `Add ${TYPE_META[selectedType].label}`}
                </p>
                <p className="text-[11px] text-slate-500">{TYPE_META[selectedType].hint}</p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetComposer}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {selectedType === 'mcq' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={mcqPrompt}
                  onChange={(e) => setMcqPrompt(e.target.value)}
                  placeholder="Enter MCQ question (e.g., What animal can you see in the picture?)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {OPTION_LABELS.map((label, idx) => {
                    const isCorrect = mcqCorrectIndex === idx;
                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setMcqCorrectIndex(idx as 0 | 1 | 2 | 3)}
                          title={`Mark Option ${label} as correct`}
                          className={`w-7 h-7 rounded-lg text-xs font-black shrink-0 border transition cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                        <input
                          type="text"
                          value={mcqOptions[idx]}
                          onChange={(e) => {
                            const nextOpts = [...mcqOptions] as [string, string, string, string];
                            nextOpts[idx] = e.target.value;
                            setMcqOptions(nextOpts);
                          }}
                          placeholder={`Option ${label}`}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-900 focus:outline-none"
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-extrabold text-emerald-700 pr-1">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedType === 'true_false' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={tfPrompt}
                  onChange={(e) => setTfPrompt(e.target.value)}
                  placeholder="Enter statement (e.g., There is a gecko in the picture.)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Correct Answer:</span>
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setTfAnswer(val)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        tfAnswer === val
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedType === 'unscramble' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={unscrambleSentence}
                  onChange={(e) => setUnscrambleSentence(e.target.value)}
                  placeholder="Enter the complete correct sentence (e.g., The green gecko sits on the branch.)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {previewTokens.length > 0 && (
                  <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-800">
                      <span className="flex items-center gap-1">
                        <Shuffle className="w-3.5 h-3.5" />
                        Shuffled Word Tiles Preview ({previewTokens.length} words)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {previewTokens.map((tok, i) => (
                        <span
                          key={`${tok}-${i}`}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold"
                        >
                          {tok}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {formError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {formError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingId ? 'Save Question Changes' : 'Add Question'}
              </button>
            </div>
          </div>

          {/* Configured Questions List */}
          {questions.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 text-center space-y-1">
              <p className="text-xs font-extrabold text-amber-900">
                No questions added yet
              </p>
              <p className="text-[11px] text-amber-800">
                Add at least 1 question above (or via Bulk Upload), or switch Questions OFF for a puzzle-only game.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const meta = TYPE_META[q.type];
                const qErr = validateJigsawQuestion(q);
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      qErr
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-400">#{idx + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.badgeClass}`}
                        >
                          {meta.badge}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Lock className="w-2.5 h-2.5" /> Unlocks after puzzle
                        </span>
                      </div>

                      {q.type === 'mcq' && (
                        <>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {q.prompt}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Correct: <strong className="text-emerald-700">{OPTION_LABELS[q.correctIndex]}. {q.options[q.correctIndex]}</strong>
                          </p>
                        </>
                      )}

                      {q.type === 'true_false' && (
                        <>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {q.prompt}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Correct:{' '}
                            <strong className="text-emerald-700">
                              {q.correctAnswer ? 'True' : 'False'}
                            </strong>
                          </p>
                        </>
                      )}

                      {q.type === 'unscramble' && (
                        <>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {q.sentence}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {tokenizeSentenceWords(q.sentence).length} word tiles
                          </p>
                        </>
                      )}

                      {qErr && <p className="text-[11px] font-bold text-rose-600">{qErr}</p>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, -1)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-35 cursor-pointer"
                        title="Move Up"
                        aria-label={`Move question ${idx + 1} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, 1)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-35 cursor-pointer"
                        title="Move Down"
                        aria-label={`Move question ${idx + 1} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
                        title="Edit question"
                        aria-label={`Edit question ${idx + 1}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Delete question"
                        aria-label={`Delete question ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
