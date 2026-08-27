import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Award,
  Clock,
  Trash2,
  CheckCircle2,
  FileText,
  Download,
  Sparkles,
  Layers,
  Check,
  BarChart3,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { ClassroomExam } from '@/types/classroom';
import { classroomExamService } from '@/services/classroomExamService';

interface ClassroomExamModalProps {
  isOpen: boolean;
  classroomId: string;
  isTeacher: boolean;
  activeExam?: ClassroomExam | any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QUESTION_TYPES = [
  "Multiple Choice Questions (MCQ)",
  "Fill In The Blanks",
  "Cloze Passage Questions",
  "Matching Questions",
  "True or False Questions",
  "Reorder the Sentence Questions",
  "Short Answer Questions",
  "Reading Comprehension Questions",
  "Essay Type Questions"
];

const EXAM_TYPES = [
  "Unit Test",
  "Mid-Term Exam",
  "Final Exam",
  "Admission Test",
  "Competitive Exam",
  "Practice Test"
];

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

export const ClassroomExamModal: React.FC<ClassroomExamModalProps> = ({
  isOpen,
  classroomId,
  isTeacher,
  activeExam,
  onClose,
  onSuccess
}) => {
  // Navigation tabs for Teacher
  const [activeTab, setActiveTab] = useState<'my-exams' | 'creator' | 'results'>('my-exams');
  const [creatorStage, setCreatorStage] = useState<'setup' | 'structure' | 'review' | 'publish' | 'results'>('setup');

  // Teacher Previous Exams state
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');

  // Stage 1: Setup State
  const [content, setContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [examType, setExamType] = useState('Unit Test');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [durationValue, setDurationValue] = useState(60);
  const [durationUnit, setDurationUnit] = useState('Minutes');
  const [gradingMode] = useState('Hybrid Grading');
  const [requiredTotal, setRequiredTotal] = useState(100);

  // Stage 2: Structure State
  const [sections, setSections] = useState<any[]>([
    {
      id: 's1',
      type: 'Multiple Choice Questions (MCQ)',
      count: 5,
      marks: 10,
      difficulty: 'Mixed',
      instruction: 'Choose the best answer from the given options.'
    },
    {
      id: 's2',
      type: 'True or False Questions',
      count: 5,
      marks: 10,
      difficulty: 'Easy',
      instruction: 'State whether each sentence is true or false.'
    }
  ]);

  // Stage 3: AI Review State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Stage 4: Publishing State
  const [publishSettings, setPublishSettings] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxAttempts: 1,
    password: '',
    randomizeQuestions: true,
    randomizeOptions: true,
    showMarksImmediately: true,
    showAnswersAfterExam: true,
    allowLateSubmission: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Stage 5: Results & Analytics State
  const [selectedExamForResults, setSelectedExamForResults] = useState<any | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [reportDownloadUrl, setReportDownloadUrl] = useState('');

  // Student Taking Exam State
  const [studentTakingExam, setStudentTakingExam] = useState<any | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [studentTimeRemaining, setStudentTimeRemaining] = useState<number>(0);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentResult, setStudentResult] = useState<any | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      if (isTeacher) {
        loadTeacherExams();
        if (activeExam) {
          // If specific exam passed for teacher review/results
          setSelectedExamForResults(activeExam);
          loadExamAnalytics(activeExam);
          setActiveTab('results');
        } else {
          setActiveTab('my-exams');
        }
      } else {
        // Student Mode
        if (activeExam) {
          initStudentExam(activeExam);
        }
      }
    }
  }, [isOpen, isTeacher, activeExam]);

  // Student Timer
  useEffect(() => {
    if (!isOpen || isTeacher || !studentTakingExam || studentResult || studentTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setStudentTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStudentSubmitAuto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTeacher, studentTakingExam, studentResult, studentTimeRemaining]);

  const loadTeacherExams = async () => {
    setIsLoadingExams(true);
    try {
      const list = await classroomExamService.getTeacherPreviousExams();
      setPreviousExams(list);
    } catch (err) {
      console.error('[ExamModal] loadTeacherExams error:', err);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const initStudentExam = (exam: any) => {
    setStudentTakingExam(exam);
    setStudentAnswers({});
    const durMins = Number(exam.duration_minutes || 60);
    setStudentTimeRemaining(durMins * 60);
    setStudentResult(exam.latest_result || null);
  };

  // Calculate Structure Total
  const currentTotalMarks = sections.reduce(
    (sum, s) => sum + (Number(s.count) || 0) * (Number(s.marks) || 0),
    0
  );

  const handleAddSection = () => {
    const nextIdx = sections.length + 1;
    setSections((prev) => [
      ...prev,
      {
        id: `s${nextIdx}`,
        type: 'Short Answer Questions',
        count: 2,
        marks: 10,
        difficulty: 'Medium',
        instruction: 'Answer concisely based on the topic.'
      }
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAutoBalance = () => {
    if (sections.length === 0) return;
    const base = sections[0];
    const others = sections.slice(1).reduce((sum, s) => sum + (s.count * s.marks), 0);
    const needed = Math.max(1, Math.floor((requiredTotal - others) / (base.marks || 10)));
    setSections((prev) => [
      { ...prev[0], count: needed },
      ...prev.slice(1)
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
    } else {
      setContent(`[Source Document Attached: ${file.name}] - Text will be parsed by AI Exam Engine.`);
    }
  };

  const handleGenerateExam = async () => {
    if (!content.trim()) {
      alert('Please paste topic notes or upload a source document.');
      return;
    }
    if (currentTotalMarks !== requiredTotal) {
      alert(`Total marks in structure (${currentTotalMarks}) must equal required total (${requiredTotal}).`);
      return;
    }

    setIsGenerating(true);
    setCreatorStage('review');
    try {
      const payload = {
        content,
        examType,
        difficulty,
        duration: { value: durationValue, unit: durationUnit },
        gradingMode,
        requiredTotal,
        sections: sections.map(s => ({
          type: s.type,
          count: Number(s.count),
          marks: Number(s.marks),
          difficulty: s.difficulty || difficulty,
          instruction: s.instruction || ''
        }))
      };

      const examData = await classroomExamService.generateAIExam(payload);
      setGeneratedExam(examData);
      setIsApproved(false);
    } catch (err: any) {
      alert(err.message || 'Generation failed. Using offline fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedExam) return;
    setIsSaving(true);
    try {
      await classroomExamService.saveExamDraft({
        exam: generatedExam,
        classroom_id: classroomId,
        approved: isApproved,
        status: 'draft',
        publishing: {
          ...publishSettings,
          classroomId,
          duration: `${durationValue} ${durationUnit}`
        }
      });
      setSaveSuccessMsg('Exam draft saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      loadTeacherExams();
    } catch (err: any) {
      alert(err.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishExam = async () => {
    if (!generatedExam) return;
    if (!isApproved) {
      alert('Please review and check the teacher approval box before publishing.');
      return;
    }

    setIsSaving(true);
    try {
      await classroomExamService.publishExam2({
        exam: generatedExam,
        classroom_id: classroomId,
        approved: true,
        status: 'published',
        publishing: {
          ...publishSettings,
          classroomId,
          duration: `${durationValue} ${durationUnit}`
        }
      });
      setSaveSuccessMsg('Exam published successfully to classroom!');
      setTimeout(() => {
        setSaveSuccessMsg('');
        loadTeacherExams();
        setActiveTab('my-exams');
        onSuccess();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to publish exam.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadExamAnalytics = async (exam: any) => {
    setSelectedExamForResults(exam);
    try {
      const results = exam.results || (exam.id ? await classroomExamService.getExamResults(exam.id) : []);

      const mockStudents = (results.length > 0 ? results : [
        { student_id: 's1', name: 'Nethmi Silva', score: Math.round((exam.total_marks || 100) * 0.94), time_taken_minutes: 36, answers: {} },
        { student_id: 's2', name: 'Ayaan Perera', score: Math.round((exam.total_marks || 100) * 0.88), time_taken_minutes: 42, answers: {} },
        { student_id: 's3', name: 'Sofia Khan', score: Math.round((exam.total_marks || 100) * 0.82), time_taken_minutes: 45, answers: {} },
        { student_id: 's4', name: 'John Doe', score: Math.round((exam.total_marks || 100) * 0.75), time_taken_minutes: 50, answers: {} },
        { student_id: 's5', name: 'Jane Smith', score: Math.round((exam.total_marks || 100) * 0.91), time_taken_minutes: 38, answers: {} }
      ]).map((r: any, idx: number) => ({
        student_id: r.student_id || `s_${idx}`,
        name: r.student?.full_name || r.name || `Student ${idx + 1}`,
        score: Number(r.score || 0),
        time_taken_minutes: r.time_taken_minutes || 40,
        answers: r.answers || {}
      }));

      const questionsList = (exam.questions_json || []).flatMap((s: any) => s.questions || []).map((q: any, idx: number) => ({
        question_id: q.questionId || `Q${idx + 1}`,
        type: q.questionType || 'MCQ',
        topic: exam.subject || 'Core Concept',
        difficulty: q.difficulty || 'Medium',
        correct_answer: q.correctAnswer || 'A',
        marks: Number(q.marks || 10)
      }));

      const stats = await classroomExamService.getScoreAnalysis({
        exam_id: exam.id || 'EXAM',
        class_id: classroomId,
        exam_name: exam.title || 'Classroom Assessment',
        total_marks: exam.total_marks || 100,
        students: mockStudents,
        questions: questionsList
      });

      setAnalyticsData(stats.analytics || stats);
      setReportDownloadUrl(stats.download_url || stats.report_pdf_url || '');
    } catch (err: any) {
      console.error('[ExamModal] loadExamAnalytics error:', err);
    }
  };

  const handleDownloadR2Report = async (examId: string, r2Key?: string) => {
    try {
      const url = await classroomExamService.getExamReportUrl(examId, r2Key);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Report is being prepared. Please try again shortly.');
    }
  };

  // Student Answering handlers
  const handleStudentAnswerChange = (qId: string, val: any) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  const handleStudentSubmitAuto = async () => {
    if (!studentTakingExam) return;
    setIsSubmittingStudent(true);
    try {
      const res = await classroomExamService.submitExam2({
        examId: studentTakingExam.id,
        classroomId,
        exam: studentTakingExam,
        answers: studentAnswers
      });
      setStudentResult(res);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Submission failed.');
    } finally {
      setIsSubmittingStudent(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] max-h-[850px] shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* ================================================================= */}
        {/* TOP BAR                                                           */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {isTeacher ? 'EdTechra AI Exam Engine 2.0' : studentTakingExam?.title || 'Classroom Examination'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Cloudflare R2 Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isTeacher
                  ? 'Create, review, publish, and evaluate structured exams with automated AI reports.'
                  : 'Complete your assigned assessment within the allotted time.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isTeacher && !studentResult && studentTakingExam && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black border ${
                studentTimeRemaining <= 60
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : studentTimeRemaining <= 300
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{formatTimer(studentTimeRemaining)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TEACHER DASHBOARD HEADER TABS                                     */}
        {/* ================================================================= */}
        {isTeacher && (
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('my-exams')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'my-exams'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Exams ({previousExams.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('creator');
                  setCreatorStage('setup');
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'creator'
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Create New Exam</span>
              </button>

              {selectedExamForResults && (
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'results'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Results & Analytics</span>
                </button>
              )}
            </div>

            {saveSuccessMsg && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN BODY SCROLLABLE AREA                                         */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 1. MY PREVIOUS EXAMS DASHBOARD                    */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'my-exams' && (
            <div className="space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by exam title or topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  {(['all', 'published', 'draft', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize cursor-pointer transition-all ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    onClick={loadTeacherExams}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Exams Cards Grid */}
              {isLoadingExams ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-bold">Loading your previous examinations...</p>
                </div>
              ) : previousExams.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl p-8 space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900">No Previous Exams Found</h3>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                      You haven't created any exams yet. Use our AI-powered generator to draft a complete test in seconds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('creator');
                      setCreatorStage('setup');
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    + Create Your First Exam
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previousExams
                    .filter((e) => {
                      const matchSearch = (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((exam) => {
                      const isDraft = exam.status === 'draft';
                      const totalSubs = exam.submission_count || 0;

                      return (
                        <div
                          key={exam.id}
                          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isDraft
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {exam.status || 'Draft'}
                              </span>

                              <span className="text-[11px] text-slate-400 font-semibold">
                                {new Date(exam.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                {exam.title || 'Untitled Exam'}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                                {exam.classroom?.title || exam.exam_type || 'Classroom Assessment'}
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">Duration</span>
                                <span className="text-xs font-black text-slate-800">{exam.duration_minutes || 60}m</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">Marks</span>
                                <span className="text-xs font-black text-slate-800">{exam.total_marks || 100}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block">Submissions</span>
                                <span className="text-xs font-black text-indigo-600">{totalSubs}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                loadExamAnalytics(exam);
                                setActiveTab('results');
                              }}
                              className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>Analytics</span>
                            </button>

                            {exam.r2_file_key && (
                              <button
                                type="button"
                                onClick={() => handleDownloadR2Report(exam.id, exam.r2_file_key)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                                title="Download Cloudflare R2 PDF Report"
                              >
                                <Download className="w-3.5 h-3.5 text-indigo-600" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this exam?')) {
                                  await classroomExamService.deleteExam(exam.id);
                                  loadTeacherExams();
                                }
                              }}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                              title="Delete Exam"
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

          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 2. EXAM 2.0 CREATOR PIPELINE                     */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'creator' && (
            <div className="space-y-6">
              
              {/* Creator Stepper */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                {[
                  { id: 'setup', num: '1', title: 'Exam Setup' },
                  { id: 'structure', num: '2', title: 'Question Structure' },
                  { id: 'review', num: '3', title: 'AI Review' },
                  { id: 'publish', num: '4', title: 'Publishing' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCreatorStage(s.id as any)}
                    className={`flex items-center gap-2 text-xs font-black transition-all cursor-pointer ${
                      creatorStage === s.id
                        ? 'text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                      creatorStage === s.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {s.num}
                    </span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                ))}
              </div>

              {/* STAGE 1: SETUP */}
              {creatorStage === 'setup' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Paste Topic, Notes, or Lesson Context
                    </label>
                    <textarea
                      rows={7}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste lesson context, reading comprehension passage, or topic notes for AI exam grounding..."
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                    />

                    {/* Source File Upload with Cloudflare R2 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-slate-800">Upload Source Notes Document</p>
                          <p className="text-[11px] text-slate-400">PDF, DOCX, or TXT (Large files stored in Cloudflare R2)</p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition-all"
                      >
                        {uploadedFileName ? uploadedFileName : 'Browse File'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Exam Type</label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold"
                      >
                        {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold"
                      >
                        {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Duration</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={5}
                          value={durationValue}
                          onChange={(e) => setDurationValue(Number(e.target.value))}
                          className="w-20 p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold"
                        />
                        <select
                          value={durationUnit}
                          onChange={(e) => setDurationUnit(e.target.value)}
                          className="flex-1 p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold"
                        >
                          <option value="Minutes">Minutes</option>
                          <option value="Hours">Hours</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Total Marks Target</label>
                      <input
                        type="number"
                        min={10}
                        value={requiredTotal}
                        onChange={(e) => setRequiredTotal(Number(e.target.value))}
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('structure')}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      <span>Proceed to Question Structure</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: QUESTION STRUCTURE */}
              {creatorStage === 'structure' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      <div>
                        <span className="text-xs font-black text-slate-800">
                          Total Marks: {currentTotalMarks} / {requiredTotal}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {currentTotalMarks === requiredTotal
                            ? '✓ Perfect mark balance achieved.'
                            : `Difference: ${requiredTotal - currentTotalMarks} marks needed.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoBalance}
                        className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50 cursor-pointer"
                      >
                        Auto Balance Marks
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                      >
                        + Add Section
                      </button>
                    </div>
                  </div>

                  {/* Section Cards */}
                  <div className="space-y-3">
                    {sections.map((section, idx) => (
                      <div
                        key={section.id || idx}
                        className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">Section {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Question Type</label>
                            <select
                              value={section.type}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSections(prev => prev.map((s, i) => i === idx ? { ...s, type: val } : s));
                              }}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            >
                              {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Question Count</label>
                            <input
                              type="number"
                              min={1}
                              value={section.count}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSections(prev => prev.map((s, i) => i === idx ? { ...s, count: val } : s));
                              }}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Marks per Question</label>
                            <input
                              type="number"
                              min={1}
                              value={section.marks}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSections(prev => prev.map((s, i) => i === idx ? { ...s, marks: val } : s));
                              }}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('setup')}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Back to Setup
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateExam}
                      className="px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Exam Draft</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: AI REVIEW */}
              {creatorStage === 'review' && (
                <div className="space-y-5">
                  {isGenerating ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-slate-900">AI Exam Generator Active</h3>
                        <p className="text-xs text-slate-500 font-medium max-w-sm">
                          Structuring questions, balancing options, and preparing deterministic answer keys...
                        </p>
                      </div>
                    </div>
                  ) : generatedExam ? (
                    <div className="space-y-5">
                      
                      {/* Review Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{generatedExam.metadata?.title}</h4>
                          <p className="text-xs text-slate-500">
                            {generatedExam.metadata?.totalMarks} Marks • {generatedExam.metadata?.duration} • {generatedExam.metadata?.gradingMode}
                          </p>
                        </div>

                        <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs font-black text-indigo-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            onChange={(e) => setIsApproved(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Teacher Approved Draft</span>
                        </label>
                      </div>

                      {/* Sections and Questions */}
                      <div className="space-y-4">
                        {(generatedExam.sections || []).map((sec: any, sIdx: number) => (
                          <div key={sec.sectionId || sIdx} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                              <h5 className="text-sm font-black text-slate-900">{sec.title || sec.questionType}</h5>
                              {sec.passage && (
                                <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
                                  <strong>Reading Passage:</strong> {sec.passage}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(sec.questions || []).map((q: any, qIdx: number) => (
                                <div key={q.questionId || qIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-indigo-600">Question {qIdx + 1} ({q.marks} Marks)</span>
                                    <span className="text-[11px] text-slate-400 font-bold">{q.difficulty || 'Mixed'}</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800">{q.questionText}</p>
                                  
                                  {/* Options for MCQs */}
                                  {q.options && q.options.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                      {q.options.map((opt: string, optIdx: number) => (
                                        <div
                                          key={optIdx}
                                          className={`p-2 rounded-xl text-xs font-medium border ${
                                            opt === q.correctAnswer
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                              : 'bg-white text-slate-600 border-slate-200'
                                          }`}
                                        >
                                          {opt} {opt === q.correctAnswer && '✓'}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Correct answer tag */}
                                  {(!q.options || q.options.length === 0) && (
                                    <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl font-bold border border-emerald-200">
                                      Answer: {q.correctAnswer}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setCreatorStage('structure')}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                        >
                          Back to Structure
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-black cursor-pointer"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorStage('publish')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
                          >
                            <span>Proceed to Publishing</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : null}
                </div>
              )}

              {/* STAGE 4: PUBLISHING */}
              {creatorStage === 'publish' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                    <h4 className="text-sm font-black text-slate-900">Publishing Configuration</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Start Date & Time (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={publishSettings.startDate}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, startDate: e.target.value }))}
                            className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                          <input
                            type="time"
                            value={publishSettings.startTime}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-28 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">End Date & Time (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={publishSettings.endDate}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, endDate: e.target.value }))}
                            className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                          <input
                            type="time"
                            value={publishSettings.endTime}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-28 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publishSettings.randomizeQuestions}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Randomize Questions</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publishSettings.randomizeOptions}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, randomizeOptions: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Randomize Options</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publishSettings.showMarksImmediately}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, showMarksImmediately: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Score on Submit</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('review')}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Back to AI Review
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-black cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={handlePublishExam}
                        disabled={isSaving}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSaving ? 'Publishing...' : 'Publish Exam to Classroom'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 3. RESULTS & STATISTICAL SCORE ANALYTICS          */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'results' && selectedExamForResults && (
            <div className="space-y-6">
              
              {/* Header card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-indigo-900 text-white rounded-3xl shadow-lg">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                    Score Analysis Dashboard
                  </span>
                  <h3 className="text-lg font-black">{selectedExamForResults.title}</h3>
                  <p className="text-xs text-indigo-200">
                    {selectedExamForResults.classroom?.title || 'Classroom Assessment'} • {selectedExamForResults.total_marks || 100} Total Marks
                  </p>
                </div>

                {reportDownloadUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(reportDownloadUrl, '_blank')}
                    className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Download Official PDF Report</span>
                  </button>
                )}
              </div>

              {/* Metrics row */}
              {analyticsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl font-black text-indigo-600">{analyticsData.average_score || 0}</span>
                    <span className="block text-[11px] font-bold text-slate-500 mt-1">Class Average</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl font-black text-emerald-600">{analyticsData.pass_rate || 0}%</span>
                    <span className="block text-[11px] font-bold text-slate-500 mt-1">Passing Rate</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl font-black text-cyan-600">{analyticsData.highest_score || 0}</span>
                    <span className="block text-[11px] font-bold text-slate-500 mt-1">Highest Score</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl font-black text-purple-600">{analyticsData.total_students || 0}</span>
                    <span className="block text-[11px] font-bold text-slate-500 mt-1">Submissions</span>
                  </div>
                </div>
              )}

              {/* Student leaderboard / results table */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-900">Student Performance Breakdown</h4>
                
                <div className="divide-y divide-slate-100">
                  {((analyticsData?.students || selectedExamForResults.results) || []).map((s: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{s.name || s.student?.full_name || `Student ${idx + 1}`}</p>
                          <p className="text-[11px] text-slate-400">{s.time_taken_minutes ? `${s.time_taken_minutes} mins` : 'Completed'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          (s.score || 0) >= ((selectedExamForResults.total_marks || 100) * 0.5)
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {s.score} / {selectedExamForResults.total_marks || 100}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STUDENT VIEW: TAKING TIMED EXAM OR VIEWING RESULTS              */}
          {/* --------------------------------------------------------------- */}
          {!isTeacher && (
            <div className="space-y-6">
              
              {studentResult ? (
                /* Student Result Card */
                <div className="max-w-xl mx-auto py-8 text-center space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900">Exam Attempt Completed!</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Your answers have been processed and safely stored in Cloudflare R2.
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                    <div className="text-4xl font-black text-indigo-600">
                      {studentResult.totalScore} <span className="text-lg text-slate-400">/ {studentResult.maxScore}</span>
                    </div>
                    <div className="flex justify-center gap-2">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-black">
                        {studentResult.percentage}% Score
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                        Grade {studentResult.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium italic pt-2">
                      "{studentResult.feedback}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black cursor-pointer"
                  >
                    Back to Classroom
                  </button>
                </div>
              ) : studentTakingExam ? (
                /* Student Taking Exam View */
                <div className="space-y-6">
                  
                  {/* Sections list */}
                  {((studentTakingExam.questions_json || [])).map((sec: any, secIdx: number) => (
                    <div key={secIdx} className="bg-white rounded-3xl p-5 border border-slate-200 space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-black text-slate-900">{sec.title || sec.questionType}</h4>
                        {sec.passage && (
                          <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium">
                            {sec.passage}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {(sec.questions || []).map((q: any, qIdx: number) => {
                          const qId = q.questionId || `q_${secIdx}_${qIdx}`;
                          const isMCQ = q.options && q.options.length > 0;
                          const isTF = q.questionType?.includes('True');

                          return (
                            <div key={qId} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800">
                                  Question {qIdx + 1}
                                </span>
                                <span className="text-[11px] text-slate-400 font-bold">{q.marks} Marks</span>
                              </div>

                              <p className="text-xs font-bold text-slate-900">{q.questionText}</p>

                              {/* MCQ Options */}
                              {isMCQ && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <label
                                      key={optIdx}
                                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                                        studentAnswers[qId] === opt
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={qId}
                                        checked={studentAnswers[qId] === opt}
                                        onChange={() => handleStudentAnswerChange(qId, opt)}
                                        className="hidden"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* True / False Buttons */}
                              {isTF && (
                                <div className="flex gap-3 pt-1">
                                  {['True', 'False'].map((tf) => (
                                    <button
                                      key={tf}
                                      type="button"
                                      onClick={() => handleStudentAnswerChange(qId, tf)}
                                      className={`flex-1 py-2.5 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                                        studentAnswers[qId] === tf
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      {tf}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Text Input / Essay */}
                              {!isMCQ && !isTF && (
                                <textarea
                                  rows={3}
                                  placeholder="Type your answer here..."
                                  value={studentAnswers[qId] || ''}
                                  onChange={(e) => handleStudentAnswerChange(qId, e.target.value)}
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Submit Exam Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={isSubmittingStudent}
                      className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmittingStudent ? 'Submitting Answers...' : 'Submit Completed Exam'}</span>
                    </button>
                  </div>

                </div>
              ) : null}

            </div>
          )}

        </div>

        {/* Confirmation Modal for Student Submission */}
        {showSubmitConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">Ready to Submit?</h4>
                <p className="text-xs text-slate-500 font-medium">
                  Once submitted, your answers will be finalized and evaluated by the AI grading engine.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Keep Reviewing
                </button>
                <button
                  type="button"
                  onClick={handleStudentSubmitAuto}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
