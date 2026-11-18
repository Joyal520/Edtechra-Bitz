import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Gamepad2,
  Trophy,
  BookOpen,
  Library,
  Upload,
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Save,
  Search,
  ExternalLink,
  Layers
} from 'lucide-react';
import { courseStudioService } from '@/services/courseStudioService';
import { libraryService } from '@/services/libraryService';
import { classroomService } from '@/services/classroomService';
import { courseGamesService } from '@/services/courseGamesService';
import type { Course } from '@/types/courseStudio';
import type { LibraryResource } from '@/types/library';
import type { Classroom } from '@/types/classroom';
import {
  COURSE_GAME_QUESTION_TYPE_LABELS,
  type CompetitionFormat,
  type CourseGame,
  type CourseGameMode,
  type CourseGameQuestion,
  type CourseGameQuestionType,
  type CourseGameScoringConfig,
  type CourseGameSettings,
  type CourseGameSourceMaterial,
  type GameDifficulty
} from '@/types/courseGames';

interface CourseGameBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
  initialMode?: CourseGameMode;
  gameToEdit?: CourseGame | null;
  onSaved: (game: CourseGame) => void;
}

const ALL_QUESTION_TYPES: CourseGameQuestionType[] = [
  'multiple_choice',
  'true_false',
  'fill_blank',
  'matching',
  'word_arrangement',
  'image_based',
  'short_answer',
  'correct_mistake'
];

export const CourseGameBuilderModal: React.FC<CourseGameBuilderModalProps> = ({
  isOpen,
  onClose,
  initialCourseId,
  initialMode = 'learning_game',
  gameToEdit,
  onSaved
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string>(initialCourseId || '');
  const [mode, setMode] = useState<CourseGameMode>(initialMode);
  const [competitionFormat, setCompetitionFormat] = useState<CompetitionFormat>('individual');

  // Step 1: Material Selection
  const [materialTab, setMaterialTab] = useState<'course' | 'library' | 'upload'>('course');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null);
  const [loadingCourseDetail, setLoadingCourseDetail] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryResource[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<CourseGameSourceMaterial[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Step 2: AI Question Generation
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState<GameDifficulty>('medium');
  const [aiTargetLevel, setAiTargetLevel] = useState('Middle School (Grades 6-8)');
  const [aiTopic, setAiTopic] = useState('');
  const [aiObjective, setAiObjective] = useState('');
  const [aiQuestionTypes, setAiQuestionTypes] = useState<CourseGameQuestionType[]>([
    'multiple_choice',
    'true_false',
    'fill_blank'
  ]);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Step 3: Question Editor
  const [questions, setQuestions] = useState<CourseGameQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewQuestionIdx, setPreviewQuestionIdx] = useState<number | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  // Step 4: Scoring & Assignment
  const [scoring, setScoring] = useState<CourseGameScoringConfig>({
    points_per_question: 10,
    bonus_points: 20,
    time_based_scoring: false,
    difficulty_based_scoring: false,
    negative_marking: false,
    negative_points: 2,
    total_points: 0
  });
  const [settings, setSettings] = useState<CourseGameSettings>({
    time_limit_sec: 0,
    max_attempts: 3,
    show_explanations: true,
    immediate_feedback: true,
    shuffle_questions: false,
    public_leaderboard: true,
    visibility: 'classroom',
    team_names: ['Team Alpha', 'Team Beta']
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createLiveQuiz, setCreateLiveQuiz] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    courseStudioService.getCourses().then(setCourses).catch(() => {});
    classroomService.getClassrooms().then(setClassrooms).catch(() => {});

    if (gameToEdit) {
      setTitle(gameToEdit.title);
      setDescription(gameToEdit.description || '');
      setCourseId(gameToEdit.course_id || '');
      setMode(gameToEdit.mode);
      setCompetitionFormat(gameToEdit.competition_format || 'individual');
      setAiDifficulty(gameToEdit.difficulty || 'medium');
      setAiTopic(gameToEdit.topic || '');
      setAiTargetLevel(gameToEdit.target_level || 'All Grades');
      setSelectedMaterials(gameToEdit.source_materials || []);
      setScoring(gameToEdit.scoring_config);
      setSettings(gameToEdit.settings);
      setStep(gameToEdit.questions && gameToEdit.questions.length > 0 ? 3 : 1);
      courseGamesService
        .getGame(gameToEdit.id)
        .then((full) => {
          setQuestions(full.questions || []);
        })
        .catch(() => setQuestions(gameToEdit.questions || []));
    } else {
      setStep(1);
      setTitle('');
      setDescription('');
      setCourseId(initialCourseId || '');
      setMode(initialMode);
      setCompetitionFormat('individual');
      setSelectedMaterials([]);
      setQuestions([]);
      setSelectedClassroomIds([]);
      setStartDate('');
      setEndDate('');
      setCreateLiveQuiz(false);
    }
  }, [isOpen, gameToEdit, initialCourseId, initialMode]);

  // Load selected course detail
  useEffect(() => {
    if (!isOpen || !courseId) {
      setSelectedCourseDetail(null);
      return;
    }
    setLoadingCourseDetail(true);
    courseStudioService
      .getCourse(courseId)
      .then(setSelectedCourseDetail)
      .catch(() => setSelectedCourseDetail(null))
      .finally(() => setLoadingCourseDetail(false));
  }, [isOpen, courseId]);

  // Load library resources
  useEffect(() => {
    if (!isOpen || materialTab !== 'library') return;
    setLoadingLibrary(true);
    libraryService
      .getResources({ search: librarySearch, category: libraryCategory }, false)
      .then(setLibraryItems)
      .catch(() => setLibraryItems([]))
      .finally(() => setLoadingLibrary(false));
  }, [isOpen, materialTab, librarySearch, libraryCategory]);

  const dynamicTotalPoints = useMemo(() => {
    const qSum = questions.reduce((sum, q) => sum + (Number(q.points) || scoring.points_per_question || 10), 0);
    return qSum + (Number(scoring.bonus_points) || 0);
  }, [questions, scoring.points_per_question, scoring.bonus_points]);

  if (!isOpen) return null;

  const toggleMaterial = (mat: CourseGameSourceMaterial) => {
    setSelectedMaterials((prev) => {
      const exists = prev.some((m) => m.id === mat.id);
      if (exists) return prev.filter((m) => m.id !== mat.id);
      return [...prev, mat];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      let textContent = '';
      if (/\.(txt|md|html?|csv|json)$/i.test(file.name)) {
        textContent = await file.text();
        if (/\.html?$/i.test(file.name)) {
          textContent = textContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
      const uploaded = await libraryService.uploadFileToR2(file, false);
      const newMat: CourseGameSourceMaterial = {
        id: `upload_${Date.now()}`,
        source_type: 'upload',
        title: uploadTitle.trim() || file.name,
        file_url: uploaded.publicUrl,
        file_type: file.type,
        extracted_text: textContent.slice(0, 8000) || uploadText.trim(),
        attribution: `Uploaded: ${file.name}`
      };
      setSelectedMaterials((prev) => [...prev, newMat]);
      setUploadTitle('');
      setUploadText('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload material');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddPastedMaterial = () => {
    if (!uploadText.trim()) return;
    const newMat: CourseGameSourceMaterial = {
      id: `note_${Date.now()}`,
      source_type: 'upload',
      title: uploadTitle.trim() || 'Teacher Material Notes',
      extracted_text: uploadText.trim().slice(0, 8000),
      attribution: `Teacher Notes: ${uploadTitle.trim() || 'Custom Text'}`
    };
    setSelectedMaterials((prev) => [...prev, newMat]);
    setUploadTitle('');
    setUploadText('');
  };

  const handleGenerateQuestions = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material in Step 1 first.');
      return;
    }
    setGeneratingAi(true);
    setError(null);
    try {
      const res = await courseGamesService.generateQuestions({
        materials: selectedMaterials,
        count: aiCount,
        difficulty: aiDifficulty,
        questionTypes: aiQuestionTypes,
        targetLevel: aiTargetLevel,
        topic: aiTopic,
        learningObjective: aiObjective,
        pointsPerQuestion: scoring.points_per_question
      });
      setQuestions((prev) => [...prev, ...res.questions]);
      if (!title.trim()) {
        setTitle(aiTopic.trim() || `${selectedMaterials[0].title} ${mode === 'competition' ? 'Challenge' : 'Game'}`);
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'AI question generation failed. You can also add questions manually.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleRegenerateOne = async (idx: number) => {
    if (selectedMaterials.length === 0) {
      setError('Select at least one source material in Step 1 to regenerate with AI.');
      return;
    }
    const target = questions[idx];
    setRegeneratingIdx(idx);
    setError(null);
    try {
      const res = await courseGamesService.generateQuestions({
        materials: selectedMaterials,
        count: 1,
        difficulty: target.difficulty || aiDifficulty,
        questionTypes: [target.question_type],
        targetLevel: aiTargetLevel,
        topic: aiTopic,
        pointsPerQuestion: target.points || scoring.points_per_question
      });
      if (res.questions[0]) {
        setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...res.questions[0], order_index: i } : q)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate question.');
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleAddManualQuestion = (qType: CourseGameQuestionType) => {
    const base: CourseGameQuestion = {
      id: `manual_${Date.now()}_${questions.length}`,
      order_index: questions.length,
      question_type: qType,
      question_text:
        qType === 'fill_blank'
          ? 'The capital of France is _____.'
          : qType === 'correct_mistake'
          ? 'Correct the mistake: She go to school every day.'
          : 'New question prompt',
      options:
        qType === 'true_false'
          ? ['True', 'False']
          : qType === 'matching'
          ? [
              { left: 'Term 1', right: 'Definition 1' },
              { left: 'Term 2', right: 'Definition 2' }
            ]
          : qType === 'word_arrangement'
          ? ['learn', 'Students', 'everyday']
          : qType === 'multiple_choice' || qType === 'image_based'
          ? ['Option A', 'Option B', 'Option C', 'Option D']
          : [],
      correct_answer:
        qType === 'true_false'
          ? 'True'
          : qType === 'matching'
          ? [
              { left: 'Term 1', right: 'Definition 1' },
              { left: 'Term 2', right: 'Definition 2' }
            ]
          : qType === 'word_arrangement'
          ? 'Students learn everyday'
          : qType === 'multiple_choice' || qType === 'image_based'
          ? 'Option A'
          : 'Answer',
      explanation: '',
      points: scoring.points_per_question || 10,
      difficulty: aiDifficulty
    };
    setQuestions((prev) => [...prev, base]);
    setEditingIndex(questions.length);
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleSaveAndPublish = async (publishNow: boolean) => {
    setError(null);
    if (!title.trim()) {
      setError('Please enter a title for your game or competition.');
      return;
    }
    if (questions.length === 0) {
      setError('Please add or generate at least 1 question before saving.');
      return;
    }
    if (publishNow && selectedClassroomIds.length === 0) {
      setError('Please select at least one classroom to assign and publish.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course_id: courseId || null,
        title: title.trim(),
        description: description.trim(),
        mode,
        competition_format: mode === 'competition' ? competitionFormat : 'individual',
        difficulty: aiDifficulty,
        topic: aiTopic.trim(),
        target_level: aiTargetLevel,
        source_materials: selectedMaterials.map(({ extracted_text: _et, ...rest }) => rest),
        scoring_config: { ...scoring, total_points: dynamicTotalPoints },
        settings,
        status: publishNow ? ('published' as const) : ('draft' as const),
        questions
      };

      const savedGame = gameToEdit
        ? await courseGamesService.updateGame(gameToEdit.id, payload)
        : await courseGamesService.createGame(payload);

      if (publishNow && selectedClassroomIds.length > 0) {
        await courseGamesService.assignToClassrooms(savedGame.id, {
          classroomIds: selectedClassroomIds,
          startDate: startDate || null,
          endDate: endDate || null,
          timeLimitSec: settings.time_limit_sec,
          maxAttempts: settings.max_attempts,
          visibility: settings.visibility,
          publicLeaderboard: settings.public_leaderboard,
          createLiveQuiz: createLiveQuiz || (mode === 'competition' && competitionFormat === 'live_quiz')
        });
      }

      onSaved(savedGame);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save game');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0a213c] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
              {mode === 'competition' ? (
                <Trophy className="w-5 h-5 text-amber-300" />
              ) : (
                <Gamepad2 className="w-5 h-5 text-sky-300" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">
                {gameToEdit ? 'Edit Course Game / Competition' : 'Create Game & Competition'}
              </h2>
              <p className="text-[11px] text-sky-200 font-semibold truncate">
                Step {step} of 4 • {dynamicTotalPoints} Total Points • {questions.length} Questions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { n: 1, label: '1. Select Materials' },
            { n: 2, label: '2. AI Generation' },
            { n: 3, label: `3. Question Editor (${questions.length})` },
            { n: 4, label: '4. Scoring & Assign' }
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n as 1 | 2 | 3 | 4)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                step === s.n
                  ? 'bg-[#026fc3] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: MATERIAL SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Game / Competition Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Amazing Brain Facts Challenge"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('learning_game')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1.5 ${
                        mode === 'learning_game'
                          ? 'bg-[#026fc3] text-white border-[#026fc3]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Learning Game</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('competition')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer flex items-center justify-center gap-1.5 ${
                        mode === 'competition'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Competition</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Source Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setMaterialTab('course')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    materialTab === 'course' ? 'bg-sky-50 text-[#026fc3] border border-sky-200' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>A. Course Lessons</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialTab('library')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    materialTab === 'library' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>B. EdTechra Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialTab('upload')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    materialTab === 'upload' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>C. Upload / Paste</span>
                </button>
              </div>

              {/* Tab A: Course Lessons */}
              {materialTab === 'course' && (
                <div className="space-y-3">
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">-- Select a Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.subject})
                      </option>
                    ))}
                  </select>

                  {loadingCourseDetail ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Loading lessons...
                    </div>
                  ) : selectedCourseDetail?.units?.length ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedCourseDetail.units.map((unit) => (
                        <div key={unit.id} className="border border-slate-200 rounded-2xl p-3 space-y-2 bg-slate-50/50">
                          <div className="text-xs font-black text-slate-800">{unit.title}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(unit.episodes || []).map((ep) => {
                              const matId = `ep_${ep.id}`;
                              const checked = selectedMaterials.some((m) => m.id === matId);
                              return (
                                <button
                                  key={ep.id}
                                  type="button"
                                  onClick={() =>
                                    toggleMaterial({
                                      id: matId,
                                      source_type: 'course_lesson',
                                      title: ep.title,
                                      course_id: selectedCourseDetail.id,
                                      unit_id: unit.id,
                                      episode_id: ep.id,
                                      subject: selectedCourseDetail.subject,
                                      attribution: `${selectedCourseDetail.title} — ${ep.title}`
                                    })
                                  }
                                  className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-sky-50 border-[#026fc3] text-[#026fc3]'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                                  }`}
                                >
                                  <span className="truncate">{ep.title}</span>
                                  {checked && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      Select a course above to pick specific units and lessons.
                    </p>
                  )}
                </div>
              )}

              {/* Tab B: EdTechra Library */}
              {materialTab === 'library' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder='Search EdTechra Library (e.g. "Amazing Brain Facts")...'
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <select
                      value={libraryCategory}
                      onChange={(e) => setLibraryCategory(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="all">All Categories</option>
                      <option value="Study Guide">Study Guide</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Web / Blogs">Web / Blogs</option>
                      <option value="Reference Material">Reference Material</option>
                    </select>
                  </div>

                  {loadingLibrary ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Searching EdTechra Library...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {libraryItems.map((item) => {
                        const matId = `lib_${item.id}`;
                        const checked = selectedMaterials.some((m) => m.id === matId);
                        return (
                          <div
                            key={item.id}
                            onClick={() =>
                              toggleMaterial({
                                id: matId,
                                source_type: 'library',
                                library_resource_id: item.id,
                                title: item.title,
                                subject: item.subject,
                                file_url: item.file_url,
                                file_type: item.file_type,
                                attribution: `EdTechra Library: ${item.title}`
                              })
                            }
                            className={`p-3 rounded-2xl border cursor-pointer flex items-start justify-between gap-2 transition-all ${
                              checked
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'bg-white border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">{item.title}</div>
                              <div className="text-[10px] text-slate-500 font-semibold">
                                {item.file_type.toUpperCase()} • {item.subject} • {item.grade_level}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.file_url && (
                                <a
                                  href={item.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Preview library resource"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {checked && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            </div>
                          </div>
                        );
                      })}
                      {libraryItems.length === 0 && (
                        <p className="col-span-2 text-xs text-slate-400 text-center py-6">
                          No published library resources matched your search.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab C: Upload / Paste */}
              {materialTab === 'upload' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Material title (optional)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <textarea
                    rows={4}
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    placeholder="Paste lesson text, study notes, or article excerpt here..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddPastedMaterial}
                      disabled={!uploadText.trim()}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
                    >
                      + Add Pasted Material
                    </button>
                    <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1.5">
                      {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingFile ? 'Uploading...' : 'Upload File (.html, .txt, .pdf, .pptx)'}</span>
                      <input
                        type="file"
                        accept=".html,.htm,.txt,.md,.pdf,.pptx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Selected Materials Tray */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#026fc3]" />
                    Selected Materials ({selectedMaterials.length})
                  </span>
                </div>
                {selectedMaterials.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Combine one or more course lessons, library resources, or uploaded files.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMaterials.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-sky-200 rounded-xl text-[11px] font-bold text-slate-800"
                      >
                        <span>{m.title}</span>
                        <button
                          type="button"
                          onClick={() => toggleMaterial(m)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: AI QUESTION GENERATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={aiCount}
                    onChange={(e) => setAiCount(Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as GameDifficulty)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Target Level</label>
                  <input
                    type="text"
                    value={aiTargetLevel}
                    onChange={(e) => setAiTargetLevel(e.target.value)}
                    placeholder="e.g. Grade 7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Topic</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Brain Lobes & Memory"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Learning Objective</label>
                  <input
                    type="text"
                    value={aiObjective}
                    onChange={(e) => setAiObjective(e.target.value)}
                    placeholder="e.g. Identify key functions from the text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-2">
                  Question Formats (Select one or more)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_QUESTION_TYPES.map((qt) => {
                    const active = aiQuestionTypes.includes(qt);
                    return (
                      <button
                        key={qt}
                        type="button"
                        onClick={() =>
                          setAiQuestionTypes((prev) =>
                            prev.includes(qt)
                              ? prev.length > 1
                                ? prev.filter((x) => x !== qt)
                                : prev
                              : [...prev, qt]
                          )
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-bold border text-left cursor-pointer transition-all ${
                          active
                            ? 'bg-[#026fc3] text-white border-[#026fc3]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {COURSE_GAME_QUESTION_TYPE_LABELS[qt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={generatingAi}
                  onClick={handleGenerateQuestions}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#026fc3] to-indigo-600 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                  <span>{generatingAi ? 'Generating Grounded Questions...' : 'Generate Questions with AI'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
                >
                  Skip to Manual Editor
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: QUESTION EDITOR */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black text-slate-700">
                  {questions.length} Questions • Total {dynamicTotalPoints} pts
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddManualQuestion(e.target.value as CourseGameQuestionType);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black cursor-pointer"
                  >
                    <option value="" disabled>
                      + Add Question Manually
                    </option>
                    {ALL_QUESTION_TYPES.map((qt) => (
                      <option key={qt} value={qt} className="bg-white text-slate-900">
                        {COURSE_GAME_QUESTION_TYPE_LABELS[qt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <p className="text-xs font-bold text-slate-500">No questions yet.</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-[#026fc3] text-white rounded-xl text-xs font-black cursor-pointer"
                  >
                    Go to AI Generator
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const isEditingThis = editingIndex === idx;
                    const isPreviewThis = previewQuestionIdx === idx;
                    return (
                      <div key={q.id || idx} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black">
                                Q{idx + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#026fc3] border border-sky-200 text-[10px] font-black">
                                {COURSE_GAME_QUESTION_TYPE_LABELS[q.question_type]}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                                {q.points} pts
                              </span>
                              {q.source_ref && (
                                <span className="text-[10px] text-slate-400 font-semibold truncate">
                                  Source: {q.source_ref}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900">{q.question_text}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => moveQuestion(idx, -1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Move up">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveQuestion(idx, 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Move down">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateOne(idx)}
                              disabled={regeneratingIdx === idx}
                              className="p-1.5 rounded-lg hover:bg-sky-50 text-[#026fc3] cursor-pointer"
                              title="Regenerate question with AI"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIdx === idx ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewQuestionIdx(isPreviewThis ? null : idx)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                              title="Preview question"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(isEditingThis ? null : idx)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700 cursor-pointer"
                            >
                              {isEditingThis ? 'Done' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isPreviewThis && (
                          <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-2">
                            <div className="font-black text-sky-300">Student Preview</div>
                            <p className="font-bold">{q.question_text}</p>
                            {Array.isArray(q.options) && q.options.length > 0 && q.question_type !== 'matching' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {q.options.map((opt: any, oIdx: number) => (
                                  <div key={oIdx} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
                                    {String(opt)}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="text-[11px] text-emerald-300">
                              Correct Answer: {typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer)}
                            </div>
                          </div>
                        )}

                        {isEditingThis && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Question Prompt</label>
                                <input
                                  type="text"
                                  value={q.question_text}
                                  onChange={(e) =>
                                    setQuestions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, question_text: e.target.value } : item))
                                    )
                                  }
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Points</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.points}
                                  onChange={(e) =>
                                    setQuestions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, points: Number(e.target.value) || 10 } : item))
                                    )
                                  }
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                />
                              </div>
                            </div>

                            {(q.question_type === 'multiple_choice' || q.question_type === 'image_based') && Array.isArray(q.options) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <input
                                    key={oIdx}
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const nextOpts = [...q.options];
                                      const oldVal = nextOpts[oIdx];
                                      nextOpts[oIdx] = e.target.value;
                                      setQuestions((prev) =>
                                        prev.map((item, i) =>
                                          i === idx
                                            ? {
                                                ...item,
                                                options: nextOpts,
                                                correct_answer: item.correct_answer === oldVal ? e.target.value : item.correct_answer
                                              }
                                            : item
                                        )
                                      );
                                    }}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Correct Answer</label>
                                <input
                                  type="text"
                                  value={typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer ?? '')}
                                  onChange={(e) => {
                                    let val: any = e.target.value;
                                    if (q.question_type === 'matching') {
                                      try {
                                        val = JSON.parse(e.target.value);
                                      } catch {
                                        val = q.correct_answer;
                                      }
                                    }
                                    setQuestions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, correct_answer: val } : item))
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Explanation</label>
                                <input
                                  type="text"
                                  value={q.explanation || ''}
                                  onChange={(e) =>
                                    setQuestions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, explanation: e.target.value } : item))
                                    )
                                  }
                                  placeholder="Shown to student after answering"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SCORING, MODE & CLASSROOM ASSIGNMENT */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Scoring Configuration */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Points & Scoring</h3>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                    Total Available: {dynamicTotalPoints} pts
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Pts / Question</label>
                    <input
                      type="number"
                      min={1}
                      value={scoring.points_per_question}
                      onChange={(e) => setScoring({ ...scoring, points_per_question: Number(e.target.value) || 10 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bonus Points (80%+)</label>
                    <input
                      type="number"
                      min={0}
                      value={scoring.bonus_points}
                      onChange={(e) => setScoring({ ...scoring, bonus_points: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Time Limit (seconds, 0 = none)</label>
                    <input
                      type="number"
                      min={0}
                      value={settings.time_limit_sec}
                      onChange={(e) => setSettings({ ...settings, time_limit_sec: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Attempts</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.max_attempts}
                      onChange={(e) => setSettings({ ...settings, max_attempts: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold text-slate-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoring.time_based_scoring}
                      onChange={(e) => setScoring({ ...scoring, time_based_scoring: e.target.checked })}
                    />
                    <span>Time-based bonus</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoring.difficulty_based_scoring}
                      onChange={(e) => setScoring({ ...scoring, difficulty_based_scoring: e.target.checked })}
                    />
                    <span>Difficulty-based multiplier</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoring.negative_marking}
                      onChange={(e) => setScoring({ ...scoring, negative_marking: e.target.checked })}
                    />
                    <span>Negative marking (-{scoring.negative_points} pts)</span>
                  </label>
                </div>
              </div>

              {/* Competition Format (when Competition mode) */}
              {mode === 'competition' && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">Competition Format</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'individual', label: 'Individual Competition' },
                      { id: 'team', label: 'Team Competition' },
                      { id: 'live_quiz', label: 'Live Quiz Competition' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setCompetitionFormat(fmt.id as CompetitionFormat);
                          if (fmt.id === 'live_quiz') setCreateLiveQuiz(true);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                          competitionFormat === fmt.id
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-slate-700 border-amber-200'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.public_leaderboard}
                      onChange={(e) => setSettings({ ...settings, public_leaderboard: e.target.checked })}
                    />
                    <span>Show public leaderboard to participants</span>
                  </label>
                </div>
              )}

              {/* Classroom Assignment */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Assign to Classrooms</h3>
                {classrooms.length === 0 ? (
                  <p className="text-xs text-slate-400">No classrooms found. Save as draft or create a classroom first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {classrooms.map((cls) => {
                      const checked = selectedClassroomIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                            checked ? 'bg-sky-50 border-[#026fc3] text-[#026fc3]' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedClassroomIds((prev) =>
                                e.target.checked ? [...prev, cls.id] : prev.filter((id) => id !== cls.id)
                              )
                            }
                          />
                          <span className="truncate">{cls.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date / Deadline (Optional)</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-700 cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAndPublish(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAndPublish(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Publish & Assign</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
